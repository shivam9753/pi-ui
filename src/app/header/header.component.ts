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
import { SearchOverlayComponent } from '../ui-components/search-overlay/search-overlay.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, ThemeToggleComponent, SearchOverlayComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  themeService = inject(ThemingService);
  router = inject(Router);
  authService = inject(AuthService); // Inject AuthService
  platformId = inject(PLATFORM_ID);
  
  // Replace mock signals with actual auth-connected signals
  loggedInUser = signal<GoogleUser | null>(null);
  isAuthenticated = signal(false);
  authChecked = signal(false); // Track whether auth state has been verified
  showDropdown = signal(false);
  isMobileMenuOpen = signal(false);
  showWhatsNewDropdown = signal(false);
  showSettingsDropdown = signal(false);
  // Editorial dropdown (desktop & mobile)
  showEditorialDropdown = signal(false);
  // Mobile editorial accordion state
  showEditorialMobile = signal(false);
  userId = '';
  currentRoute = signal('');
  isDark = signal(false);
  showSearchDrawer = signal(false);




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
  
  private readonly subscriptions: Subscription[] = [];

  ngOnInit() {
    // Check current auth state immediately (synchronously)
    if (isPlatformBrowser(this.platformId)) {
      const currentUser = this.authService.getCurrentUser();
      this.loggedInUser.set(currentUser);
      this.isAuthenticated.set(!!currentUser);
      this.userId = currentUser?.id || '';
      this.authChecked.set(true);
    } else {
      // On server, mark as checked but not authenticated
      this.authChecked.set(true);
    }

    // Subscribe to authentication state for reactive updates
    const userSubscription = this.authService.user$.subscribe(user => {
      this.loggedInUser.set(user);
      this.isAuthenticated.set(!!user);
      this.userId = user?.id || '';
      this.authChecked.set(true);
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

  isBrowser() {
    return isPlatformBrowser(this.platformId);
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

  // Check if user has elevated role (writer, reviewer, or admin)
  hasElevatedRole(): boolean {
    const user = this.loggedInUser();
    return user?.role === 'writer' || user?.role === 'reviewer' || user?.role === 'admin';
  }

  // Check if user can access Studio (only admin and writer roles)
  canAccessStudio(): boolean {
    const user = this.loggedInUser();
    if (!user) return false; // Not logged in
    return user.role === 'admin' || user.role === 'writer';
  }

  // Check if user can access Workspace (reviewers and admins - NOT writers)
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

  toggleEditorialDropdown() {
    this.showEditorialDropdown.update(v => !v);
  }

  closeEditorialDropdown() {
    this.showEditorialDropdown.set(false);
  }

  toggleEditorialMobile() {
    this.showEditorialMobile.update(v => !v);
  }

  closeEditorialMobile() {
    this.showEditorialMobile.set(false);
  }

  hasEditorialItems(): boolean {
    return this.canAccessWorkspace() || this.canAccessStudio() || this.isAdmin();
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

    // Close editorial dropdown if clicked outside
    if (!target.closest('[data-dropdown="editorial"]')) {
      this.closeEditorialDropdown();
    }

    // Close mobile editorial accordion if clicked outside mobile area
    if (!target.closest('[data-mobile-editorial]')) {
      this.closeEditorialMobile();
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

  openSearchDrawer() {
    this.showSearchDrawer.update(v => !v);
  }

  openSearchWithQuery(q: string) {
    const query = q?.trim();
    if (!query) return;
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  onSearchFromOverlay(q: string) {
    this.openSearchWithQuery(q);
    this.showSearchDrawer.set(false);
  }

  // Role chip helper methods
  shouldShowRoleChip(): boolean {
    const user = this.loggedInUser();
    if (!user?.role) return false;
    return ['admin', 'reviewer', 'writer'].includes(user.role);
  }

  getRoleChipClasses(): string {
    const user = this.loggedInUser();
    if (!user) return '';

    const baseClasses = 'inline-flex items-center w-fit rounded-md py-0.5 px-2.5 border text-sm shadow-sm';

    switch (user.role) {
      case 'admin':
        return `${baseClasses} bg-purple-600 border-purple-700 text-white`;
      case 'reviewer':
        return `${baseClasses} bg-blue-600 border-blue-700 text-white`;
      case 'writer':
        return `${baseClasses} bg-green-600 border-green-700 text-white`;
      default:
        return `${baseClasses} bg-gray-600 border-gray-700 text-white`;
    }
  }

  getRoleIconPath(): string {
    const user = this.loggedInUser();
    if (!user) return 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z';

    switch (user.role) {
      case 'admin':
        // shield-check icon
        return 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z';
      case 'reviewer':
        // eye icon
        return 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';
      case 'writer':
        // pencil icon
        return 'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10';
      default:
        // user icon
        return 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z';
    }
  }
}