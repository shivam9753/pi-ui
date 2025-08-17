import { Component, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual admin tab components
import { PublishedPostsComponent } from "./content/published-posts/published-posts.component";
import { UserManagementComponent } from './users/user-management/user-management.component';
import { PurgeManagementComponent } from './purge/purge-management.component';
import { CreateUsersComponent } from './users/create-users/create-users.component';
import { AllSubmissionsComponent } from './submissions/all-submissions/all-submissions.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    PublishedPostsComponent,
    UserManagementComponent,
    PurgeManagementComponent,
    CreateUsersComponent,
    AllSubmissionsComponent
],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  activeTab: 'published' | 'users' | 'purge' | 'users_create' | 'submissions_all' = 'published';
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
      if (fragment && ['published', 'users', 'purge', 'users_create', 'submissions_all'].includes(fragment)) {
        const tab = fragment as 'published' | 'users' | 'purge' | 'users_create' | 'submissions_all';
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
    
    // Distinguish between admin, reviewer, and curator roles
    this.isAdmin = user.role === 'admin';
    this.isReviewer = user.role === 'reviewer' || user.role === 'curator';
    
    // Admins, reviewers, and curators can access this component
    if (!this.isAdmin && !this.isReviewer) {
      this.router.navigate(['/']);
      return;
    }
    
    this.activeTab = 'published';
    this.loading = false;
  }

  setActiveTab(tab: 'published' | 'users' | 'purge' | 'users_create' | 'submissions_all') {
    // Check if user has permission to access this tab
    if (!this.canAccessTab(tab)) {
      return; // Prevent access to unauthorized tabs
    }

    this.activeTab = tab;
    // Update URL fragment for bookmarkable tabs
    this.router.navigate([], { 
      fragment: tab,
      replaceUrl: true 
    });
  }

  // Check if current user can access a specific tab
  canAccessTab(tab: string): boolean {
    if (this.isAdmin) {
      return true; // Admins can access all admin tabs
    }
    
    // Only admins can access administrative functions
    return false;
  }
}