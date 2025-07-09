import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredRoles = route.data['roles'] as string[];
    
    return this.authService.user$.pipe(
      take(1),
      map((user: any) => {
        // Check if user is logged in
        if (!user || !user.role) {
          this.router.navigate(['/login']);
          return false;
        }

        // Check if user has required role
        if (requiredRoles && requiredRoles.length > 0) {
          if (requiredRoles.includes(user.role)) {
            return true;
          } else {
            // Redirect based on user role
            if (user.role === 'admin') {
              this.router.navigate(['/admin']);
            } else if (user.role === 'reviewer') {
              this.router.navigate(['/review']);
            } else {
              this.router.navigate(['/explore']);
            }
            return false;
          }
        }

        // If no specific roles required, just check if logged in
        return true;
      })
    );
  }
}
