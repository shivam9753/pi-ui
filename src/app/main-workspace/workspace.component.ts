import { Component, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Import individual workspace tab components
import { PendingReviewsComponent } from "./pending-reviews/pending-reviews.component";
import { ButtonComponent } from '../ui-components/button/button.component';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    PendingReviewsComponent,
    ButtonComponent
 ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
   isAdmin = false;
   isReviewer = false;
   isWriter = false;
   currentUser: any = null;
   loading = true;
  constructor(
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.checkWorkspaceAccess();
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
    this.isWriter = user.role === 'writer';
    
    // Admins, reviewers, and writers can access workspace
    if (!this.isAdmin && !this.isReviewer && !this.isWriter) {
      this.router.navigate(['/']);
      return;
    }
    
    this.loading = false;
  }
}