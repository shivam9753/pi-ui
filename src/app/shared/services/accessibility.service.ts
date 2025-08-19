import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private liveRegion: HTMLElement | null = null;
  
  constructor(private router: Router) {
    this.setupRouterFocusManagement();
    this.createLiveRegion();
  }

  /**
   * Create live region for screen reader announcements
   */
  private createLiveRegion(): void {
    if (typeof document !== 'undefined') {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-10000px';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce messages to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Focus management for page navigation
   */
  private setupRouterFocusManagement(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Only focus main content if it's a programmatic navigation
      // Don't focus on initial page load to preserve natural tab order
      if (typeof document !== 'undefined' && document.readyState === 'complete') {
        // Announce page change to screen readers without focusing
        const pageTitle = this.getPageTitle(event.url);
        this.announce(`Navigated to ${pageTitle}`);
      }
    });
  }

  /**
   * Focus the main content area
   */
  focusMainContent(): void {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const mainElement = document.getElementById('main-content');
        if (mainElement) {
          // Temporarily make it focusable, focus it, then remove tabindex
          mainElement.setAttribute('tabindex', '-1');
          mainElement.focus();
          // Remove tabindex after focus to not interfere with tab navigation
          setTimeout(() => {
            mainElement.removeAttribute('tabindex');
          }, 100);
        }
      }, 100);
    }
  }

  /**
   * Get page title from URL for announcements
   */
  private getPageTitle(url: string): string {
    const pathSegments = url.split('/').filter(segment => segment);
    
    if (pathSegments.length === 0) {
      return 'Home page';
    }
    
    const titleMap: { [key: string]: string } = {
      'explore': 'Explore page',
      'submit': 'Submit page',
      'workspace': 'Workspace page',
      'admin': 'Admin page',
      'prompts': 'Prompts page',
      'login': 'Login page',
      'user-profile': 'User profile page'
    };
    
    return titleMap[pathSegments[0]] || `${pathSegments[0]} page`;
  }

  /**
   * Manage focus for modals and dropdowns
   */
  trapFocus(containerElement: HTMLElement): void {
    if (typeof document === 'undefined') return;
    
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element
    firstElement.focus();
    
    // Handle tab key navigation
    containerElement.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      // Handle Escape key
      if (e.key === 'Escape') {
        this.focusMainContent();
      }
    });
  }

  /**
   * Announce form validation errors
   */
  announceFormErrors(errors: string[]): void {
    if (errors.length === 0) return;
    
    const message = errors.length === 1 
      ? `Form error: ${errors[0]}` 
      : `Form has ${errors.length} errors: ${errors.join(', ')}`;
    
    this.announce(message, 'assertive');
  }

  /**
   * Announce loading states
   */
  announceLoading(message: string = 'Loading'): void {
    this.announce(message, 'polite');
  }

  /**
   * Announce content updates
   */
  announceUpdate(message: string): void {
    this.announce(message, 'polite');
  }

  /**
   * Set focus to specific element by ID
   */
  focusElement(elementId: string): void {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.focus();
        }
      }, 100);
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  /**
   * Check if user is using keyboard navigation
   */
  isKeyboardUser(): boolean {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('keyboard-navigation');
    }
    return false;
  }

  /**
   * Initialize keyboard navigation detection
   */
  initKeyboardDetection(): void {
    if (typeof document !== 'undefined') {
      // Detect keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          document.body.classList.add('keyboard-navigation');
        }
      });

      // Detect mouse navigation
      document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
      });
    }
  }
}