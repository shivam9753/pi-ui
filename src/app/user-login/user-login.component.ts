import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, GoogleUser } from '../services/auth.service';

@Component({
  selector: 'app-user-login',
  imports: [CommonModule],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css'
})
export class UserLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  isLoggedIn = false;
  currentUser: GoogleUser | null = null;
  private subscriptions: Subscription[] = [];
  showGoogleSignIn = false;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for returnUrl from query params and store in localStorage
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl'] && typeof localStorage !== 'undefined') {
        localStorage.setItem('returnUrl', params['returnUrl']);
      }
    });

    this.subscriptions.push(
      this.authService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
        if (isLoggedIn) {
          this.currentUser = this.authService.getCurrentUser();
          // Redirect if already logged in - navigateAfterLogin will handle returnUrl
          // Don't manually redirect here as AuthService handles it
        }
      })
    );

    this.subscriptions.push(
      this.authService.user$.subscribe(user => {
        this.currentUser = user;
        this.isLoading = false; // Stop loading when user state updates
      })
    );
  }

  ngAfterViewInit(): void {
    // Remove automatic popup trigger to avoid unwanted popups
    // The popup will only trigger when user clicks the button
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // This method will trigger the popup window
  signInWithGoogle(): void {
    this.isLoading = true;
    try {
      // Use the popup method instead of prompt
      this.authService.signInWithPopup();
    } catch (error) {
      console.error('Error triggering Google sign-in:', error);
      this.isLoading = false;
    }
  }

  // Alternative method if you want to use the prompt/overlay instead
  signInWithPrompt(): void {
    this.isLoading = true;
    try {
      this.authService.signIn();
    } catch (error) {
      console.error('Error triggering Google sign-in prompt:', error);
      this.isLoading = false;
    }
  }

  signOut(): void {
    this.authService.signOut();
  }

  goToDashboard(): void {
    this.router.navigate(['/explore']);
  }

  skipToExplore() {
    this.router.navigate(['/explore']);
  }
}