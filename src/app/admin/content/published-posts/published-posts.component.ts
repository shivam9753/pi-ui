import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  SUBMISSION_BADGE_CONFIG
} from '../../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';
import { SUBMISSION_STATUS } from '../../../shared/constants/api.constants';


@Component({
  selector: 'app-published-posts',
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, PrettyLabelPipe, TypeBadgePipe, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent],
  templateUrl: './published-posts.component.html',
  styleUrl: './published-posts.component.css'
})
export class PublishedPostsComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = PUBLISHED_POSTS_TABLE_COLUMNS;
  actions: TableAction[] = [];
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
    let typeFilter = '';
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      typeFilter = this.currentFilters.type;
    }

    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      params.search = this.currentFilters.search.trim();
    }
    
    // Load published submissions with server-side filtering
    this.backendService.getPublishedContent(typeFilter, params).subscribe({
      next: (data) => {
        this.publishedSubmissions = data.submissions || [];
        this.filteredSubmissions = data.submissions || []; // Use server-filtered data directly
        this.totalCount = data.total || 0;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);
        this.hasMore = data.pagination?.hasMore || false;
        this.updatePaginationConfig();
        this.loading = false;
      },
      error: (err) => {
        this.showError('Failed to load published submissions');
        this.loading = false;
      }
    });
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
    return submission.username || 
           submission.authorName || 
           submission.author?.username || 
           submission.author?.name || 
           submission.submitterName || 
           'Unknown Author';
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


}
