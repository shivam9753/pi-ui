// header.component.ts
import { Component, inject, signal, OnInit, OnDestroy, HostListener, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ThemingService } from '../services/theming.service';
import { AuthService, GoogleUser } from '../services/auth.service'; // Import your AuthService
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ThemeToggleComponent } from '../utilities/theme-toggle/theme-toggle.component';
import { StringUtils } from '../shared/utils';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  themeService = inject(ThemingService);
  router = inject(Router);
  authService = inject(AuthService); // Inject AuthService
  platformId = inject(PLATFORM_ID);
  
  // Replace mock signals with actual auth-connected signals
  loggedInUser = signal<GoogleUser | null>(null);
  showDropdown = signal(false);
  isMobileMenuOpen = signal(false);
  showWhatsNewDropdown = signal(false);
  showSettingsDropdown = signal(false);
  userId = '';
  currentRoute = signal('');
  isDark = signal(false);


  // App features/updates (for header dropdown)
  appFeatures = [
    {
      title: 'Enhanced Review System',
      description: 'We\'ve upgraded our submission review process! Faster feedback and more detailed reviewer comments are now available.',
      type: 'FEATURE',
      colorClass: 'feature-color', 
      link: '/admin/submissions',
      linkText: 'Learn More',
      isNew: true
    },
    {
      title: 'Mobile App Coming Soon',
      description: 'Read and submit your favorite literary works on the go. Our mobile app will launch early next year with offline reading support.',
      type: 'UPCOMING',
      colorClass: 'upcoming-color',
      link: null,
      linkText: 'Stay Tuned',
      isNew: false
    },
    {
      title: 'Improved Search',
      description: 'Search through content more effectively with our enhanced search algorithms and filtering options.',
      type: 'FEATURE',
      colorClass: 'info-color',
      link: null,
      linkText: 'Try Now',
      isNew: true
    }
  ];
  
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    // Subscribe to authentication state
    const userSubscription = this.authService.user$.subscribe(user => {
      this.loggedInUser.set(user);
      this.userId = user?.id || '';
    });
    
    // Subscribe to theme changes
    const themeSubscription = this.themeService.isDark$.subscribe(isDark => {
      this.isDark.set(isDark);
    });
    
    // Subscribe to router events to track current route
    const routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });
    
    // Set initial route
    this.currentRoute.set(this.router.url);
    
    this.subscriptions.push(userSubscription, themeSubscription, routeSubscription);
  }

  isDesktop() {
    if (!isPlatformBrowser(this.platformId)) {
      return true; // Default to desktop for SSR
    }
    return window.innerWidth >= 1024;
  }
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Theme toggle disabled - app uses light mode only

  toggleDropdown() {
    this.showDropdown.update(value => !value);
  }

  closeDropdown() {
    this.showDropdown.set(false);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }


  getUserInitials(name: string): string {
    return StringUtils.getInitialsWithFallback(name);
  }

  getCurrentThemeName(): string {
    return this.themeService.theme() === 'dark' ? 'Dark' : 'Light';
  }

  canReview(): any {
    return this.canAccessWorkspace();
  }


  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // Check if user has elevated role (curator, reviewer, or admin)
  hasElevatedRole(): boolean {
    const user = this.loggedInUser();
    return user?.role === 'curator' || user?.role === 'reviewer' || user?.role === 'admin';
  }

  // Check if user can access Studio (users, curators, admins - NOT reviewers)
  canAccessStudio(): boolean {
    const user = this.loggedInUser();
    if (!user) return false; // Not logged in
    return user.role !== 'reviewer';
  }

  // Check if user can access Workspace (reviewers and admins - NOT curators)
  canAccessWorkspace(): boolean {
    const user = this.loggedInUser();
    return user?.role === 'reviewer' || user?.role === 'admin';
  }

  logout() {
    this.authService.signOut();
    this.closeDropdown();
  }

  handleSubmitClick() {
    // Close mobile menu if open
    this.closeMobileMenu();
    
    // Check if user is logged in using AuthService
    if (this.authService.isAuthenticated()) {
      // User is logged in, navigate to submit page
      this.router.navigate(['/submission']);
    } else {
      // User not logged in, store return URL and redirect to login
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('returnUrl', '/submission');
      }
      this.router.navigate(['/login']);
    }
  }

  isSubmitActive(): boolean {
    return this.currentRoute().startsWith('/submission');
  }

  isOnLoginPage(): boolean {
    return this.currentRoute().startsWith('/login');
  }

  // Settings dropdown methods
  toggleSettingsDropdown() {
    this.showSettingsDropdown.update(value => !value);
  }

  closeSettingsDropdown() {
    this.showSettingsDropdown.set(false);
  }

  // What's New dropdown methods
  toggleWhatsNewDropdown() {
    this.showWhatsNewDropdown.update(value => !value);
  }

  closeWhatsNewDropdown() {
    this.showWhatsNewDropdown.set(false);
  }

  // Get app features for dropdown
  getAppFeatures() {
    return this.appFeatures;
  }

  // Check if there are new app features
  hasNewAppFeatures() {
    return this.appFeatures.some(feature => feature.isNew);
  }

  // Handle app feature click
  handleAppFeatureAction(feature: any) {
    if (feature.link) {
      this.router.navigate([feature.link]);
    }
    this.closeWhatsNewDropdown();
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Close Settings dropdown if clicked outside
    if (!target.closest('[data-dropdown="settings"]')) {
      this.closeSettingsDropdown();
    }
    
    // Close What's New dropdown if clicked outside
    if (!target.closest('[data-dropdown="whats-new"]')) {
      this.closeWhatsNewDropdown();
    }
    
    // Close user dropdown if clicked outside
    if (!target.closest('[data-dropdown="user"]')) {
      this.closeDropdown();
    }
  }

  // Simple search functionality - navigate to search page
  openSearchPage() {
    this.router.navigate(['/search']);
    // Close mobile menu if open
    this.closeMobileMenu();
  }

  clearSearchAndNavigate() {
    // Force navigation to explore page without search params
    this.router.navigate(['/explore']);
  }
}