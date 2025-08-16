import { Component, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual workspace tab components
import { ReadyToPublishComponent } from "../admin/submissions/ready-to-publish/ready-to-publish.component";
import { PendingReviewsComponent } from "../admin/submissions/pending-reviews/pending-reviews.component";
import { PromptManagementComponent } from '../admin/prompts/prompt-management/prompt-management.component';
import { ShortlistedSubmissionsComponent } from '../admin/submissions/shortlisted/shortlisted-submissions.component';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    PromptManagementComponent,
    ReadyToPublishComponent,
    PendingReviewsComponent,
    ShortlistedSubmissionsComponent
],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
  activeTab: 'review' | 'shortlisted' | 'publish' | 'prompts' = 'review';
  isAdmin = false;
  isReviewer = false;
  isCurator = false;
  currentUser: any = null;
  loading = true;

  constructor(
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.checkWorkspaceAccess();
    
    // Handle URL fragments for direct tab navigation
    this.route.fragment.subscribe(fragment => {
      if (fragment && ['review', 'shortlisted', 'publish', 'prompts'].includes(fragment)) {
        const tab = fragment as 'review' | 'shortlisted' | 'publish' | 'prompts';
        // Only set tab if user has permission to access it
        if (this.canAccessTab(tab)) {
          this.activeTab = tab;
        }
      }
    });
  }

  checkWorkspaceAccess() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = user;
    
    // Check user roles
    this.isAdmin = user.role === 'admin';
    this.isReviewer = user.role === 'reviewer';
    this.isCurator = user.role === 'curator';
    
    // Admins, reviewers, and curators can access workspace
    if (!this.isAdmin && !this.isReviewer && !this.isCurator) {
      this.router.navigate(['/']);
      return;
    }
    
    this.activeTab = 'review';
    this.loading = false;
  }

  setActiveTab(tab: 'review' | 'shortlisted' | 'publish' | 'prompts') {
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
      // Reviewers can access all workspace tabs
      return ['review', 'shortlisted', 'publish', 'prompts'].includes(tab);
    }
    
    if (this.isCurator) {
      // Curators can access review and shortlisted tabs only
      return ['review', 'shortlisted'].includes(tab);
    }
    
    return false;
  }
}