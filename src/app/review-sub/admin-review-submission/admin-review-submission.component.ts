import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';

@Component({
  selector: 'app-admin-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule, BadgeLabelComponent],
  templateUrl: './admin-review-submission.component.html',
  styleUrl: './admin-review-submission.component.css'
})
export class AdminReviewSubmissionComponent {
  id: string = "";
  private activatedRoute = inject(ActivatedRoute);
  submission: any;
  loggedInUser: any;
  existingReview: any = null;
  
  // Review form state
  reviewNotes: string = '';
  reviewAction: 'approve' | 'reject' | null = null;
  showReviewForm: boolean = false;
  isSubmitting: boolean = false;

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private http: HttpClient, 
    private backendService: BackendService, 
    private authService: AuthService,
    private router: Router
  ) {
    console.log("In review submission");
    this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    if (this.id) {
      this.getSubmissionWithContents(this.id);
    }
  }

  ngOnInit() {
    this.authService.user$.subscribe(data => {
      this.loggedInUser = data;
    });
  }

  getSubmissionWithContents(id: string) {
    this.backendService.getSubmissionWithContents(id).subscribe({
      next: (data: any) => {
        // Handle different possible content structures - ensure contents field exists
        if (data.contentIds && !data.contents) {
          data.contents = data.contentIds;
        }
        
        this.submission = data;
        console.log('Fetched submission:', data);
        console.log('Contents array:', data.contents);
        
        // Check if submission has been reviewed
        if (data.status !== 'pending_review') {
          this.loadExistingReview(id);
        }
      },
      error: (err: any) => {
        console.error('Error fetching submission:', err);
      }
    });
  }

  loadExistingReview(submissionId: string) {
    // Call the review API to get review details
    this.backendService.getReviewDetails(submissionId).subscribe({
      next: (data: any) => {
        this.existingReview = data.submission?.review;
        console.log('Existing review:', this.existingReview);
      },
      error: (err: any) => {
        console.error('Error fetching review details:', err);
      }
    });
  }

  setReviewAction(action: 'approve' | 'reject') {
    this.reviewAction = action;
    this.showReviewForm = true;
    
    // Set default messages
    if (action === 'approve' && !this.reviewNotes) {
      this.reviewNotes = '';
    } else if (action === 'reject') {
      this.reviewNotes = '';
    }
  }

  cancelReview() {
    this.reviewAction = null;
    this.showReviewForm = false;
    this.reviewNotes = '';
  }

  confirmReview() {
    // Validate required fields
    if (this.reviewAction === 'reject' && !this.reviewNotes.trim()) {
      this.showToast('Review comments are required when rejecting a submission.', 'error');
      return;
    }

    if (!this.loggedInUser?.id) {
      this.showToast('You must be logged in to review submissions.', 'error');
      return;
    }

    this.isSubmitting = true;

    if (this.reviewAction === 'approve') {
      this.approveSubmission();
    } else if (this.reviewAction === 'reject') {
      this.rejectSubmission();
    }
  }

  approveSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim() || 'Approved without specific comments.'
    };

    this.backendService.approveSubmission(this.id, reviewData).subscribe({
      next: (res: any) => {
        console.log('Submission approved:', res);
        this.showSuccessMessage('Submission approved successfully!');
        
        // Refresh the submission data
        this.getSubmissionWithContents(this.id);
        this.resetReviewForm();
      },
      error: (err: any) => {
        console.error('Error approving submission:', err);
        this.showErrorMessage('Error approving submission. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  rejectSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.rejectSubmission(this.id, reviewData).subscribe({
      next: (res: any) => {
        console.log('Submission rejected:', res);
        this.showSuccessMessage('Submission rejected.');
        
        // Refresh the submission data
        this.getSubmissionWithContents(this.id);
        this.resetReviewForm();
      },
      error: (err: any) => {
        console.error('Error rejecting submission:', err);
        this.showErrorMessage('Error rejecting submission. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  resetReviewForm() {
    this.reviewAction = null;
    this.showReviewForm = false;
    this.reviewNotes = '';
    this.isSubmitting = false;
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast(): void {
    this.showToastFlag = false;
  }

  showSuccessMessage(message: string) {
    this.showToast(message, 'success');
  }

  showErrorMessage(message: string) {
    this.showToast(message, 'error');
  }

  // Helper method to check if user can review
  canReview(): boolean {
    return this.submission?.status === 'pending_review' && 
           this.loggedInUser?.role && 
           ['admin', 'reviewer'].includes(this.loggedInUser.role);
  }

  // Navigate back to pending reviews
  goBackToPendingReviews() {
    this.router.navigate(['/reviews/pending']);
  }

  // Clean HTML content for better display
  cleanContent(content: string): string {
    if (!content) return '';
    
    return content
      // Remove excessive empty divs
      .replace(/<div>\s*<\/div>/g, '<br>')
      // Replace div tags with line breaks for poetry formatting
      .replace(/<div>/g, '<br>')
      .replace(/<\/div>/g, '')
      // Clean up multiple consecutive line breaks
      .replace(/(<br\s*\/?>){3,}/g, '<br><br>')
      // Remove leading/trailing line breaks
      .replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/g, '')
      // Clean up any remaining empty paragraphs or spaces
      .trim();
  }
}