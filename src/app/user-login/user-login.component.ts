import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, GoogleUser } from '../services/auth.service';
import { BackendService } from '../services/backend.service';

@Component({
  selector: 'app-user-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css'
})
export class UserLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  isLoggedIn = false;
  currentUser: GoogleUser | null = null;
  private subscriptions: Subscription[] = [];
  showGoogleSignIn = false;
  isLoading = false;
  
  // Email auth properties
  showEmailForm = true; // Always show the email form now
  isSignUp = false;
  emailLoading = false;
  loginForm: FormGroup;
  signupForm: FormGroup;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private backendService: BackendService,
    private formBuilder: FormBuilder
  ) {
    // Initialize forms
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

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
      this.isLoading = false;
    }
  }

  // Alternative method if you want to use the prompt/overlay instead
  signInWithPrompt(): void {
    this.isLoading = true;
    try {
      this.authService.signIn();
    } catch (error) {
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

  // Email authentication methods
  toggleEmailForm() {
    this.showEmailForm = !this.showEmailForm;
    this.errorMessage = '';
  }

  toggleSignUp() {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
  }

  switchToSignIn() {
    console.log('Switching to Sign In, current isSignUp:', this.isSignUp);
    this.isSignUp = false;
    this.errorMessage = '';
    console.log('After switch, isSignUp:', this.isSignUp);
  }

  switchToSignUp() {
    console.log('Switching to Sign Up, current isSignUp:', this.isSignUp);
    this.isSignUp = true;
    this.errorMessage = '';
    console.log('After switch, isSignUp:', this.isSignUp);
  }

  async loginWithEmail() {
    if (this.loginForm.valid) {
      this.emailLoading = true;
      this.errorMessage = '';

      try {
        const result = await this.backendService.loginUser(
          this.loginForm.value.email,
          this.loginForm.value.password
        ).toPromise();

        if (result?.token && result?.user) {
          // Store token and user data
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
          }
          
          // Update auth service
          this.authService.handleAuthSuccess(result.user, result.token);
          
          // Navigate after login
          this.navigateAfterLogin(result.needsProfileCompletion);
        }
      } catch (error: any) {
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      } finally {
        this.emailLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  async signUpWithEmail() {
    console.log('Sign up form submitted', this.signupForm.value);
    console.log('Form valid:', this.signupForm.valid);
    console.log('Form errors:', this.signupForm.errors);
    
    if (this.signupForm.valid) {
      this.emailLoading = true;
      this.errorMessage = '';

      try {
        console.log('Calling backend registerUser with:', this.signupForm.value);
        const result = await this.backendService.registerUser(this.signupForm.value).toPromise();
        console.log('Registration result:', result);

        if (result?.token && result?.user) {
          // Store token and user data
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
          }
          
          // Update auth service
          this.authService.handleAuthSuccess(result.user, result.token);
          
          // Navigate after signup
          this.navigateAfterLogin(result.needsProfileCompletion);
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        
        // Provide specific error messages based on the error type
        if (error.status === 400) {
          if (error.error?.message?.includes('email')) {
            this.errorMessage = 'This email is already registered. Please use a different email or try logging in.';
          } else if (error.error?.message?.includes('username')) {
            this.errorMessage = 'This username is already taken. Please choose a different username.';
          } else if (error.error?.message?.includes('validation')) {
            this.errorMessage = 'Please check your information and try again.';
          } else {
            this.errorMessage = error.error?.message || 'Invalid information provided. Please check your details.';
          }
        } else if (error.status === 422) {
          this.errorMessage = 'Please check that all fields are filled correctly.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error occurred. Please try again in a moment.';
        } else if (error.status === 0 || !error.status) {
          this.errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
      } finally {
        this.emailLoading = false;
      }
    } else {
      console.log('Form is invalid, marking fields as touched');
      console.log('Individual field errors:');
      Object.keys(this.signupForm.controls).forEach(key => {
        const control = this.signupForm.get(key);
        if (control?.errors) {
          console.log(`${key}:`, control.errors);
        }
      });
      this.markFormGroupTouched(this.signupForm);
    }
  }

  private navigateAfterLogin(needsProfileCompletion?: boolean) {
    const returnUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('returnUrl') : null;
    
    if (needsProfileCompletion) {
      this.router.navigate(['/complete-profile']);
    } else if (returnUrl) {
      localStorage.removeItem('returnUrl');
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/explore']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Helper methods for form validation
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${fieldName} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['pattern']) return `${fieldName} contains invalid characters`;
    }
    return '';
  }
}