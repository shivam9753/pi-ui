import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { API_ENDPOINTS } from '../shared/constants/api.constants';

declare var google: any;

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  role?: 'user' | 'writer' | 'reviewer' | 'admin';
  bio?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<GoogleUser | null>(null);
  private tokenClient: any;
  
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object, 
    private router: Router, 
    private http: HttpClient
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Check existing session immediately, before Google Auth init
      this.checkExistingSession();
      this.initializeGoogleAuth();
    }
  }

  private async initializeGoogleAuth(): Promise<void> {
    try {
      // Load Google Identity Services
      await this.loadGoogleScript();
      
      // Initialize both Identity Services and OAuth2 for popup
      google.accounts.id.initialize({
        client_id: "33368155298-o647b4i36rnjfrps98f5jj11rrn220bv.apps.googleusercontent.com",
        callback: (response: any) => this.handleCredentialResponse(response),
        auto_select: true, // Enable auto-select for returning users
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true // Use FedCM for better UX
      });

      // Initialize OAuth2 token client for popup
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '33368155298-o647b4i36rnjfrps98f5jj11rrn220bv.apps.googleusercontent.com',
        scope: 'openid email profile',
        callback: (response: any) => this.handleOAuthResponse(response),
        hint: localStorage.getItem('google_user_hint') || '', // Remember user hint
        hosted_domain: '', // Allow all domains
        include_granted_scopes: true // Include previously granted scopes
      });
    } catch (error) {
      // Google Auth initialization failed silently
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // Wait a bit for the script to fully initialize
        setTimeout(() => resolve(), 100);
      };
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
        family_name: payload.family_name,
        role: 'user' // Default role
      };
  
      // Save token immediately
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('google_token', response.credential);
      }
  
      this.processUserLogin(baseUser);
    } catch (error) {
      // Error handling credential response
    }
  }

  private handleOAuthResponse(response: any): void {
    if (response.error) {
      return;
    }

    // Get user info using the access token
    this.getUserInfoFromToken(response.access_token);
  }

  private async getUserInfoFromToken(accessToken: string): Promise<void> {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        
        const baseUser: GoogleUser = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          role: 'user'
        };

        // Save access token
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('google_access_token', accessToken);
        }

        this.processUserLogin(baseUser);
      }
    } catch (error) {
      // Error getting user info from token
    }
  }

  private processUserLogin(baseUser: GoogleUser): void {
    // Check if we already have this user in localStorage with a valid session
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('google_user');
      const storedJwt = localStorage.getItem('jwt_token');

      if (storedUser && storedJwt) {
        try {
          const existingUser: GoogleUser = JSON.parse(storedUser);

          // If it's the same user email, check if JWT is still valid
          if (existingUser.email === baseUser.email) {
            const tokenPayload = this.decodeJWT(storedJwt);
            const currentTime = Math.floor(Date.now() / 1000);

            // If JWT is still valid (not expired), use existing session
            if (tokenPayload && tokenPayload.exp && tokenPayload.exp > currentTime) {
              this.userSubject.next(existingUser);
              this.isLoggedInSubject.next(true);
              this.navigateAfterLogin();

              // Optionally refresh role in background (less frequently)
              if (Math.random() < 0.1) { // Only 10% of the time to reduce API calls
                this.refreshUserRole(existingUser);
              }
              return;
            } else {
              // JWT token is expired - clear it before re-authenticating
              this.clearSession();
            }
          }
        } catch (error) {
          // Error parsing stored user session - clear it
          this.clearSession();
        }
      }
    }

    // If no valid existing session, authenticate with backend
    this.authenticateGoogleUser(baseUser).subscribe({
      next: (res) => {
        const fullUser: GoogleUser = {
          ...baseUser,
          id: res.user?._id || res.user?.id || baseUser.id,
          role: res.user?.role || 'user',
          bio: res.user?.bio || baseUser.bio
        };
        
        // Save user and token to localStorage
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('google_user', JSON.stringify(fullUser));
          // Save the JWT token from backend response
          if (res.token) {
            localStorage.setItem('jwt_token', res.token);
          }
          // Save user hint for future OAuth attempts
          localStorage.setItem('google_user_hint', fullUser.email);
        }
        
        this.userSubject.next(fullUser);
        this.isLoggedInSubject.next(true);
        
        this.navigateAfterLogin();
      },
      error: (err) => {
        
        // Fallback: use base user even if backend fails
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('google_user', JSON.stringify(baseUser));
        }
        
        this.userSubject.next(baseUser);
        this.isLoggedInSubject.next(true);
        
        this.navigateAfterLogin();
      }
    });
  }

  private authenticateGoogleUser(user: GoogleUser): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`, {
      email: user.email,
      name: user.name,
      picture: user.picture,
      given_name: user.given_name,
      family_name: user.family_name
    });
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  // Method for prompt-based sign in (shows account chooser overlay)
  public signIn(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        google.accounts.id.prompt();
      } catch (error) {
        // Error showing Google sign-in prompt
      }
    }
  }

  // Method for popup-based sign in (opens popup window)
  public signInWithPopup(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (this.tokenClient) {
          this.tokenClient.requestAccessToken();
        }
      } catch (error) {
        // Error with Google sign-in popup
      }
    }
  }

  // Alternative popup method using the older gapi library (if you prefer)
  public signInWithGapiPopup(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject('Not in browser environment');
        return;
      }

      // This requires loading the gapi library separately
      // You can add this script tag: <script src="https://apis.google.com/js/api.js"></script>
      if (typeof (window as any).gapi !== 'undefined') {
        (window as any).gapi.load('auth2', () => {
          const authInstance = (window as any).gapi.auth2.getAuthInstance();
          if (authInstance) {
            authInstance.signIn().then((googleUser: any) => {
              const profile = googleUser.getBasicProfile();
              const baseUser: GoogleUser = {
                id: profile.getId(),
                email: profile.getEmail(),
                name: profile.getName(),
                picture: profile.getImageUrl(),
                given_name: profile.getGivenName(),
                family_name: profile.getFamilyName(),
                role: 'user'
              };
              this.processUserLogin(baseUser);
              resolve();
            }).catch(reject);
          }
        });
      } else {
        reject('GAPI not loaded');
      }
    });
  }

  private renderSignInButton(): void {
    const buttonContainer = document.getElementById('google-signin-button');
    if (buttonContainer) {
      google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      });
    }
  }

  public signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Disable Google auto-select
        google.accounts.id.disableAutoSelect();
        
        // Revoke access token if available
        const accessToken = localStorage.getItem('google_access_token');
        if (accessToken) {
          google.accounts.oauth2.revoke(accessToken);
          localStorage.removeItem('google_access_token');
        }
        
        // Clear localStorage
        localStorage.removeItem('google_user');
        localStorage.removeItem('google_token');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('returnUrl');
        localStorage.removeItem('google_user_hint');
        
        // Update state
        this.userSubject.next(null);
        this.isLoggedInSubject.next(false);
        
        // Navigate to login
        this.router.navigate(['/login']);
      } catch (error) {
        // Error during sign out
      }
    }
  }

  private checkExistingSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedUser = localStorage.getItem('google_user');
    const storedToken = localStorage.getItem('google_token');
    const storedJwtToken = localStorage.getItem('jwt_token');


    if (storedUser) {
      try {
        const user: GoogleUser = JSON.parse(storedUser);

        // If we have a JWT token from backend, check its validity
        if (storedJwtToken) {
          const tokenPayload = this.decodeJWT(storedJwtToken);
          const currentTime = Math.floor(Date.now() / 1000);

          if (tokenPayload && tokenPayload.exp && tokenPayload.exp > currentTime) {
            this.userSubject.next(user);
            this.isLoggedInSubject.next(true);

            // Refresh user role from backend to ensure it's up to date
            this.refreshUserRole(user);
            return;
          } else {
            // JWT token is expired - clear session
            this.clearSession();
            return;
          }
        }

        // If no JWT or JWT expired, but we have Google token, check it
        if (storedToken) {
          const googleTokenPayload = this.decodeJWT(storedToken);
          const currentTime = Math.floor(Date.now() / 1000);

          if (googleTokenPayload && googleTokenPayload.exp && googleTokenPayload.exp > currentTime) {
            this.userSubject.next(user);
            this.isLoggedInSubject.next(true);

            // Refresh user role from backend to ensure it's up to date
            this.refreshUserRole(user);
            return;
          } else {
            // Google token is expired - clear session
            this.clearSession();
            return;
          }
        }

        // If we have user data but no valid tokens, clear session
        this.clearSession();

      } catch (error) {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('google_user');
      localStorage.removeItem('google_token');
      localStorage.removeItem('jwt_token');
      this.userSubject.next(null);
      this.isLoggedInSubject.next(false);
    }
  }

  private navigateAfterLogin(): void {
    // Check if there's a stored return URL
    const returnUrl = isPlatformBrowser(this.platformId) 
      ? localStorage.getItem('returnUrl') 
      : null;
    
    if (returnUrl) {
      localStorage.removeItem('returnUrl');
      this.router.navigate([returnUrl]);
    } else {
      // Default navigation - no profile completion required
      this.router.navigate(['/explore']);
    }
  }

  // REMOVED: Profile completion is no longer mandatory for Google OAuth users
  // Users can complete their profile by visiting /user-profile when they want to

  // Public methods for components to use
  public getCurrentUser(): GoogleUser | null {
    return this.userSubject.value;
  }

  // Method to force session restoration (useful during development)
  public forceRestoreSession(): void {
    this.checkExistingSession();
  }

  public getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('google_token');
    }
    return null;
  }

  public isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }

  public hasRole(roles: string[]): any {
    const user = this.getCurrentUser();
    return user && user.role && roles.includes(user.role);
  }

  public isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  public isWriter(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'writer' || user?.role === 'reviewer' || user?.role === 'admin';
  }

  public isReviewer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'reviewer' || user?.role === 'admin';
  }

  public canReview(): boolean {
    return this.hasRole(['reviewer', 'admin']);
  }

  public canAccessAdmin(): boolean {
    return this.hasRole(['writer', 'reviewer', 'admin']);
  }

  public canCurate(): boolean {
    return this.hasRole(['writer', 'reviewer', 'admin']);
  }

  public canAdmin(): boolean {
    return this.hasRole(['admin']);
  }

  // Method to refresh user data from backend
  public refreshUser(): Observable<any> {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      return this.authenticateGoogleUser(currentUser);
    }
    throw new Error('No user to refresh');
  }

  // Method to refresh user role in background without disrupting user session
  private refreshUserRole(user: GoogleUser): void {
    this.authenticateGoogleUser(user).subscribe({
      next: (res) => {
        if (res.user?.role && res.user.role !== user.role) {
          // Update the user object with new role
          const updatedUser: GoogleUser = {
            ...user,
            role: res.user.role
          };
          
          // Update localStorage and subjects
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('google_user', JSON.stringify(updatedUser));
            if (res.token) {
              localStorage.setItem('jwt_token', res.token);
            }
          }
          
          this.userSubject.next(updatedUser);
        }
      },
      error: (err) => {
        // Don't disrupt the user session if role refresh fails
      }
    });
  }

  // Method to manually trigger Google sign-in (for login component)
  public triggerGoogleSignIn(): void {
    this.signInWithPopup();
  }

  // REMOVED: Profile completion is no longer mandatory
  // Users can update their profile anytime via /user-profile

  // REMOVED: Profile completion checking is no longer needed
  // All Google OAuth users are created with completed profiles by default

  // Method to handle successful email authentication
  public handleAuthSuccess(user: any, token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const fullUser: GoogleUser = {
        id: user._id || user.id,
        email: user.email,
        name: user.name,
        picture: user.profileImage || '',
        given_name: user.name.split(' ')[0] || user.name,
        family_name: user.name.split(' ').slice(1).join(' ') || '',
        role: user.role || 'user',
        bio: user.bio || ''
      };

      // Store user and token in localStorage
      localStorage.setItem('google_user', JSON.stringify(fullUser));
      localStorage.setItem('jwt_token', token);

      // Update auth state
      this.userSubject.next(fullUser);
      this.isLoggedInSubject.next(true);
    }
  }
}