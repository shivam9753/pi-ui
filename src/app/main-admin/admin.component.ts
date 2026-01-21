import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual admin tab components
import { ManageSubmissionsComponent } from "./content/manage-submissions/manage-submissions.component";
import { FeaturedContentComponent } from "./content/featured-content/featured-content.component";
import { UserManagementComponent } from './users/user-management/user-management.component';
import { CreateUsersComponent } from './users/create-users/create-users.component';
import { PurgeManagementComponent } from './purge/purge-management.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { TabsComponent, TabItemComponent } from '../ui-components';
import { ResponseTemplatesComponent } from './response-templates/response-templates.component';

type AdminTab = 'submissions' | 'content' | 'users' | 'purge' | 'analytics' | 'media' | 'templates';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ManageSubmissionsComponent,
    FeaturedContentComponent,
    UserManagementComponent,
    CreateUsersComponent,
    PurgeManagementComponent,
    AnalyticsComponent,
    ResponseTemplatesComponent,
    TabsComponent,
    TabItemComponent,
    // MediaManagerComponent is lazy-loaded at runtime
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, AfterViewInit {
  @ViewChild('tabNavigation') tabNavigation!: ElementRef;
  @ViewChild('mediaHost', { read: ViewContainerRef }) mediaHost!: ViewContainerRef;
  
  // Use getter/setter so we can react when the media tab becomes active
  private _activeTab: AdminTab = 'submissions';
  get activeTab(): AdminTab { return this._activeTab; }
  set activeTab(val: AdminTab) {
    this._activeTab = val;
    if (val === 'media') {
      this.loadMediaComponent();
    }
  }

  userSubTab: 'manage' | 'create' = 'manage';
  isAdmin = false;
  isReviewer = false;
  currentUser: any = null;
  loading = true;
  mediaComponent: any = null;
  private mediaComponentRef: ComponentRef<any> | null = null;

  constructor(
    private readonly authService: AuthService,
    public router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.checkAdminAccess();
    
    // Handle URL fragments for direct tab navigation
    this.route.fragment.subscribe(fragment => {
      if (fragment && ['submissions', 'content', 'users', 'purge', 'analytics', 'media', 'templates'].includes(fragment)) {
        const tab = fragment as 'submissions' | 'content' | 'users' | 'purge' | 'analytics' | 'media' | 'templates';
        // Only set tab if user has permission to access it
        if (this.canAccessTab(tab)) {
          this.activeTab = tab;
        }
      }
    });
  }

  checkAdminAccess() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = user;
    
    // Distinguish between admin, reviewer, and writer roles
    this.isAdmin = user.role === 'admin';
    this.isReviewer = user.role === 'reviewer' || user.role === 'writer';
    
    // Admins, reviewers, and writers can access this component
    if (!this.isAdmin && !this.isReviewer) {
      this.router.navigate(['/']);
      return;
    }
    
    // Default to the first tab the user can access. 'submissions' has been moved out to header,
    // so prefer 'content' for admins/reviewers when available.
    if (this.canAccessTab('content')) {
      this.activeTab = 'content';
    } else if (this.canAccessTab('users')) {
      this.activeTab = 'users';
    } else if (this.canAccessTab('analytics')) {
      this.activeTab = 'analytics';
    } else if (this.canAccessTab('purge')) {
      this.activeTab = 'purge';
    } else if (this.canAccessTab('submissions')) {
      // fallback only if nothing else is accessible
      this.activeTab = 'submissions';
    }
    this.loading = false;
  }

  ngAfterViewInit() {
    // Scroll to active tab after view is initialized
    setTimeout(() => {
      this.scrollToActiveTab();
      // Try to instantiate media component if the media tab is already active on init
      if (this.activeTab === 'media') {
        setTimeout(() => this.tryCreateMediaInstance(), 50);
      }
    }, 100);
  }

  setActiveTab(tab: 'submissions' | 'content' | 'users' | 'purge' | 'analytics' | 'media' | 'templates') {
    // Check if user has permission to access this tab
    if (!this.canAccessTab(tab)) {
      return; // Prevent access to unauthorized tabs
    }

    // If leaving media tab, destroy component instance
    if (this.activeTab === 'media' && tab !== 'media') {
      this.destroyMediaComponent();
    }

    this.activeTab = tab;
    // Reset user sub-tab when switching to users
    if (tab === 'users') {
      this.userSubTab = 'manage';
    }
    // Update URL fragment for bookmarkable tabs
    this.router.navigate([], { 
      fragment: tab,
      replaceUrl: true 
    });
    
    // Scroll to active tab
    setTimeout(() => {
      this.scrollToActiveTab();
      // After UI settles, attempt to instantiate the media component
      setTimeout(() => this.tryCreateMediaInstance(), 100);
    }, 50);
  }

  setUserSubTab(subTab: 'manage' | 'create') {
    this.userSubTab = subTab;
  }

  private scrollToActiveTab() {
    if (this.tabNavigation) {
      const activeButton = this.tabNavigation.nativeElement.querySelector(`button[data-tab="${this.activeTab}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }

  // Check if current user can access a specific tab
  canAccessTab(tab: string): boolean {
    if (this.isAdmin) {
      return true; // Admins can access all admin tabs
    }
    
    if (this.isReviewer) {
      // Reviewers and writers can access submissions, content management, and analytics
      return tab === 'submissions' || tab === 'content' || tab === 'analytics';
    }
    
    return false;
  }

  private async loadMediaComponent() {
    if (this.mediaComponent) return;
    try {
      console.log('Admin: loading media component dynamically...');
      const mod = await import('./media-manager/media-manager.component');
      console.log('Admin: media module imported', mod);
      this.mediaComponent = mod.MediaManagerComponent;
      console.log('Admin: mediaComponent set', !!this.mediaComponent);
      // Try to instantiate the component into the template host. The host may not be
      // available immediately because the ng-template is only rendered when activeTab === 'media'.
      // Retry a few times with a small delay.
      const tryCreate = (attemptsLeft = 5, delay = 50) => {
        if (this.mediaHost && this.mediaComponent) {
          try {
            this.mediaHost.clear();
            this.mediaComponentRef = this.mediaHost.createComponent(this.mediaComponent);
            console.log('Admin: media component created via ViewContainerRef', this.mediaComponentRef);
            return true;
          } catch (error_) {
            console.error('Admin: failed to create media component via ViewContainerRef', error_);
            return false;
          }
        }
        if (attemptsLeft <= 0) return false;
        setTimeout(() => tryCreate(attemptsLeft - 1, Math.min(500, delay * 2)), delay);
        return null;
      };

      tryCreate();
    } catch (err) {
      console.error('Failed to load media manager component dynamically', err);
    }
  }

  // Cleanup when switching away from media tab
  private destroyMediaComponent() {
    if (this.mediaComponentRef) {
      try {
        this.mediaComponentRef.destroy();
      } catch (error_) {
        console.warn('Admin: error destroying media component', error_);
      }
      this.mediaComponentRef = null;
    }
    if (this.mediaHost) {
      try {
        this.mediaHost.clear();
      } catch (error_) {
        console.warn('Admin: error clearing media host', error_);
      }
    }
    this.mediaComponent = null;
  }

  // Attempt to create the media component instance if possible (host + component available)
  private tryCreateMediaInstance() {
    try {
      if (this.mediaComponent && this.mediaHost && !this.mediaComponentRef) {
        this.mediaHost.clear();
        this.mediaComponentRef = this.mediaHost.createComponent(this.mediaComponent);
        console.log('Admin: media component instantiated by tryCreateMediaInstance', this.mediaComponentRef);
      }
    } catch (error_) {
      console.warn('Admin: tryCreateMediaInstance failed', error_);
    }
  }
}