import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../backend.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule],
  templateUrl: './review-submission.component.html',
  styleUrl: './review-submission.component.css'
})
export class ReviewSubmissionComponent {
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
        this.submission = data;
        console.log('Fetched submission:', data);
        
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
      alert('Review comments are required when rejecting a submission.');
      return;
    }

    if (!this.loggedInUser?.id) {
      alert('You must be logged in to review submissions.');
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

  showSuccessMessage(message: string) {
    // You can implement a toast notification here
    // For now, using simple alert
    alert(message);
    
    // Optionally redirect to pending reviews list
    // this.router.navigate(['/reviews/pending']);
  }

  showErrorMessage(message: string) {
    // You can implement a toast notification here
    // For now, using simple alert
    alert(message);
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
}