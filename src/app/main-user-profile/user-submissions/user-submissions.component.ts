import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';
import { SUBMISSION_STATUS, SubmissionStatus } from '../../shared/constants/api.constants';
import { ButtonComponent } from '../../ui-components/button/button.component';
import { CardComponent } from '../../ui-components/card';
import { DropdownMultiComponent } from '../../ui-components/dropdown';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table.component';

// Interfaces3
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
  expiresAt?: string;
  author?: { name?: string; avatar?: string };
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
  imports: [CommonModule, FormsModule, RouterModule, PrettyLabelPipe, ButtonComponent, CardComponent, DropdownMultiComponent, BadgeLabelComponent, DataTableComponent],
  templateUrl: './user-submissions.component.html',
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
  // Multi-select filter for statuses (empty => show all)
  selectedStatuses = signal<string[]>([]);
  
  // Options for the status multi-select dropdown
  statusOptions = [
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'In Review', value: 'in_progress' },
    { label: 'Resubmitted', value: 'resubmitted' },
    { label: 'Published', value: 'published' },
    { label: 'Needs Revision', value: 'needs_revision' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Draft', value: 'draft' }
  ];
  
  // Comments expansion state
  expandedComments = signal<Set<string>>(new Set());
  
  // Pagination state
  submissionsPage = signal(0);
  submissionsLimit = signal(10);
  hasMoreSubmissions = signal(true);
  totalSubmissions = signal(0);
  
  // Computed counts for quick lookups (keeps template reactive and avoids repeated iteration)
  statusCounts = computed(() => {
    const subs = this.submissions();
    return {
      'under-review': subs.filter(s => ['pending_review', 'in_progress', 'resubmitted'].includes(s.status)).length,
      'needs_revision': subs.filter(s => s.status === 'needs_revision').length,
      'rejected': subs.filter(s => s.status === 'rejected').length,
      'accepted': subs.filter(s => s.status === 'accepted').length,
      'published': subs.filter(s => s.status === 'published').length,
      'all': subs.length
    } as Record<string, number>;
  });

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
  async loadSubmissions(page: number = 0) {
    try {
      this.submissionsLoading.set(true);
      this.submissionsPage.set(page);
      console.log('🔄 Loading user submissions... page:', page);

      const options = {
        limit: this.submissionsLimit(),
        skip: page * this.submissionsLimit()
      };

      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          const submissions = response.submissions || [];
          this.submissions.set(submissions);
          this.totalSubmissions.set(response.total || submissions.length);
          this.hasMoreSubmissions.set(submissions.length >= this.submissionsLimit());
          this.submissionsLoading.set(false);
          this.isLoading.set(false);

          // Debugging: log status counts so we can verify values used by the template
          try {
            console.log('📊 Submission status counts:', this.statusCounts());
          } catch (e) {
            console.warn('Unable to compute status counts:', e);
          }
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
    
    // Apply multi-select status filter (empty => show all)
    const selected = this.selectedStatuses();
    if (selected && selected.length > 0) {
      submissions = submissions.filter(s => selected.includes(s.status));
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
  
  // Allow template to set selected statuses
  setSelectedStatuses(statuses: string[]) {
    this.selectedStatuses.set(statuses || []);
  }

  // Get count for each status
  getStatusCount(status: string): number {
    const counts = this.statusCounts();
    if (status === 'all') return counts['all'] || 0;
    return counts[status] || 0;
  }

  getExpiringSoonCount(): number {
    const now = Date.now();
    const twoWeeks = 1000 * 60 * 60 * 24 * 14;
    return this.submissions().filter(s => s.expiresAt && new Date(s.expiresAt).getTime() <= now + twoWeeks).length;
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
    return html ? html.replaceAll(/<[^>]*>/g, '') : '';
  }

  getAuthorName(submission: Submission): string {
    // Prefer explicit author name, fall back to empty string
    if (submission.author && submission.author.name) return submission.author.name;
    return '';
  }

  getInitials(submission: Submission): string {
    const name = this.getAuthorName(submission) || this.cleanHtml(submission.title) || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.charAt(0)?.toUpperCase() || '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
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

  // Submission summary messages (adapted from user-profile)
  getSubmissionSummaryMessages() {
    const submissions = this.submissions();
    const messages: { message: string; type: string; priority: number; date?: Date; submissionType?: string }[] = [];

    submissions.forEach(submission => {
      const updateDate = new Date(submission.updatedAt || submission.reviewedAt || submission.submittedAt || Date.now());
      const submissionTypeFormatted = (submission.submissionType || '').replace('_', ' ').toLowerCase();

      // Published
      if (submission.status === 'published') {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" was published`, type: 'published', priority: 1, date: updateDate, submissionType: submissionTypeFormatted });
      }

      // Accepted
      if (submission.status === 'accepted') {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" was accepted`, type: 'accepted', priority: 2, date: updateDate, submissionType: submissionTypeFormatted });
      }

      // Needs revision
      if (submission.status === 'needs_revision') {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" needs revision`, type: 'needs_revision', priority: 3, date: updateDate, submissionType: submissionTypeFormatted });
      }

      // Shortlisted
      if (submission.status === 'shortlisted') {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" was shortlisted`, type: 'shortlisted', priority: 4, date: updateDate, submissionType: submissionTypeFormatted });
      }

      // Under review
      if (['pending_review', 'in_progress', 'resubmitted'].includes(submission.status)) {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" is under review`, type: 'under_review', priority: 5, date: updateDate, submissionType: submissionTypeFormatted });
      }

      // Rejected
      if (submission.status === 'rejected') {
        messages.push({ message: `Your ${submissionTypeFormatted} "${this.cleanHtml(submission.title)}" was rejected`, type: 'rejected', priority: 6, date: updateDate, submissionType: submissionTypeFormatted });
      }
    });

    // Sort by most recent first and limit
    const sorted = messages.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 6);
    return sorted;
  }

  // Map message type to statuses param for quick navigation
  mapMessageTypeToStatuses(type: string): string {
    switch (type) {
      case 'under_review':
        return 'pending_review,in_progress,resubmitted';
      case 'needs_revision':
        return 'needs_revision';
      case 'published':
        return 'published';
      case 'accepted':
        return 'accepted';
      case 'rejected':
        return 'rejected';
      default:
        return '';
    }
  }

  // Table config for app-data-table
  tableColumns: TableColumn[] = [
    { key: 'submissionType', label: 'Type', sortable: true, type: 'text' },
    { key: '_id', label: 'File ID', sortable: false, type: 'text' },
    { key: 'title', label: 'Title', sortable: true, type: 'text' },
    { key: 'submittedAt', label: 'Date', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge' }
  ];

  tableActions: TableAction[] = [
    { label: 'View', handler: (item: any) => this.viewSubmission(item), color: 'primary', isMainAction: true },
    { label: 'Edit', handler: (item: any) => this.editSubmission(item), color: 'secondary' }
  ];

  // Pagination config object for data-table
  get paginationConfig() {
    const total = this.totalSubmissions() || 0;
    const pageSize = this.submissionsLimit();
    const currentPage = this.submissionsPage() + 1; // data-table expects 1-based
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      currentPage,
      totalPages,
      pageSize,
      totalItems: total,
      hasMore: this.hasMoreSubmissions()
    };
  }

  onDataTablePageChange(page: number) {
    // data-table emits 1-based page
    const pageIndex = Math.max(0, page - 1);
    this.loadSubmissions(pageIndex);
  }

  // Methods referenced by template but previously missing
  completeSelected(): void {
    // Placeholder: implement actual completion logic when selection integration is in place
    console.log('completeSelected called');
  }

  setSearch(value: string): void {
    this.submissionsFilter.set(value || '');
  }

  sortBy(): string {
    return this.submissionsSort();
  }

  setSortBy(value: any): void {
    // Dropdown may emit an array or a single value; normalize to a string
    let v = '';
    if (Array.isArray(value)) {
      v = String(value[0] || '');
    } else {
      v = String(value || '');
    }
    this.submissionsSort.set(v || 'newest');
  }

  // Remove banner element when Dismiss is clicked
  dismissBanner(event: Event) {
    const target = event?.target as HTMLElement | null;
    const banner = target?.closest('.rounded-lg') as HTMLElement | null;
    // Use optional chaining and Element.remove()
    banner?.remove?.();
  }
}
