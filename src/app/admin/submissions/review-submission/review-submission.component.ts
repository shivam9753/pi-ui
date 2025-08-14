import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../services/backend.service';
import { AuthService } from '../../../services/auth.service';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { environment } from '../../../../environments/environment';
import { AnalysisPanelComponent } from './analysis-panel.component';

@Component({
  selector: 'app-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule, BadgeLabelComponent, ToastNotificationComponent, StatusBadgeComponent, AnalysisPanelComponent],
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
  reviewAction: 'approve' | 'reject' | 'revision' | 'move_to_progress' | null = null;
  showReviewForm: boolean = false;
  isSubmitting: boolean = false;
  
  // History and status tracking
  submissionHistory: any[] = [];
  showHistory: boolean = false;
  loadingHistory: boolean = false;

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  // Analysis popup properties
  showAnalysisPopup = false;
  analysisData: any[] = []; // Array of analysis results for each content piece
  isAnalyzing = false;
  currentAnalysisIndex = 0; // Track which content is being analyzed
  
  // Feature flags
  isAnalysisEnabled = false; // Set to true in development, false in production

  // Mobile analysis section toggle
  showMobileAnalysis = false;
  
  // Quality breakdown display
  showFullBreakdown = false;

  constructor(
    private http: HttpClient, 
    private backendService: BackendService, 
    private authService: AuthService,
    private router: Router
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    if (this.id) {
      this.getSubmissionWithContents(this.id);
    }
    if(!environment.production)
      this,this.isAnalysisEnabled = true;
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
        this.buildTimelineSteps();
        
        // Check if submission has been reviewed
        if (data.status !== 'pending_review') {
          this.loadExistingReview(id);
        }
        
        // Load submission history
        this.loadSubmissionHistory(id);
      },
      error: (err: any) => {
        // Error fetching submission
      }
    });
  }

  loadExistingReview(submissionId: string) {
    // Call the review API to get review details
    this.backendService.getReviewDetails(submissionId).subscribe({
      next: (data: any) => {
        this.existingReview = data.submission?.review;
      },
      error: (err: any) => {
        // Error fetching review details
      }
    });
  }

  timelineSteps: any;

  buildTimelineSteps() {
    this.timelineSteps = [];
    this.timelineSteps.push( { label: 'Submitted', color: 'blue', tooltip: `The submission was recieved on ${this.submission?.createdAt}` });

    if(this.submission?.reviewedAt) {
      this.timelineSteps.push( { label: 'In Review', color: 'yellow', tooltip: `Review started on ${this.submission?.reviewedAt}` });
    }

    if(this.submission?.revisionNotes) {
      this.timelineSteps.push( { label: 'Needs Revision', color: 'red', tooltip: `Marked for Revision` });
    }
    if(this.submission?.publishedAt) {
      this.timelineSteps.push( { label: 'Published', color: 'green', tooltip: `The submission was accepted and published` });
    }
  }

  setReviewAction(action: 'approve' | 'reject' | 'revision' | 'move_to_progress') {
    this.reviewAction = action;
    this.showReviewForm = true;
    
    // Set default messages based on action
    if (action === 'approve' && !this.reviewNotes) {
      this.reviewNotes = '';
    } else if (action === 'reject') {
      this.reviewNotes = '';
    } else if (action === 'revision') {
      this.reviewNotes = 'Please revise the following:';
    } else if (action === 'move_to_progress') {
      this.reviewNotes = 'Moving to in progress for detailed review';
    }
  }

  cancelReview() {
    this.reviewAction = null;
    this.showReviewForm = false;
    this.reviewNotes = '';
  }

  confirmReview() {
    // Validate required fields
    if ((this.reviewAction === 'reject' || this.reviewAction === 'revision') && !this.reviewNotes.trim()) {
      this.showToast('Review comments are required for this action.', 'error');
      return;
    }

    if (!this.loggedInUser?.id) {
      this.showToast('You must be logged in to review submissions.', 'error');
      return;
    }

    this.isSubmitting = true;

    switch (this.reviewAction) {
      case 'approve':
        this.approveSubmission();
        break;
      case 'reject':
        this.rejectSubmission();
        break;
      case 'revision':
        this.requestRevision();
        break;
      case 'move_to_progress':
        this.moveToProgress();
        break;
    }
  }

  analyzeSubmission() {
    // Check if analysis is enabled
    if (!this.isAnalysisEnabled) {
      this.showToast('🚀 AI Analysis is coming soon! This feature will help identify plagiarized content and provide insights about themes, quality, and writing style to assist in the review process.', 'info');
      return;
    }
    
    this.isAnalyzing = true;
    this.analysisData = []; // Reset analysis data
    this.currentAnalysisIndex = 0;
    
    // Get all content pieces that have text
    const contentPieces = this.submission.contents.filter((content: any) => content.body && content.body.trim());
    
    if (contentPieces.length === 0) {
      this.showToast('No content found to analyze.', 'error');
      this.isAnalyzing = false;
      return;
    }
    
    // Analyze each content piece separately
    this.analyzeContentPiece(contentPieces, 0);
  }
  
  analyzeContentPiece(contentPieces: any[], index: number) {
    if (index >= contentPieces.length) {
      // All content pieces analyzed
      this.isAnalyzing = false;
      this.showAnalysisPopup = true;
      return;
    }
    
    this.currentAnalysisIndex = index;
    const content = contentPieces[index];
    
    this.http.post(`${environment.apiBaseUrl}/submissions/${this.submission._id}/analyze`, {
      submissionText: content.body
    }).subscribe({
      next: (res: any) => {
        // Add content metadata to analysis result
        const analysisWithMetadata = {
          ...res,
          contentIndex: index,
          contentTitle: content.title || `Content ${index + 1}`,
          contentType: content.type || this.submission.submissionType,
          originalContent: content.body
        };
        
        this.analysisData.push(analysisWithMetadata);
        
        // Analyze next content piece
        this.analyzeContentPiece(contentPieces, index + 1);
      },
      error: (err) => {
        // Add error result and continue
        this.analysisData.push({
          contentIndex: index,
          contentTitle: content.title || `Content ${index + 1}`,
          contentType: content.type || this.submission.submissionType,
          error: true,
          errorMessage: 'Analysis failed for this content piece'
        });
        
        // Continue with next content piece
        this.analyzeContentPiece(contentPieces, index + 1);
      }
    });
  }

  closeAnalysisPopup() {
    this.showAnalysisPopup = false;
    this.analysisData = [];
  }

  approveSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim() || 'Approved without specific comments.'
    };

    this.backendService.approveSubmission(this.id, reviewData).subscribe({
      next: (res: any) => {
        this.showSuccessMessage('Submission approved successfully!');
        
        // Refresh the submission data and history
        this.getSubmissionWithContents(this.id);
        this.loadSubmissionHistory(this.id);
        this.resetReviewForm();
        this.isSubmitting = false;
      },
      error: (err: any) => {
        // Check if it's actually a success response (status 200 or success flag)
        if (err.status === 200 || (err.error && err.error.success === true)) {
          this.showSuccessMessage('Submission approved successfully!');
          this.getSubmissionWithContents(this.id);
          this.loadSubmissionHistory(this.id);
          this.resetReviewForm();
        } else {
          this.showErrorMessage('Error approving submission. Please try again.');
        }
        this.isSubmitting = false;
      }
    });
  }

  loadSubmissionHistory(submissionId: string) {
    this.loadingHistory = true;
    this.backendService.getSubmissionHistory(submissionId).subscribe({
      next: (data: any) => {
        this.submissionHistory = data.history || [];
        this.loadingHistory = false;
      },
      error: (err: any) => {
        this.submissionHistory = [];
        this.loadingHistory = false;
      }
    });
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
  }

  toggleMobileAnalysis() {
    this.showMobileAnalysis = !this.showMobileAnalysis;
  }

  rejectSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.rejectSubmission(this.id, reviewData).subscribe({
      next: (res: any) => {
        this.showSuccessMessage('Submission rejected.');
        
        // Refresh the submission data and history
        this.getSubmissionWithContents(this.id);
        this.loadSubmissionHistory(this.id);
        this.resetReviewForm();
        this.isSubmitting = false;
      },
      error: (err: any) => {
        // Check if it's actually a success response with error status
        if (err.status === 200 || err.error?.success) {
          this.showSuccessMessage('Submission rejected.');
          this.getSubmissionWithContents(this.id);
          this.loadSubmissionHistory(this.id);
          this.resetReviewForm();
        } else {
          this.showErrorMessage('Error rejecting submission. Please try again.');
        }
        this.isSubmitting = false;
      }
    });
  }

  requestRevision() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.requestRevision(this.id, reviewData).subscribe({
      next: (res: any) => {
        this.showSuccessMessage('Revision requested. Author has been notified.');
        
        // Refresh the submission data and history
        this.getSubmissionWithContents(this.id);
        this.loadSubmissionHistory(this.id);
        this.resetReviewForm();
        this.isSubmitting = false;
      },
      error: (err: any) => {
        // Check if it's actually a success response with error status
        if (err.status === 200 || err.error?.success) {
          this.showSuccessMessage('Revision requested. Author has been notified.');
          this.getSubmissionWithContents(this.id);
          this.loadSubmissionHistory(this.id);
          this.resetReviewForm();
        } else {
          this.showErrorMessage('Error requesting revision. Please try again.');
        }
        this.isSubmitting = false;
      }
    });
  }

  moveToProgress() {
    const notes = this.reviewNotes.trim() || 'Moved to in progress for detailed review';

    this.backendService.moveSubmissionToProgress(this.id, notes).subscribe({
      next: (res: any) => {
        this.showSuccessMessage('Submission moved to in progress.');
        
        // Refresh the submission data and history
        this.getSubmissionWithContents(this.id);
        this.loadSubmissionHistory(this.id);
        this.resetReviewForm();
      },
      error: (err: any) => {
        this.showErrorMessage('Error moving submission to progress. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  // Direct method to start review process without showing form
  startReviewProcess() {
    if (!this.loggedInUser?.id) {
      this.showToast('You must be logged in to review submissions.', 'error');
      return;
    }

    this.isSubmitting = true;
    const notes = 'Review started by ' + (this.loggedInUser.username || 'reviewer');

    this.backendService.moveSubmissionToProgress(this.id, notes).subscribe({
      next: (res: any) => {
        this.showSuccessMessage('Review process started successfully!');
        
        // Refresh the submission data and history
        this.getSubmissionWithContents(this.id);
        this.loadSubmissionHistory(this.id);
        this.isSubmitting = false;
      },
      error: (err: any) => {
        this.showErrorMessage('Error starting review process. Please try again.');
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
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
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
    return this.submission?.status && 
           ['pending_review', 'in_progress', 'resubmitted'].includes(this.submission.status) &&
           this.loggedInUser?.role && 
           ['admin', 'reviewer'].includes(this.loggedInUser.role);
  }

  // Helper methods for status checks
  isPendingReview(): boolean {
    return this.submission?.status === 'pending_review';
  }

  isInProgress(): boolean {
    return this.submission?.status === 'in_progress';
  }

  isAccepted(): boolean {
    return this.submission?.status === 'accepted';
  }

  isRejected(): boolean {
    return this.submission?.status === 'rejected';
  }

  needsRevision(): boolean {
    return this.submission?.status === 'needs_revision';
  }

  isPublished(): boolean {
    return this.submission?.status === 'published';
  }

  canReviewSubmission(): boolean {
    const reviewableStatuses = ['pending_review', 'in_progress', 'resubmitted'];
    return reviewableStatuses.includes(this.submission?.status);
  }

  // Check if "Start Review" button should show (only for never-reviewed submissions)
  canStartReview(): boolean {
    return this.submission?.status === 'pending_review' && 
           this.loggedInUser?.role && 
           ['admin', 'reviewer'].includes(this.loggedInUser.role);
  }

  getStatusBadgeClass(): string {
    if (!this.submission?.status) return 'bg-gray-100 text-gray-800';
    
    switch (this.submission.status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800';
      case 'published':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplayName(): string {
    if (!this.submission?.status) return 'Unknown';
    
    switch (this.submission.status) {
      case 'pending_review':
        return 'Pending Review';
      case 'in_progress':
        return 'In Progress';
      case 'needs_revision':
        return 'Needs Revision';
      default:
        return this.submission.status.charAt(0).toUpperCase() + this.submission.status.slice(1);
    }
  }

  // Navigate back to pending reviews
  goBackToPendingReviews() {
    this.router.navigate(['/admin/submissions/pending-reviews']);
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

  // Calculate word count from content body
  getWordCount(content: string): number {
    if (!content) return 0;
    
    // Remove HTML tags and clean up text
    const cleanText = content
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
    
    if (!cleanText) return 0;
    
    // Count words by splitting on whitespace
    return cleanText.split(' ').filter(word => word.length > 0).length;
  }
  
  // Get quality aspects for enhanced breakdown display
  getQualityAspects() {
    return [
      { key: 'imagery', label: 'Imagery', shortLabel: 'Imagery' },
      { key: 'sensory_details', label: 'Sensory Details', shortLabel: 'Sensory' },
      { key: 'cohesiveness', label: 'Cohesiveness', shortLabel: 'Cohesion' },
      { key: 'rich_language', label: 'Rich Language', shortLabel: 'Language' },
      { key: 'format_structure', label: 'Format & Structure', shortLabel: 'Structure' },
      { key: 'emotional_resonance', label: 'Emotional Resonance', shortLabel: 'Emotion' },
      { key: 'originality', label: 'Originality', shortLabel: 'Original' },
      { key: 'rhythm', label: 'Rhythm', shortLabel: 'Rhythm' },
      { key: 'layers_of_meaning', label: 'Layers of Meaning', shortLabel: 'Depth' },
      { key: 'memorable_lines', label: 'Memorable Lines', shortLabel: 'Impact' }
    ];
  }
}
