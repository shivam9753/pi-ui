import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class StudioGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map((user: any) => {
        if (!user || !user.role) {
          this.router.navigate(['/login']);
          return false;
        }
  
        // Only allow admin and writer roles to access Studio
        if (user.role === 'admin' || user.role === 'writer') {
          return true;
        } else {
          this.router.navigate(['/explore']);
          return false;
        }
      })
    );
  }
}