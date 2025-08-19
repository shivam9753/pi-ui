import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../services/backend.service';
import { AuthService } from '../../../services/auth.service';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { environment } from '../../../../environments/environment';
import { AnalysisPanelComponent } from './analysis-panel.component';
import { REVIEW_ACTIONS, ReviewAction, API_ENDPOINTS } from '../../../shared/constants/api.constants';

@Component({
  selector: 'app-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule, ToastNotificationComponent, StatusBadgeComponent, AnalysisPanelComponent],
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
  reviewAction: 'approve' | 'reject' | 'revision' | 'move_to_progress' | 'shortlist' | null = null;
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
  
  // Simplified - no navigation for now

  constructor(
    private http: HttpClient, 
    private backendService: BackendService, 
    private authService: AuthService,
    private router: Router
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    // Simplified initialization
    
    if (this.id) {
      this.getSubmissionWithContents(this.id);
    }
    if(!environment.production)
      this.isAnalysisEnabled = true;
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
        
        // Check if submission has been reviewed
        if (data.status !== 'pending_review') {
          this.loadExistingReview(id);
        }
        
        // Don't prefetch history - load only when user expands it
      },
      error: () => {
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
      error: () => {
        // Error fetching review details
      }
    });
  }


  setReviewAction(action: 'approve' | 'reject' | 'revision' | 'move_to_progress' | 'shortlist') {
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
    } else if (action === 'shortlist') {
      this.reviewNotes = 'Shortlisted for further review';
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

    const currentUser = this.authService.getCurrentUser();
    const user = this.loggedInUser || currentUser;
    
    console.log('Debug confirmReview - loggedInUser:', this.loggedInUser);
    console.log('Debug confirmReview - currentUser:', currentUser);
    console.log('Debug confirmReview - user:', user);
    
    if (!user || (!user.id && !user.email)) {
      this.showToast('You must be logged in to review submissions.', 'error');
      return;
    }

    // Check if submission can be reviewed based on its current status
    if (!this.canReviewSubmission()) {
      const currentStatus = this.submission?.status || 'unknown';
      this.showToast(`This submission cannot be reviewed. Current status: ${currentStatus}. Only submissions with status pending_review, in_progress, resubmitted, or shortlisted can be reviewed.`, 'error');
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
      case 'shortlist':
        this.shortlistSubmission();
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
    const contentPieces = this.submission?.contents?.filter((content: any) => content.body && content.body.trim()) || [];
    
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
    
    this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.SUBMISSIONS_NESTED.ANALYZE(this.submission?._id)}`, {
      submissionText: content.body
    }).subscribe({
      next: (res: any) => {
        // Add content metadata to analysis result
        const analysisWithMetadata = {
          ...res,
          contentIndex: index,
          contentTitle: content.title || `Content ${index + 1}`,
          contentType: content.type || this.submission?.submissionType,
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
          contentType: content.type || this.submission?.submissionType,
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

    this.backendService.submitReviewAction(this.id, REVIEW_ACTIONS.APPROVE as ReviewAction, reviewData).subscribe({
      next: () => {
        this.handleReviewSuccess('Submission approved successfully!');
      },
      error: (err) => {
        if (err.status === 200 || (err.error && err.error.success === true)) {
          this.handleReviewSuccess('Submission approved successfully!');
        } else {
          this.showErrorMessage('Error approving submission. Please try again.');
          this.isSubmitting = false;
        }
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
      error: () => {
        this.submissionHistory = [];
        this.loadingHistory = false;
      }
    });
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    // Load history only when expanding for the first time
    if (this.showHistory && this.submissionHistory.length === 0) {
      this.loadSubmissionHistory(this.id);
    }
  }

  toggleMobileAnalysis() {
    this.showMobileAnalysis = !this.showMobileAnalysis;
  }

  rejectSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.submitReviewAction(this.id, REVIEW_ACTIONS.REJECT as ReviewAction, reviewData).subscribe({
      next: () => {
        this.handleReviewSuccess('Submission rejected.');
      },
      error: (err) => {
        if (err.status === 200 || err.error?.success) {
          this.handleReviewSuccess('Submission rejected.');
        } else {
          const errorMessage = err.error?.message || err.message || 'Error rejecting submission. Please try again.';
          this.showErrorMessage(errorMessage);
        }
        this.isSubmitting = false;
      }
    });
  }

  requestRevision() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.submitReviewAction(this.id, REVIEW_ACTIONS.REVISION as ReviewAction, reviewData).subscribe({
      next: () => {
        this.handleReviewSuccess('Revision requested. Author has been notified.');
      },
      error: (err) => {
        if (err.status === 200 || err.error?.success) {
          this.handleReviewSuccess('Revision requested. Author has been notified.');
        } else {
          const errorMessage = err.error?.message || err.message || 'Error requesting revision. Please try again.';
          this.showErrorMessage(errorMessage);
        }
        this.isSubmitting = false;
      }
    });
  }

  moveToProgress() {
    const notes = this.reviewNotes.trim() || 'Moved to in progress for detailed review';

    this.backendService.moveSubmissionToProgress(this.id, notes).subscribe({
      next: () => {
        this.handleReviewSuccess('Submission moved to in progress.');
      },
      error: () => {
        this.showErrorMessage('Error moving submission to progress. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  shortlistSubmission() {
    const currentUser = this.authService.getCurrentUser();
    const user = this.loggedInUser || currentUser;
    
    const reviewData = {
      reviewNotes: this.reviewNotes.trim() || 'Shortlisted for further consideration',
      reviewerName: user?.name || user?.username || user?.email || 'Unknown Reviewer',
      reviewerId: user?.id || user?.email
    };

    this.backendService.submitReviewAction(this.id, REVIEW_ACTIONS.SHORTLIST as ReviewAction, reviewData).subscribe({
      next: () => {
        this.handleReviewSuccess('Submission shortlisted successfully!');
      },
      error: (err) => {
        if (err.status === 200 || (err.error && err.error.success === true)) {
          this.handleReviewSuccess('Submission shortlisted successfully!');
        } else {
          this.showErrorMessage('Error shortlisting submission. Please try again.');
          this.isSubmitting = false;
        }
      }
    });
  }

  // Direct method to start review process without showing form
  startReviewProcess() {
    const currentUser = this.authService.getCurrentUser();
    const isLoggedIn = (this.loggedInUser?.id || this.loggedInUser?.email) || 
                      (currentUser?.id || currentUser?.email);
    
    if (!isLoggedIn) {
      this.showToast('You must be logged in to review submissions.', 'error');
      return;
    }

    const user = this.loggedInUser || currentUser;
    this.isSubmitting = true;
    const notes = 'Review started by ' + (user?.username || user?.name || user?.email || 'reviewer');

    this.backendService.moveSubmissionToProgress(this.id, notes).subscribe({
      next: () => {
        this.handleReviewSuccess('Review process started successfully!');
      },
      error: () => {
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

  // Consolidated success handler for all review actions
  private handleReviewSuccess(message: string) {
    this.showSuccessMessage(message);
    this.getSubmissionWithContents(this.id);
    this.resetReviewForm();
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
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user && (user.id || user.email);
    return this.submission?.status && 
           ['pending_review', 'in_progress', 'resubmitted', 'shortlisted'].includes(this.submission?.status) &&
           isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer', 'curator'].includes(user.role);
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
    const reviewableStatuses = ['pending_review', 'in_progress', 'resubmitted', 'shortlisted'];
    return reviewableStatuses.includes(this.submission?.status);
  }

  // Check if "Start Review" button should show (only for never-reviewed submissions)
  canStartReview(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user?.id || user?.email;
    return this.submission?.status === 'pending_review' && 
           isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer', 'curator'].includes(user.role);
  }

  // Check if action buttons should show (for in_progress and shortlisted submissions)
  canShowActionButtons(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user && (user.id || user.email);
    return ['in_progress', 'shortlisted'].includes(this.submission?.status) && 
           isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer', 'curator'].includes(user.role);
  }

  // Check if user can approve submissions (accept only)
  canApproveSubmissions(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user && (user.id || user.email);
    return isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer'].includes(user.role);
  }

  // Check if user can perform curation actions (reject/revision/shortlist)
  canPerformCurationActions(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user && (user.id || user.email);
    return isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer', 'curator'].includes(user.role);
  }

  // Check if user can only curate (shortlist only)
  isCuratorOnly(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    return user?.role === 'curator';
  }

  // Check if shortlist button should be disabled/hidden
  canShortlist(): boolean {
    return this.canPerformCurationActions() && this.submission?.status !== 'shortlisted' && this.submission?.status !== 'accepted' && this.submission?.status !== 'approved';
  }

  // Check if accept button should be disabled/hidden
  canAccept(): boolean {
    return this.canApproveSubmissions() && this.submission?.status !== 'accepted' && this.submission?.status !== 'approved';
  }

  // Check if specific action is allowed based on current status
  isActionAllowed(action: string): boolean {
    const status = this.submission?.status;
    
    switch (action) {
      case 'approve':
      case 'accept':
        return this.canAccept();
      case 'shortlist':
        return this.canShortlist();
      case 'reject':
      case 'revision':
        return this.canPerformCurationActions() && !['accepted', 'approved', 'rejected'].includes(status);
      default:
        return true;
    }
  }


  // Get action badge class for history entries
  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'approved':
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'revision_requested':
      case 'needs_revision':
        return 'bg-amber-100 text-amber-800';
      case 'moved_to_progress':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Format action names for display
  getActionDisplayName(action: string): string {
    switch (action) {
      case 'moved_to_progress':
        return 'Under Review';
      case 'in_progress':
        return 'Under Review';
      case 'revision_requested':
        return 'Revision Requested';
      case 'needs_revision':
        return 'Needs Revision';
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Approved';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'shortlisted':
      case 'shortlist':
        return 'Shortlisted';
      default:
        // Fallback: replace all underscores and title case
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  // Get action button color using CSS variables
  getActionButtonColor(action: string | null): string {
    if (!action) return 'var(--bg-accent)';
    
    switch (action) {
      case 'approve': return 'var(--bg-success)';
      case 'reject': return 'var(--bg-error)';
      case 'revision': return 'var(--bg-accent-hover)';
      case 'shortlist': return 'var(--bg-accent)';
      case 'move_to_progress': return 'var(--bg-accent)';
      default: return 'var(--bg-accent)';
    }
  }

  // Navigation methods removed for now due to API issues
  // The core review functionality works fine without navigation
}
