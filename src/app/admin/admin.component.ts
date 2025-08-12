import { Component, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual admin tab components
import { ReadyToPublishComponent } from "./submissions/ready-to-publish/ready-to-publish.component";
import { PendingReviewsComponent } from "./submissions/pending-reviews/pending-reviews.component";
import { PublishedPostsComponent } from "./content/published-posts/published-posts.component";
import { UserManagementComponent } from './users/user-management/user-management.component';
import { PromptManagementComponent } from './prompts/prompt-management/prompt-management.component';
import { PurgeManagementComponent } from './purge/purge-management.component';
import { CreateUsersComponent } from './users/create-users/create-users.component';
import { AllSubmissionsComponent } from './submissions/all-submissions/all-submissions.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    PromptManagementComponent,
    ReadyToPublishComponent,
    PendingReviewsComponent,
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
  activeTab: 'publish' | 'published' | 'users' | 'review' | 'prompts' | 'purge' | 'users_create' | 'submissions_all' = 'review';
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
      if (fragment && ['publish', 'published', 'users', 'review', 'prompts', 'purge', 'users_create', 'submissions_all'].includes(fragment)) {
        const tab = fragment as 'publish' | 'published' | 'users' | 'review' | 'prompts' | 'purge' | 'users_create' | 'submissions_all';
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
    
    // Distinguish between admin and reviewer roles
    this.isAdmin = user.role === 'admin';
    this.isReviewer = user.role === 'reviewer';
    
    // Both admins and reviewers can access this component
    if (!this.isAdmin && !this.isReviewer) {
      this.router.navigate(['/']);
      return;
    }
    
    this.activeTab = 'review';
    this.loading = false;
  }

  setActiveTab(tab: 'publish' | 'published' | 'users' | 'review' | 'prompts' | 'purge' | 'users_create' | 'submissions_all') {
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
      return true; // Admins can access all tabs
    }
    
    if (this.isReviewer) {
      // Reviewers can only access the review tab
      return tab === 'review';
    }
    
    return false;
  }
}