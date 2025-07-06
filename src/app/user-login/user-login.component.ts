import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, GoogleUser } from '../auth.service';

@Component({
  selector: 'app-user-login',
  imports: [CommonModule],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css'
})
export class UserLoginComponent implements OnInit, OnDestroy, AfterViewInit{
  isLoggedIn = false;
  currentUser: GoogleUser | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.subscriptions.push(
      this.authService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
        if (isLoggedIn) {
          this.currentUser = this.authService.getCurrentUser();
        }
      })
    );

    this.subscriptions.push(
      this.authService.user$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  ngAfterViewInit(): void {
    // Render Google's default sign-in button
    setTimeout(() => {
      this.authService.signInWithPopup();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  signInWithGoogle(): void {
    this.authService.signIn();
  }

  signOut(): void {
    this.authService.signOut();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
