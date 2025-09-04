import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BackendService } from '../../../services/backend.service';
import { HtmlSanitizerService } from '../../../services/html-sanitizer.service';
import { PublishedContent } from '../../../utilities/published-content-card/published-content-card.component';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { TypeBadgePipe } from '../../../pipes/type-badge.pipe';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  PUBLISHED_POSTS_TABLE_COLUMNS,
  createPublishedPostActions,
  SUBMISSION_BADGE_CONFIG,
  SearchableUserSelectorComponent,
  User,
  ConsistentSubmissionMobileCardComponent,
  SubmissionAction
} from '../../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';
import { SUBMISSION_STATUS, API_ENDPOINTS } from '../../../shared/constants/api.constants';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-published-posts',
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, PrettyLabelPipe, TypeBadgePipe, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent, SearchableUserSelectorComponent, ConsistentSubmissionMobileCardComponent],
  templateUrl: './published-posts.component.html',
  styleUrl: './published-posts.component.css'
})
export class PublishedPostsComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = PUBLISHED_POSTS_TABLE_COLUMNS;
  actions: TableAction[] = [];
  consistentActions: SubmissionAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  publishedSubmissions: any[] = [];
  filteredSubmissions: any[] = [];
  loading = true;
  searchTerm = '';
  selectedType = '';
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};
  quickFilter: 'published' | 'all' | 'accepted' = 'published';

  // Analytics stats
  stats: AdminPageStat[] = [];

  // Author reassignment properties
  users: User[] = [];
  selectedSubmissions = new Set<string>();
  selectedSubmissionsArray: any[] = [];
  bulkSelectedUserId: string = '';
  bulkActionLoading = false;
  showBulkActions = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  // Constants for template usage
  readonly SUBMISSION_STATUS = SUBMISSION_STATUS;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;
  totalCount = 0;
  totalPages = 0;
  hasMore = false;

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private backendService: BackendService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private htmlSanitizer: HtmlSanitizerService
  ) {}

  ngOnInit() {
    // Check for returnPage parameter in query params (for page restoration after navigation)
    this.route.queryParams.subscribe(params => {
      if (params['returnPage']) {
        const returnPage = parseInt(params['returnPage'], 10);
        if (returnPage > 0) {
          this.currentPage = returnPage;
          this.paginationConfig.currentPage = returnPage;
          // Clear the query parameter to avoid persisting it
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
        }
      }
    });
    
    this.setupTableActions();
    this.loadUsers();
    this.loadPublishedSubmissions();
  }

  setupTableActions() {
    this.actions = createPublishedPostActions(
      (post) => this.editPublishedPost(post._id),
      (post) => this.unpublishSubmission(post._id, post.title),
      (post) => this.configureAndPublish(post._id),
      (post) => this.deleteSubmission(post._id, post.title),
      (post) => this.featureContent(post._id, post.title),
      (post) => this.unfeatureContent(post._id, post.title)
    );
    
    // Setup consistent actions for mobile cards
    this.consistentActions = [
      {
        label: 'Edit',
        color: 'primary',
        handler: (post) => this.editPublishedPost(post._id)
      },
      {
        label: 'Feature',
        color: 'warning',
        handler: (post) => this.featureContent(post._id, post.title)
      },
      {
        label: 'View',
        color: 'secondary',
        handler: (post) => this.viewContent(post)
      }
    ];
  }

  loadPublishedSubmissions() {
    this.loading = true;
    
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    // Build parameters including filters
    const params: any = {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: this.currentFilters.sortBy || 'reviewedAt',
      order: this.currentFilters.order || 'desc'
    };

    // Add type filter if selected
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      params.type = this.currentFilters.type.trim();
    }

    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      params.search = this.currentFilters.search.trim();
    }

    // Add status filter based on quick filter
    if (this.quickFilter === 'published') {
      params.status = 'published';
    } else if (this.quickFilter === 'accepted') {
      params.status = 'accepted';
    }
    // For 'all', don't add status filter to get all submissions
    
    // Choose the appropriate API endpoint based on quick filter
    const apiCall = this.quickFilter === 'published' 
      ? this.backendService.getPublishedContent(params.type || '', params)
      : this.backendService.getSubmissions(params);
    
    apiCall.subscribe({
      next: (data: any) => {
        this.publishedSubmissions = data.submissions || data.data || [];
        this.filteredSubmissions = data.submissions || data.data || [];
        this.totalCount = data.total || data.pagination?.total || 0;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);
        this.hasMore = data.pagination?.hasMore || false;
        this.updatePaginationConfig();
        this.calculateStats();
        this.loading = false;
      },
      error: (err: any) => {
        this.showError('Failed to load submissions');
        this.loading = false;
      }
    });
  }

  setQuickFilter(filter: 'published' | 'all' | 'accepted') {
    this.quickFilter = filter;
    this.currentPage = 1; // Reset to first page
    this.loadPublishedSubmissions();
  }

  getAvailableStatuses() {
    switch (this.quickFilter) {
      case 'published':
        return [SUBMISSION_STATUS.PUBLISHED];
      case 'accepted':
        return [SUBMISSION_STATUS.ACCEPTED];
      case 'all':
        return [
          SUBMISSION_STATUS.SUBMITTED,
          SUBMISSION_STATUS.PENDING_REVIEW,
          SUBMISSION_STATUS.IN_PROGRESS,
          SUBMISSION_STATUS.SHORTLISTED,
          SUBMISSION_STATUS.ACCEPTED,
          SUBMISSION_STATUS.PUBLISHED,
          SUBMISSION_STATUS.REJECTED,
          SUBMISSION_STATUS.NEEDS_REVISION
        ];
      default:
        return [SUBMISSION_STATUS.PUBLISHED, SUBMISSION_STATUS.ACCEPTED];
    }
  }

  // Navigate to publishing interface for editing
  editPublishedPost(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId], {
      queryParams: { 
        returnPage: this.currentPage,
        returnUrl: '/admin#published-posts'
      }
    });
  }

  // View published content
  viewContent(post: any) {
    if (post.slug) {
      window.open(`/${post.submissionType}/${post.slug}`, '_blank');
    }
  }

  // Configure and publish a submission (for accepted but unpublished items)
  configureAndPublish(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId], {
      queryParams: { 
        returnPage: this.currentPage,
        returnUrl: '/admin#published-posts'
      }
    });
  }

  // Navigate to publishing interface for editing (alias)
  editSubmission(submission: any) {
    this.editPublishedPost(submission._id);
  }

  // Unpublish a submission (move back to accepted)
  unpublishSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to unpublish "${title}"? This will move it back to accepted status.`)) {
      return;
    }

    this.backendService.unpublishSubmission(submissionId, 'Unpublished by admin').subscribe({
      next: (response) => {
        this.showSuccess('Submission unpublished successfully and moved to accepted status');
        // Update the local state instead of refreshing the entire list
        const submission = this.publishedSubmissions.find(sub => sub._id === submissionId);
        if (submission) {
          submission.status = SUBMISSION_STATUS.ACCEPTED; // Change status to show different buttons
        }
      },
      error: (err) => {
        this.showError('Failed to unpublish submission');
      }
    });
  }

  // Delete a submission permanently
  deleteSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently DELETE "${title}"? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation for delete
    if (!confirm('This will permanently delete the submission and all its content. Are you absolutely sure?')) {
      return;
    }

    this.backendService.deleteSubmission(submissionId).subscribe({
      next: (response) => {
        this.showSuccess('Submission deleted successfully');
        this.loadPublishedSubmissions(); // Refresh the list
      },
      error: (err) => {
        this.showError('Failed to delete submission');
      }
    });
  }

  // Navigate to view the published post (alias)
  viewSubmission(submission: any) {
    if (submission.slug) {
      this.viewPost(submission.slug);
    } else {
      this.router.navigate(['/read', submission._id]);
    }
  }

  // Navigate to view the published post
  viewPost(slug: string) {
    this.router.navigate(['/post', slug]);
  }

  // Note: Since we're doing server-side pagination, filtering is handled server-side
  // For client-side filtering within the current page:
  get legacyFilteredSubmissions() {
    let filtered = this.publishedSubmissions;

    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.title.toLowerCase().includes(search) ||
        sub.username.toLowerCase().includes(search) ||
        (sub.description && sub.description.toLowerCase().includes(search))
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(sub => sub.submissionType === this.selectedType);
    }

    return filtered;
  }

  // Apply filters and reset to first page
  applyFilters() {
    this.currentPage = 1;
    this.loadPublishedSubmissions();
  }

  // Get unique submission types for filter
  get submissionTypes() {
    const typesSet = new Set(this.publishedSubmissions.map(sub => sub.submissionType));
    const types = Array.from(typesSet);
    return types.sort();
  }

  // Get current page info for display
  getCurrentPageInfo() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
    return { start, end, total: this.totalCount };
  }

  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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

  showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  showError(message: string) {
    this.showToast(message, 'error');
  }

  // Refresh the submissions list
  refreshList() {
    this.currentPage = 1;
    this.loadPublishedSubmissions();
  }

  // Pagination methods
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPublishedSubmissions();
  }

  nextPage() {
    if (this.hasMore) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  // Get page numbers for pagination display
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Handle card click for published content
  onContentCardClick(content: PublishedContent) {
    // For admin interface, navigate to edit the post
    this.editPublishedPost(content._id || '');
  }

  // Helper method to get time ago
  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  // Clean HTML from description
  getCleanDescription(submission: any): string {
    return this.htmlSanitizer.getCleanDescription(
      submission?.excerpt, 
      submission?.description, 
      'No description available'
    );
  }

  // Get author name with fallback
  getAuthorName(submission: any): string {
    // First try to get actual name fields
    const name = submission.username || 
                 submission.authorName || 
                 submission.author?.username || 
                 submission.author?.name || 
                 submission.submitterName || 
                 submission.userId?.name ||
                 submission.userId?.username ||
                 submission.submitterEmail ||
                 submission.author?.email ||
                 submission.userId?.email ||
                 submission.email;
    
    // If we got an email address, try to extract a more readable name
    if (name && name.includes('@')) {
      // Extract the part before @ and make it more readable
      const emailPart = name.split('@')[0];
      // Replace dots and underscores with spaces, capitalize first letter
      return emailPart
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return name || 'Unknown Author';
  }

  // Truncate description for display
  getTruncatedDescription(submission: any, maxLength: number = 100): string {
    const cleanDesc = this.getCleanDescription(submission);
    return this.htmlSanitizer.truncateText(cleanDesc, maxLength);
  }

  // Table management methods
  updatePaginationConfig() {
    this.paginationConfig = {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      pageSize: this.itemsPerPage,
      totalItems: this.totalCount
    };
  }

  calculateStats() {
    if (!this.publishedSubmissions.length) {
      this.stats = [];
      return;
    }

    const totalViews = this.publishedSubmissions.reduce((sum, submission) => {
      return sum + (submission.viewCount || 0);
    }, 0);

    const averageViews = this.publishedSubmissions.length > 0 
      ? Math.round(totalViews / this.publishedSubmissions.length) 
      : 0;

    const trendingPosts = this.publishedSubmissions.filter(submission => {
      const recentViews = submission.recentViews || 0;
      const totalViews = submission.viewCount || 0;
      return recentViews >= 10 && totalViews > 0 && (recentViews / totalViews) >= 0.3;
    }).length;

    const featuredCount = this.publishedSubmissions.filter(submission => 
      submission.featured === true
    ).length;

    this.stats = [
      {
        label: 'Total Published',
        value: this.totalCount.toLocaleString(),
        color: '#3b82f6'
      },
      {
        label: 'Total Views',
        value: totalViews.toLocaleString(),
        color: '#10b981'
      },
      {
        label: 'Avg Views/Post',
        value: averageViews.toLocaleString(),
        color: '#f59e0b'
      },
      {
        label: 'Trending Posts',
        value: trendingPosts.toString(),
        color: '#ef4444'
      },
      {
        label: 'Featured Content',
        value: featuredCount.toString(),
        color: '#8b5cf6'
      }
    ];
  }

  onTablePageChange(page: number) {
    this.currentPage = page;
    this.loadPublishedSubmissions();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentFilters.sortBy = event.column;
    this.currentFilters.order = event.direction;
    this.currentPage = 1; // Reset to first page when sorting
    this.loadPublishedSubmissions(); // Reload data with new sorting
  }

  trackBySubmissionId(index: number, submission: any): string {
    return submission._id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadPublishedSubmissions(); // Reload data with server-side filtering
  }

  // Feature content (mark as featured)
  featureContent(contentId: string, title: string) {
    if (!confirm(`Are you sure you want to mark "${title}" as featured? This will highlight it on the platform.`)) {
      return;
    }

    this.backendService.featureContent(contentId).subscribe({
      next: (response) => {
        this.showSuccess('Content marked as featured successfully');
        // Update the local state
        const content = this.publishedSubmissions.find(sub => sub._id === contentId);
        if (content) {
          content.isFeatured = true;
          content.featuredAt = new Date().toISOString();
        }
      },
      error: (err) => {
        this.showError('Failed to feature content: ' + (err.error?.message || err.message));
      }
    });
  }

  // Unfeature content (remove featured status)
  unfeatureContent(contentId: string, title: string) {
    if (!confirm(`Are you sure you want to remove featured status from "${title}"?`)) {
      return;
    }

    this.backendService.unfeatureContent(contentId).subscribe({
      next: (response) => {
        this.showSuccess('Featured status removed successfully');
        // Update the local state
        const content = this.publishedSubmissions.find(sub => sub._id === contentId);
        if (content) {
          content.isFeatured = false;
          content.featuredAt = null;
        }
      },
      error: (err) => {
        this.showError('Failed to unfeature content: ' + (err.error?.message || err.message));
      }
    });
  }

  // Load users for author reassignment
  loadUsers() {
    this.backendService.getUsers({}).subscribe({
      next: (response: any) => {
        this.users = response.users || response.data || [];
      },
      error: (err: any) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  // Selection management
  onSelectionChange(selectedItems: any[]) {
    this.selectedSubmissionsArray = selectedItems;
    this.selectedSubmissions.clear();
    selectedItems.forEach(item => this.selectedSubmissions.add(item._id));
    this.showBulkActions = this.selectedSubmissions.size > 0;
  }

  clearSelection() {
    this.selectedSubmissions.clear();
    this.selectedSubmissionsArray = [];
    this.showBulkActions = false;
    this.bulkSelectedUserId = '';
  }

  // Bulk author reassignment
  bulkReassignUser() {
    if (!this.bulkSelectedUserId || this.selectedSubmissions.size === 0) {
      return;
    }

    const selectedUser = this.users.find(u => u._id === this.bulkSelectedUserId);
    const confirmMsg = `Are you sure you want to reassign ${this.selectedSubmissions.size} submission(s) to ${selectedUser?.name || 'selected user'}?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    this.bulkActionLoading = true;
    const submissionIds = Array.from(this.selectedSubmissions);
    const headers = this.getAuthHeaders();
    
    this.http.put(`${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.SUBMISSIONS.BULK_REASSIGN}`, {
      submissionIds,
      newUserId: this.bulkSelectedUserId
    }, { headers }).subscribe({
      next: (response: any) => {
        this.showMessage(
          `Successfully reassigned ${this.selectedSubmissions.size} submission(s) to ${selectedUser?.name || 'selected user'}`,
          'success'
        );
        this.clearSelection();
        this.loadPublishedSubmissions();
        this.bulkActionLoading = false;
      },
      error: (err: any) => {
        this.showMessage(err.error?.message || 'Failed to reassign submissions', 'error');
        this.bulkActionLoading = false;
      }
    });
  }

  // Get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const jwtToken = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    });
  }

  // Show message helper
  showMessage(text: string, type: 'success' | 'error' | 'info') {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

}
