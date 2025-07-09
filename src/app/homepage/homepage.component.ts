import { Component, inject, HostListener, signal, computed  } from '@angular/core';
import {RouterOutlet, Router, RouterLink } from '@angular/router';
import { AuthService, GoogleUser } from '../auth.service';
import { CommonModule } from '@angular/common';


interface NavigationItem {
  label: string;
  route: string;
  icon?: string;
  visible: boolean;
  requiresAuth?: boolean;
  roles?: string[];
}

@Component({
  selector: 'app-homepage',
  imports: [  RouterLink, CommonModule, RouterOutlet],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css'
})
export class HomepageComponent {
  loggedInUser = signal<GoogleUser | null>(null);
  showDropdown = signal(false);
  isMobileMenuOpen = signal(false);
  userId:any;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Subscribe to user changes
    this.authService.user$.subscribe(user => {
      this.loggedInUser.set(user);
      this.userId = user?.id;
    });
  }

  toggleDropdown() {
    this.showDropdown.update(show => !show);
  }

  closeDropdown() {
    this.showDropdown.set(false);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(open => !open);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  getUserInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  canReview() {
    return this.authService.canReview();
  }

  logout() {
    this.authService.signOut();
    this.closeDropdown();
  }
}
