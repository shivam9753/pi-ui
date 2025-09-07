import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual admin tab components
import { PublishedPostsComponent } from "./content/published-posts/published-posts.component";
import { FeaturedContentComponent } from "./content/featured-content/featured-content.component";
import { UserManagementComponent } from './users/user-management/user-management.component';
import { CreateUsersComponent } from './users/create-users/create-users.component';
import { PurgeManagementComponent } from './purge/purge-management.component';
import { AnalyticsComponent } from './analytics/analytics.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    PublishedPostsComponent,
    FeaturedContentComponent,
    UserManagementComponent,
    CreateUsersComponent,
    PurgeManagementComponent,
    AnalyticsComponent
],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, AfterViewInit {
  @ViewChild('tabNavigation') tabNavigation!: ElementRef;
  
  activeTab: 'submissions' | 'content' | 'users' | 'purge' | 'analytics' = 'submissions';
  userSubTab: 'manage' | 'create' = 'manage';
  isAdmin = false;
  isReviewer = false;
  currentUser: any = null;
  loading = true;

  constructor(
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.checkAdminAccess();
    
    // Handle URL fragments for direct tab navigation
    this.route.fragment.subscribe(fragment => {
      if (fragment && ['submissions', 'content', 'users', 'purge', 'analytics'].includes(fragment)) {
        const tab = fragment as 'submissions' | 'content' | 'users' | 'purge' | 'analytics';
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
    
    this.activeTab = 'submissions';
    this.loading = false;
  }

  ngAfterViewInit() {
    // Scroll to active tab after view is initialized
    setTimeout(() => {
      this.scrollToActiveTab();
    }, 100);
  }

  setActiveTab(tab: 'submissions' | 'content' | 'users' | 'purge' | 'analytics') {
    // Check if user has permission to access this tab
    if (!this.canAccessTab(tab)) {
      return; // Prevent access to unauthorized tabs
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
}