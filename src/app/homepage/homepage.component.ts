import { Component, inject, HostListener } from '@angular/core';
import {RouterOutlet, Router, RouterLink } from '@angular/router';
import { AuthService, GoogleUser } from '../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-homepage',
  imports: [ RouterOutlet, RouterLink, CommonModule],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css'
})
export class HomepageComponent {
  showDropdown = false;
  private router = inject(Router);
  loggedInUser: GoogleUser | null = null;
  isMobileMenuOpen = false;


  constructor(private authService: AuthService) {
    this.router.navigate(['/review']);
  }
  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if(isLoggedIn) {
        this.loggedInUser = this.authService.getCurrentUser();
      }
    })
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showDropdown = false;
    }
  }

  // Close mobile menu on escape key
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  logout() {
    this.authService.signOut();
    this.loggedInUser = null;
    this.showDropdown = false;
  }
}
