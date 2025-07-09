import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

declare var google: any;

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  role?: 'user' | 'reviewer' | 'admin';
}
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<GoogleUser | null>(null);
  
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router, private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeGoogleAuth();
      this.checkExistingSession();
    }
  }

  private async initializeGoogleAuth(): Promise<void> {
    try {
      // Load Google Identity Services
      await this.loadGoogleScript();
      
      // Initialize Google Identity Services
      google.accounts.id.initialize({
        client_id: "33368155298-o647b4i36rnjfrps98f5jj11rrn220bv.apps.googleusercontent.com",
        callback: (response: any) => this.handleCredentialResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  private handleCredentialResponse(response: any): void {
    try {
      const payload = this.decodeJWT(response.credential);
  
      const baseUser: GoogleUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name
      };
  
      // Save token early
      localStorage.setItem('google_token', response.credential);
  
      // Call backend to get full user (with role)
      this.registerGoogleUserIfFirstTime(baseUser).subscribe({
        next: (res) => {
          const fullUser: GoogleUser = {
            ...baseUser,
            id: res.user?._id || baseUser.id,
            role: res.user?.role || 'user'
          };
          localStorage.setItem('user', JSON.stringify(fullUser));

  
          // Save complete user object
          localStorage.setItem('google_user', JSON.stringify(fullUser));
          this.userSubject.next(fullUser);
          this.isLoggedInSubject.next(true);
  
          this.navigateAfterLogin();
        },
        error: (err) => {
          console.error('Error registering Google user:', err);
          this.navigateAfterLogin(); // fallback even if backend fails
        }
      });
    } catch (error) {
      console.error('Error handling credential response:', error);
    }
  }
  
  

  private registerGoogleUserIfFirstTime(user: GoogleUser): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/users/auth/google-user`, {
      email: user.email,
      name: user.name
    });
  }
  

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  public signIn(): void {
    if (isPlatformBrowser(this.platformId)) {
      google.accounts.id.prompt();
    }
  }

  public signInWithPopup(): void {
    if (isPlatformBrowser(this.platformId)) {
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );
    }
  }

  public signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      google.accounts.id.disableAutoSelect();
      localStorage.removeItem('google_user');
      localStorage.removeItem('google_token');
      
      this.userSubject.next(null);
      this.isLoggedInSubject.next(false);
      this.router.navigate(['/login']);
      console.log('User signed out');
    }
  }

  private checkExistingSession(): void {
    const storedUser = localStorage.getItem('google_user');
    const storedToken = localStorage.getItem('google_token');
  
    if (storedUser && storedToken) {
      try {
        const user: GoogleUser = JSON.parse(storedUser);
        this.userSubject.next(user);
        this.isLoggedInSubject.next(true);
  
        if (this.router.url === '/login' || this.router.url === '/') {
          this.navigateAfterLogin();
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.signOut();
      }
    }
  }
  

  private navigateAfterLogin(): void {
    // Navigate to homepage or dashboard after successful login
    this.router.navigate(['/explore']);
  }

  public getCurrentUser(): GoogleUser | null {
    return this.userSubject.value;
  }

  public getToken(): string | null {
    return localStorage.getItem('google_token');
  }

  public isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }

  hasRole(roles: string[]) {
    const user = this.getCurrentUser(); // Your existing method
    return user && user.role && roles.includes(user.role);
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isReviewer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'reviewer' || user?.role === 'admin';
  }

  canReview() {
    return this.hasRole(['reviewer', 'admin']);
  }

  canAdmin() {
    return this.hasRole(['admin']);
  }

}
