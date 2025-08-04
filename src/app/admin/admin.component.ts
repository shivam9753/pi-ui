import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual admin tab components
import { ReadyToPublishComponent } from "./submissions/ready-to-publish/ready-to-publish.component";
import { PendingReviewsComponent } from "./submissions/pending-reviews/pending-reviews.component";
import { PublishedPostsComponent } from "./content/published-posts/published-posts.component";
import { UserManagementComponent } from './users/user-management/user-management.component';
import { PromptManagementComponent } from './prompts/prompt-management/prompt-management.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    PromptManagementComponent,
    ReadyToPublishComponent,
    PendingReviewsComponent,
    PublishedPostsComponent,
    UserManagementComponent
],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  activeTab: 'publish' | 'published' | 'users' | 'review' | 'prompts' = 'publish';
  isAdmin = false;
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
      if (fragment && ['publish', 'users', 'review', 'prompts'].includes(fragment)) {
        this.activeTab = fragment as 'publish' | 'users' | 'review' | 'prompts';
      }
    });
  }

  checkAdminAccess() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Check if user is admin or reviewer
    this.isAdmin = user.role === 'admin' || user.role === 'reviewer';
    
    if (!this.isAdmin) {
      this.router.navigate(['/']);
      return;
    }

    this.loading = false;
  }

  setActiveTab(tab: 'publish' | 'published' | 'users' | 'review' | 'prompts') {
    this.activeTab = tab;
    // Update URL fragment for bookmarkable tabs
    this.router.navigate([], { 
      fragment: tab,
      replaceUrl: true 
    });
  }
}