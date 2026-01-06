import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';
import { SUBMISSION_STATUS, SubmissionStatus } from '../../shared/constants/api.constants';
import { ButtonComponent } from '../../shared/components';

// Interfaces
interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  publishedWorkId?: string;
  excerpt?: string;
  content: string;
  tags: string[];
  reviewFeedback?: string;
  wordCount?: number;
  revisionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  slug?: string;
  seo?: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

interface Draft {
  id: string;
  title: string;
  type: string;
  content: string;
  excerpt?: string;
  tags: string[];
  wordCount?: number;
  updatedAt: string;
  createdAt: string;
}

@Component({
  selector: 'app-user-submissions',
  imports: [CommonModule, FormsModule, RouterModule, PrettyLabelPipe, ButtonComponent],
  templateUrl: './user-submissions.component.html',
  styleUrl: './user-submissions.component.css',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class UserSubmissionsComponent implements OnInit {
  // Core data
  submissions = signal<Submission[]>([]);
  drafts = signal<Draft[]>([]);
  
  // UI state
  selectedSubmission = signal<Submission | null>(null);
  
  // Loading states
  isLoading = signal(true);
  submissionsLoading = signal(false);
  draftsLoading = signal(false);
  loadingMoreSubmissions = signal(false);
  error = signal<string | null>(null);
  
  // Filters and sorts
  submissionsFilter = signal('');
  submissionsSort = signal('newest');
  draftsFilter = signal('');
  draftsSort = signal('newest');
  
  // Tab filtering
  activeSubmissionTab = signal<string>('all');
  
  // Comments expansion state
  expandedComments = signal<Set<string>>(new Set());
  
  // Pagination state
  submissionsPage = signal(0);
  submissionsLimit = signal(10);
  hasMoreSubmissions = signal(true);
  totalSubmissions = signal(0);
  
  // Constants for template
  readonly SUBMISSION_STATUS = SUBMISSION_STATUS;

  constructor(
    public router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.loadSubmissions();
    this.loadDrafts();
  }

  /**
   * Load user's submissions with pagination
   */
  async loadSubmissions() {
    try {
      this.submissionsLoading.set(true);
      this.submissionsPage.set(0);
      console.log('🔄 Loading user submissions...');
      
      const options = {
        limit: this.submissionsLimit(),
        skip: 0
      };
      
      console.log('🔄 Making API call with options:', options);
      
      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          console.log('✅ getUserSubmissions response:', response);
          console.log('📊 Submissions array:', response.submissions);
          console.log('📈 Submissions count:', response.submissions?.length || 0);
          console.log('🔢 Total count:', response.total);
          
          const submissions = response.submissions || [];
          this.submissions.set(submissions);
          this.totalSubmissions.set(response.total || submissions.length);
          this.hasMoreSubmissions.set(submissions.length >= this.submissionsLimit());
          this.submissionsLoading.set(false);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('❌ Error loading submissions:', error);
          this.submissions.set([]);
          this.hasMoreSubmissions.set(false);
          this.submissionsLoading.set(false);
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('💥 Exception in loadSubmissions:', error);
      this.submissions.set([]);
      this.hasMoreSubmissions.set(false);
      this.submissionsLoading.set(false);
      this.isLoading.set(false);
    }
  }

  /**
   * Load more submissions (pagination)
   */
  async loadMoreSubmissions() {
    if (this.loadingMoreSubmissions() || !this.hasMoreSubmissions()) return;
    
    try {
      this.loadingMoreSubmissions.set(true);
      const nextPage = this.submissionsPage() + 1;
      console.log('🔄 Loading more submissions... Page:', nextPage);
      
      const options = {
        limit: this.submissionsLimit(),
        skip: nextPage * this.submissionsLimit()
      };
      
      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          console.log('✅ Load more submissions response:', response);
          
          const newSubmissions = response.submissions || [];
          const currentSubmissions = this.submissions();
          const allSubmissions = [...currentSubmissions, ...newSubmissions];
          
          this.submissions.set(allSubmissions);
          this.submissionsPage.set(nextPage);
          this.hasMoreSubmissions.set(newSubmissions.length >= this.submissionsLimit());
          this.loadingMoreSubmissions.set(false);
        },
        error: (error: any) => {
          console.error('❌ Error loading more submissions:', error);
          this.loadingMoreSubmissions.set(false);
        }
      });
    } catch (error) {
      console.error('💥 Exception in loadMoreSubmissions:', error);
      this.loadingMoreSubmissions.set(false);
    }
  }

  /**
   * Load user's drafts
   */
  async loadDrafts() {
    try {
      this.draftsLoading.set(true);
      
      this.backendService.getUserDrafts().subscribe({
        next: (response: any) => {
          this.drafts.set(response.drafts || []);
          this.draftsLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading drafts:', error);
          this.drafts.set([]);
          this.draftsLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Exception in loadDrafts:', error);
      this.drafts.set([]);
      this.draftsLoading.set(false);
    }
  }

  // Navigation helpers
  goToSubmit() {
    this.router.navigate(['/submission']);
  }

  // Utility methods for template
  formatType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  truncateTitle(title: string, maxLength: number = 50): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  // Computed methods for filtering and sorting
  getAllSubmissionsChronological() {
    const submissions = this.submissions();
    return [...submissions].sort((a, b) => 
      new Date(b.createdAt || b.submittedAt).getTime() - new Date(a.createdAt || a.submittedAt).getTime()
    );
  }

  getFilteredSubmissions() {
    let submissions = this.getAllSubmissionsChronological();
    
    // Apply tab filter
    const activeTab = this.activeSubmissionTab();
    if (activeTab !== 'all') {
      if (activeTab === 'under-review') {
        submissions = submissions.filter(s => 
          ['pending_review', 'in_progress', 'resubmitted'].includes(s.status)
        );
      } else if (activeTab === 'published') {
        submissions = submissions.filter(s => s.status === 'published');
      } else if (activeTab === 'needs-revision') {
        submissions = submissions.filter(s => s.status === 'needs_revision');
      } else if (activeTab === 'rejected') {
        submissions = submissions.filter(s => s.status === 'rejected');
      } else if (activeTab === 'accepted') {
        submissions = submissions.filter(s => s.status === 'accepted');
      }
    }
    
    // Apply search filter
    const filter = this.submissionsFilter().toLowerCase();
    if (filter) {
      submissions = submissions.filter(submission => 
        submission.title.toLowerCase().includes(filter) ||
        submission.submissionType.toLowerCase().includes(filter) ||
        submission.status.toLowerCase().includes(filter)
      );
    }
    
    return submissions;
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeSubmissionTab.set(tab);
  }

  // Get count for each status
  getStatusCount(status: string): number {
    const submissions = this.submissions();
    if (status === 'all') return submissions.length;
    if (status === 'under-review') {
      return submissions.filter(s => 
        ['pending_review', 'in_progress', 'resubmitted'].includes(s.status)
      ).length;
    }
    return submissions.filter(s => s.status === status).length;
  }

  getFilteredDrafts() {
    let drafts = this.drafts();
    
    // Apply filter
    const filter = this.draftsFilter().toLowerCase();
    if (filter) {
      drafts = drafts.filter(draft => 
        draft.title.toLowerCase().includes(filter) ||
        draft.type.toLowerCase().includes(filter)
      );
    }
    
    // Apply sort
    const sort = this.draftsSort();
    if (sort === 'newest') {
      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === 'oldest') {
      drafts.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else if (sort === 'alphabetical') {
      drafts.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return drafts;
  }

  // Refresh methods
  refreshSubmissions() {
    this.submissionsPage.set(0);
    this.hasMoreSubmissions.set(true);
    this.loadSubmissions();
  }

  refreshDrafts() {
    this.loadDrafts();
  }

  showReviewModal(submission: Submission) {
    this.selectedSubmission.set(submission);
  }

  editSubmission(submission: Submission) {
    this.router.navigate(['/edit-submission', submission._id]);
  }

  viewSubmission(submission: Submission) {
    if (submission.status === 'published' && submission.publishedWorkId) {
      // Published submissions go to reading interface
      this.router.navigate(['/read', submission.publishedWorkId]);
    } else {
      // All other submissions go to edit-submission in view mode
      this.router.navigate(['/edit-submission', submission._id], { 
        queryParams: { mode: 'view' } 
      });
    }
  }

  reviewSubmission(submission: Submission) {
    this.showReviewModal(submission);
  }

  cleanHtml(html: string): string {
    // Simple HTML tag removal for display
    return html ? html.replace(/<[^>]*>/g, '') : '';
  }

  getTruncatedDescription(submission: Submission): string {
    const text = submission.excerpt || submission.content || '';
    const plainText = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  }

  getFormattedStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending_review': 'Pending Review',
      'in_progress': 'In Review', 
      'resubmitted': 'Resubmitted',
      'shortlisted': 'Shortlisted',
      'accepted': 'Ready to Publish',
      'published': 'Published',
      'rejected': 'Rejected',
      'needs_revision': 'Needs Revision',
      'draft': 'Draft'
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  getIconForType(type: string): string {
    const icons: { [key: string]: string } = {
      'opinion': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'poem': 'M4 8h12M4 12h8M4 16h14',
      'prose': 'M4 7h16M4 11h16M4 15h12M4 19h8',
      'article': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'book_review': 'M12 6.253v13C10.832 18.477 9.246 18 7.5 18S4.168 18.477 3 19.253V6.253C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253zm0 0C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z',
      'cinema_essay': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      'story': 'M12 6.253v13C10.832 18.477 9.246 18 7.5 18S4.168 18.477 3 19.253V6.253C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253zm0 0C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z'
    };
    return icons[type] || 'M12 2l3.09 6.26L22 9l-5 4.87L18.18 20 12 16.77 5.82 20 L7 13.87 2 9l6.91-.74L12 2z';
  }

  // Toggle comments expansion for a specific submission
  toggleComments(submissionId: string) {
    const currentExpanded = this.expandedComments();
    const newExpanded = new Set(currentExpanded);
    
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    
    this.expandedComments.set(newExpanded);
  }
}
