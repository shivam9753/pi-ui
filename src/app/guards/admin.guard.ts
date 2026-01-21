import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map((user:any)=> {
        if (!user || !user.role) {
          this.router.navigate(['/login']);
          return false;
        }
  
        if (user.role === 'admin') {
          return true;
        } else {
          this.router.navigate(['/explore']);
          return false;
        }
  
      })
    );
  }
}
