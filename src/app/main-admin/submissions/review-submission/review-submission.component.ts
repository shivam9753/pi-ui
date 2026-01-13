import { Component, inject, HostBinding } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BackendService } from '../../../services/backend.service';
import { AuthService } from '../../../services/auth.service';
import { ToastNotificationComponent } from '../../../shared/components/toast-notification/toast-notification.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { environment } from '../../../../environments/environment';
import { AnalysisPanelComponent } from './analysis-panel.component';
import { EditorialCriteriaComponent } from './editorial-criteria.component';
import { SendEmailModalComponent, EmailData } from './send-email-modal.component';
import { REVIEW_ACTIONS, ReviewAction, API_ENDPOINTS, SUBMISSION_STATUS } from '../../../shared/constants/api.constants';
import { ToastService } from '../../../services/toast.service';
import { ButtonComponent } from '../../../ui-components/button/button.component';

@Component({
  selector: 'app-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule, ToastNotificationComponent, StatusBadgeComponent, AnalysisPanelComponent, EditorialCriteriaComponent, SendEmailModalComponent, ButtonComponent],
  // Using a minimal inline template to avoid parsing the large/malformed external template.
  // Restore `templateUrl` after fixing `review-submission.component.html`.
  template: `
    <div class="p-8">
      <h2 class="text-xl font-semibold">Review interface temporarily unavailable</h2>
      <p class="text-sm text-gray-600">The detailed review template is disabled to allow the project to build. Restore the original template after repairing any template syntax errors.</p>
    </div>
  `,
  styleUrls: ['./review-submission.component.css']
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

  // Email modal state
  showEmailModal: boolean = false;
  isSendingEmail: boolean = false;
  
  // Initial rejection reasons (shown when user taps)
  initialRejectionReasons = [
    'General: Does not meet quality standards',
    'General: Poor grammar/spelling',
    'General: Inappropriate content',
    'General: Wrong category selected',
    'General: Plagiarized content',
    'Poem: Clichéd Language',
    'Article: Too short - insufficient word count',
    'Prose: Lacks narrative structure'
  ];

  // All rejection reasons (for filtering as user types)
  allRejectionReasons = [
    'General: Wrong category selected',
    'General: Too short for any meaningful content',
    'General: Too long - exceeds platform limits',
    'General: Incomplete submission',
    'General: Submitted multiple times',
    'General: Off-topic/irrelevant to platform',
    'General: Hate speech/discriminatory content',
    'General: Copyright violation',
    'General: Factual inaccuracies',
    'General: Poor formatting/presentation',
    'General: No title provided',
    'General: Spam/promotional content',
    'General: Violates community guidelines',
    'General: Previously published elsewhere',
    'General: Author information missing/incomplete',
    'General: Language barrier - unclear meaning',
    'General: Seasonal/dated content submitted out of time',
    'General: Technical submission errors',
    'General: Content not aligned with platform values',
    'General: Requires age verification/mature content warning',
    'General: Submitted in Hindi (English portal only)',
    'General: AI Generated/Perfected content',
    'General: Poor grammar/spelling',
    'General: Inappropriate content',
    'General: Plagiarized content',

    'Poem: Clichéd Language',
    'Poem: Forced Rhyme',
    'Poem: Does not meet quality standards',
    'Poem: Format not suitable for platform',
    
    // ARTICLE-SPECIFIC REJECTIONS:
    'Article: Not an article - reads like creative writing/poetry',
    'Article: Too short - insufficient word count for article',
    'Article: No research or data to support claims',
    'Article: Lacks credible sources/citations',
    'Article: Missing thesis/hypothesis',
    'Article: No analytical framework',
    'Article: Pure opinion piece without factual backing',
    'Article: Lacks journalistic structure (lead, body, conclusion)',
    'Article: No expert quotes or interviews',
    'Article: Missing statistical evidence',
    'Article: Anecdotal only - no broader analysis',
    'Article: No clear argument or position',
    'Article: Lacks methodology explanation',
    'Article: Personal narrative instead of informative content',
    'Article: No problem-solution structure',
    'Article: Missing call-to-action or conclusion',
    'Article: Insufficient background/context provided',
    'Article: No current relevance or news angle',
    'Article: Reads like blog post rather than article',
    'Article: Lacks objectivity/too subjective',
    'Article: No fact-checking evident',
    'Article: Missing subheadings/poor structure',
    'Article: No target audience consideration',

    // CINEMA ESSAY REJECTIONS:
    'Cinema Essay: Plot summary without analysis',
    'Cinema Essay: No understanding of film theory/techniques',
    'Cinema Essay: Missing historical/cultural context',
    'Cinema Essay: Superficial character analysis',
    'Cinema Essay: No discussion of cinematography/direction',
    'Cinema Essay: Lacks comparison to other films/genres',
    'Cinema Essay: Personal taste presented as objective critique',
    'Cinema Essay: No thesis about film\'s significance',
    'Cinema Essay: Spoilers without warning',
    'Cinema Essay: Outdated references/no contemporary relevance',

    // PROSE REJECTIONS:
    'Prose: Lacks narrative structure',
    'Prose: No character development',
    'Prose: Weak dialogue/unrealistic conversations',
    'Prose: Show don\'t tell violations',
    'Prose: Inconsistent point of view',
    'Prose: No clear conflict or tension',
    'Prose: Rushed or unsatisfying ending',
    'Prose: Too much exposition/info dumping',
    'Prose: Flat or stereotypical characters',
    'Prose: No distinct voice or style',

    // BOOK REVIEW REJECTIONS:
    'Book Review: Plot summary without critique',
    'Book Review: No discussion of writing quality',
    'Book Review: Missing genre context/comparisons',
    'Book Review: Biased review (personal relationship with author)',
    'Book Review: No target audience consideration',
    'Book Review: Spoilers without proper warnings',
    'Book Review: Too short - insufficient analysis',
    'Book Review: No discussion of book\'s themes/significance',
    'Book Review: Personal preference presented as objective flaw',
    'Book Review: Missing publication details/context',

    // OPINION/OP-ED REJECTIONS:
    'Op-Ed: Weak or unclear thesis statement',
    'Op-Ed: No counterargument acknowledgment',
    'Op-Ed: Lacks topical relevance/timeliness',
    'Op-Ed: Too preachy/condescending tone',
    'Op-Ed: No call to action or solution proposed',
    'Op-Ed: Personal anecdotes without broader relevance',
    'Op-Ed: Inflammatory language without substance',
    'Op-Ed: Rehashing common arguments without new perspective',
    'Op-Ed: No credibility/expertise established',
    'Op-Ed: Too long - exceeds typical op-ed length',
    'Op-Ed: Not persuasive - weak argument structure',
    'Op-Ed: No understanding of target publication\'s audience'
  ];

  // Dynamic rejection reasons state
  filteredRejectionReasons: string[] = [];
  showRejectionReasons = false;
  rejectionReasonFilter = '';
  
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
  
  // Editorial guidelines panel
  showGuidelines = false;
  
  // Navigation properties
  reviewableSubmissions: any[] = [];
  currentSubmissionIndex: number = -1;
  hasNext: boolean = false;
  hasPrevious: boolean = false;
  isLoadingNavigation: boolean = false;

  constructor(
    private http: HttpClient, 
    private backendService: BackendService, 
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    
    if (this.id) {
      this.getSubmissionWithContents(this.id);
      this.loadReviewableSubmissions();
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
    this.backendService.getSubmissionForReview(id).subscribe({
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

  // Email modal methods
  openEmailModal() {
    this.showEmailModal = true;
  }

  closeEmailModal() {
    this.showEmailModal = false;
  }

  sendEmailToAuthor(emailData: EmailData) {
    this.isSendingEmail = true;

    const payload = {
      subject: emailData.subject,
      message: emailData.message,
      ...(emailData.template && { template: emailData.template })
    };

    this.backendService.sendReviewEmail(this.id, payload).subscribe({
      next: () => {
        this.toastService.showSuccess('Email sent successfully!');
        this.closeEmailModal();
        this.isSendingEmail = false;
      },
      error: (error) => {
        this.toastService.showError(
          error?.error?.message || 'Failed to send email. Please try again.'
        );
        this.isSendingEmail = false;
      }
    });
  }

  // Method to handle common rejection reason selection
  selectCommonReason(reason: string) {
    if (this.reviewNotes.trim() === '') {
      // If textarea is empty, set the reason
      this.reviewNotes = reason;
    } else {
      // If there's already content, append with proper formatting
      const currentText = this.reviewNotes.trim();
      // Check if the reason is already in the text
      if (!currentText.includes(reason)) {
        this.reviewNotes = currentText + (currentText.endsWith('.') || currentText.endsWith(',') ? ' ' : '. ') + reason;
      }
    }
    // Hide suggestions after selection
    this.showRejectionReasons = false;
    this.rejectionReasonFilter = '';
  }

  // Show initial rejection reasons when input is focused
  onReviewNotesClick() {
    if (this.reviewAction === 'reject' || this.reviewAction === 'revision') {
      // Only show initial reasons if textarea is empty
      if (!this.reviewNotes.trim()) {
        this.showRejectionReasons = true;
        this.filteredRejectionReasons = [...this.initialRejectionReasons];
        this.rejectionReasonFilter = '';
      }
    }
  }

  // Filter rejection reasons as user types
  onReviewNotesInput(event: any) {
    const value = event.target.value;
    this.reviewNotes = value;
    
    console.log('Typing:', value, 'Review Action:', this.reviewAction);
    
    if (this.reviewAction === 'reject' || this.reviewAction === 'revision') {
      if (value.trim().length >= 1) { // Start filtering after 1 character
        const searchTerm = value.trim().toLowerCase();
        
        this.filteredRejectionReasons = this.allRejectionReasons.filter(reason => 
          reason.toLowerCase().includes(searchTerm)
        ).slice(0, 8); // Limit to 8 suggestions for filtered results
        
        console.log('Filtered reasons:', this.filteredRejectionReasons.length, this.filteredRejectionReasons);
        
        this.showRejectionReasons = this.filteredRejectionReasons.length > 0;
        
        console.log('Show dropdown:', this.showRejectionReasons);
      } else if (value.trim().length === 0) {
        // Show initial reasons only when completely empty
        this.filteredRejectionReasons = [...this.initialRejectionReasons];
        this.showRejectionReasons = true;
        console.log('Showing initial reasons:', this.filteredRejectionReasons.length);
      } else {
        // Hide suggestions when no match
        this.showRejectionReasons = false;
        this.filteredRejectionReasons = [];
        console.log('Hiding suggestions');
      }
    }
  }

  // Hide rejection reasons when clicking outside
  hideRejectionReasons() {
    setTimeout(() => {
      this.showRejectionReasons = false;
      this.rejectionReasonFilter = '';
    }, 200); // Small delay to allow button clicks
  }

  // Get appropriate placeholder text for textarea
  getPlaceholder(): string {
    switch (this.reviewAction) {
      case 'approve': return 'Share what you liked about this submission (optional)...';
      case 'reject': return 'Click to see common reasons or type your feedback...';
      case 'revision': return 'Click to see common reasons or type your feedback...';
      case 'move_to_progress': return 'Add any initial notes before starting the review process (optional)...';
      case 'shortlist': return 'Add notes about why this submission is being shortlisted (optional)...';
      default: return 'Add your review comments...';
    }
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

    this.backendService.approveSubmissionSemantic(this.id, reviewData).subscribe({
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

  toggleGuidelines() {
    this.showGuidelines = !this.showGuidelines;
  }

  rejectSubmission() {
    const reviewData = {
      reviewNotes: this.reviewNotes.trim()
    };

    this.backendService.rejectSubmissionSemantic(this.id, reviewData).subscribe({
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

    this.backendService.requestRevisionSemantic(this.id, reviewData).subscribe({
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
      reviewerId: user?.id || user?.email
    };

    this.backendService.shortlistSubmissionSemantic(this.id, reviewData).subscribe({
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
           ['admin', 'reviewer', 'writer'].includes(user.role);
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
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isAdmin = user?.role === 'admin';
    
    // Admin can review any submission including published ones
    if (isAdmin) {
      const adminReviewableStatuses = ['pending_review', 'in_progress', 'resubmitted', 'shortlisted', 'published', 'accepted'];
      return adminReviewableStatuses.includes(this.submission?.status);
    }
    
    // Non-admins can only review these statuses
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
           ['admin', 'reviewer', 'writer'].includes(user.role);
  }

  // Check if action buttons should show (for in_progress, shortlisted, and resubmitted submissions)
  canShowActionButtons(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isLoggedIn = user && (user.id || user.email);
    return ['in_progress', 'shortlisted', 'resubmitted'].includes(this.submission?.status) && 
           isLoggedIn &&
           user?.role && 
           ['admin', 'reviewer', 'writer'].includes(user.role);
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
           ['admin', 'reviewer', 'writer'].includes(user.role);
  }

  // Check if user can only curate (shortlist only)
  isWriterOnly(): boolean {
    const user = this.loggedInUser || this.authService.getCurrentUser();
    return user?.role === 'writer';
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
    const user = this.loggedInUser || this.authService.getCurrentUser();
    const isAdmin = user?.role === 'admin';
    
    switch (action) {
      case 'approve':
      case 'accept':
        return this.canAccept();
      case 'shortlist':
        return this.canShortlist();
      case 'reject':
      case 'revision':
        // Admin can reject/revise any submission including published ones
        if (isAdmin) {
          return this.canPerformCurationActions();
        }
        // Non-admins follow normal rules
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
    this.router.navigate(['/workspace'], { queryParams: { tab: 'review' } });
  }

  // Clean HTML content for better display
  cleanContent(content: string): SafeHtml {
    if (!content) return '';
    
    // First, convert line breaks (\n) to <br> tags for proper display
    let cleanedContent = content
      // Convert actual line breaks to <br> tags
      .replace(/\n/g, '<br>');
    
    // If content already contains HTML (like <div> tags), handle them appropriately
    if (cleanedContent.includes('<div>') || cleanedContent.includes('</div>')) {
      cleanedContent = cleanedContent
        // Remove excessive empty divs
        .replace(/<div>\s*<\/div>/g, '<br>')
        // Replace opening div tags with line breaks (to preserve poem formatting)
        .replace(/<div>/g, '<br>')
        .replace(/<\/div>/g, '')
        // Clean up multiple consecutive line breaks (more than 2)
        .replace(/(<br\s*\/?>){3,}/g, '<br><br>');
    }
    
    cleanedContent = cleanedContent
      // Convert multiple spaces within lines to non-breaking spaces to preserve formatting
      .replace(/  +/g, (match) => '&nbsp;'.repeat(match.length))
      // Remove leading/trailing line breaks
      .replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/g, '')
      // Clean up any remaining empty paragraphs or spaces at the very end
      .trim();
    
    // Use DomSanitizer to bypass HTML sanitization and preserve formatting
    return this.sanitizer.bypassSecurityTrustHtml(cleanedContent);
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

  // Navigation methods
  viewUserProfile(userId: any) {
    if (!userId) return;
    
    // Extract the actual ID from the userId object or use it directly
    const actualUserId = typeof userId === 'object' ? userId._id || userId.id : userId;
    
    if (actualUserId) {
      // Navigate to public author profile instead of private user profile
      this.router.navigate(['/author', actualUserId]);
    }
  }

  // Navigation methods
  loadReviewableSubmissions() {
    this.isLoadingNavigation = true;
    
    // Try with a simpler API call first - just get the basic reviewable statuses
    const params = {
      limit: 100, // Reduced limit for testing
      skip: 0,
      sortBy: 'createdAt',
      order: 'desc',
      status: `${SUBMISSION_STATUS.PENDING_REVIEW},${SUBMISSION_STATUS.IN_PROGRESS}`
    };
    
    console.log('Loading reviewable submissions with params:', params);
    console.log('Status constants:', {
      PENDING_REVIEW: SUBMISSION_STATUS.PENDING_REVIEW,
      IN_PROGRESS: SUBMISSION_STATUS.IN_PROGRESS,
      SHORTLISTED: SUBMISSION_STATUS.SHORTLISTED
    });
    
    this.backendService.getSubmissions(params).subscribe({
      next: (data) => {
        console.log('API Response:', data);
        console.log('Loaded reviewable submissions:', data.submissions?.length || 0, 'submissions');
        console.log('Current submission ID:', this.id);
        this.reviewableSubmissions = data.submissions || [];
        this.updateNavigationState();
        this.isLoadingNavigation = false;
      },
      error: (error) => {
        console.error('Error loading reviewable submissions:', error);
        console.error('Error details:', error.error);
        
        // Try fallback approach - get all submissions without status filter
        console.log('Trying fallback approach...');
        const fallbackParams = {
          limit: 100,
          skip: 0,
          sortBy: 'createdAt',
          order: 'desc'
        };
        
        this.backendService.getSubmissions(fallbackParams).subscribe({
          next: (data) => {
            console.log('Fallback API Response:', data);
            const reviewableStatuses = ['pending_review', 'in_progress', 'shortlisted', 'resubmitted', 'needs_revision'];
            this.reviewableSubmissions = (data.submissions || []).filter((sub: any) => 
              reviewableStatuses.includes(sub.status)
            );
            console.log('Filtered submissions:', this.reviewableSubmissions.length);
            this.updateNavigationState();
            this.isLoadingNavigation = false;
          },
          error: (fallbackError) => {
            console.error('Fallback also failed:', fallbackError);
            this.isLoadingNavigation = false;
            this.reviewableSubmissions = [];
            this.updateNavigationState();
          }
        });
      }
    });
  }

  updateNavigationState() {
    // Find current submission in the list
    this.currentSubmissionIndex = this.reviewableSubmissions.findIndex(
      sub => sub._id === this.id
    );
    
    console.log('Current submission index:', this.currentSubmissionIndex);
    console.log('Total submissions:', this.reviewableSubmissions.length);
    console.log('Submission IDs:', this.reviewableSubmissions.map(s => s._id).slice(0, 5));
    
    // Update navigation flags
    this.hasPrevious = this.currentSubmissionIndex > 0;
    this.hasNext = this.currentSubmissionIndex >= 0 && 
                   this.currentSubmissionIndex < this.reviewableSubmissions.length - 1;
                   
    console.log('Has previous:', this.hasPrevious, 'Has next:', this.hasNext);
  }

  goToPrevious() {
    if (!this.hasPrevious) return;
    
    const previousSubmission = this.reviewableSubmissions[this.currentSubmissionIndex - 1];
    if (previousSubmission) {
      this.navigateToSubmission(previousSubmission._id);
    }
  }

  goToNext() {
    if (!this.hasNext) return;
    
    const nextSubmission = this.reviewableSubmissions[this.currentSubmissionIndex + 1];
    if (nextSubmission) {
      this.navigateToSubmission(nextSubmission._id);
    }
  }

  private navigateToSubmission(submissionId: string) {
    // Navigate to the new submission
    this.router.navigate(['/review-submission', submissionId]);
    
    // Update current ID and reload data
    this.id = submissionId;
    this.getSubmissionWithContents(submissionId);
    this.updateNavigationState();
    
    // Reset form state
    this.resetReviewForm();
    
    // Scroll to top for better UX
    window.scrollTo(0, 0);
  }

  getCurrentSubmissionInfo(): string {
    if (this.currentSubmissionIndex < 0 || this.reviewableSubmissions.length === 0) {
      return '';
    }
    
    return `${this.currentSubmissionIndex + 1} of ${this.reviewableSubmissions.length}`;
  }
}
