import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BackendService } from '../../../services/backend.service';
import { HtmlSanitizerService } from '../../../services/html-sanitizer.service';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
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

@Component({
  selector: 'app-featured-content',
  imports: [CommonModule, DatePipe, FormsModule, PrettyLabelPipe, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent],
  templateUrl: './featured-content.component.html',
  styleUrl: './featured-content.component.css'
})
export class FeaturedContentComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = [
    {
      key: 'title',
      label: 'Title & Author',
      type: 'custom',
      width: '40%',
      sortable: true
    },
    {
      key: 'type',
      label: 'Type',
      type: 'custom',
      width: '18%',
      sortable: true
    },
    {
      key: 'featuredAt',
      label: 'Featured Date',
      type: 'custom',
      width: '22%',
      sortable: true
    },
    {
      key: 'viewCount',
      label: 'Views',
      type: 'custom',
      width: '20%',
      sortable: true
    }
  ];
  actions: TableAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  featuredContents: any[] = [];
  loading = true;
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;
  totalCount = 0;
  totalPages = 0;
  hasMore = false;

  // Page stats
  pageStats: AdminPageStat[] = [];

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
    // Check for returnPage parameter in query params
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
    this.loadFeaturedContent();
  }

  setupTableActions() {
    this.actions = [
      {
        label: 'Feature',
        color: 'success',
        condition: (content) => !content.isFeatured,
        handler: (content) => this.featureContent(content._id, content.title)
      },
      {
        label: 'Unfeature',
        color: 'warning',
        condition: (content) => content.isFeatured,
        handler: (content) => this.unfeatureContent(content._id, content.title)
      },
      {
        label: 'View',
        color: 'secondary',
        handler: (content) => this.viewContent(content)
      }
    ];
  }

  loadFeaturedContent() {
    this.loading = true;
    
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    // Build parameters including filters
    const params: any = {
      published: true, // Only get published content
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: this.currentFilters.sortBy || 'publishedAt',
      order: this.currentFilters.order || 'desc'
    };

    // Add featured filter if specified in currentFilters
    if (this.currentFilters.featured !== undefined) {
      params.featured = this.currentFilters.featured;
    }

    // Add type filter if selected
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      params.type = this.currentFilters.type;
    }

    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      params.search = this.currentFilters.search.trim();
    }
    
    this.backendService.getContent(params).subscribe({
      next: (data) => {
        this.featuredContents = data.contents || [];
        this.totalCount = data.total || 0;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);
        this.hasMore = data.pagination?.hasMore || false;
        this.updatePaginationConfig();
        this.updatePageStats();
        this.loading = false;
      },
      error: (err) => {
        this.showError('Failed to load content: ' + (err.error?.message || err.message));
        this.loading = false;
      }
    });
  }

  updatePageStats() {
    const isFeaturedFilter = this.currentFilters.featured === true;
    this.pageStats = [
      {
        label: isFeaturedFilter ? 'Featured Content' : 'Total Content',
        value: this.totalCount.toString(),
        color: isFeaturedFilter ? 'text-yellow-600' : 'text-blue-600'
      },
      {
        label: 'Current Page',
        value: `${this.getCurrentPageInfo().start}-${this.getCurrentPageInfo().end}`,
        color: 'text-gray-600'
      }
    ];
  }


  // Feature content (mark as featured)
  featureContent(contentId: string, title: string) {
    if (!confirm(`Are you sure you want to mark "${title}" as featured? This will highlight it on the platform.`)) {
      return;
    }

    this.backendService.featureContent(contentId).subscribe({
      next: (response) => {
        this.showSuccess('Content marked as featured successfully');
        this.loadFeaturedContent(); // Refresh the list
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
        this.loadFeaturedContent(); // Refresh the list
      },
      error: (err) => {
        this.showError('Failed to unfeature content: ' + (err.error?.message || err.message));
      }
    });
  }

  // Navigate to view the published content
  viewContent(content: any) {
    // Use the new simple content reader
    this.router.navigate(['/content', content._id]);
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

  // Refresh the content list
  refreshList() {
    this.currentPage = 1;
    this.loadFeaturedContent();
  }

  // Pagination methods
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadFeaturedContent();
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
  getCleanDescription(content: any): string {
    return this.htmlSanitizer.getCleanDescription(
      content?.excerpt, 
      content?.body, 
      'No description available'
    );
  }

  // Get author name with fallback
  getAuthorName(content: any): string {
    return content.author?.username || 
           content.author?.name || 
           content.username || 
           content.authorName || 
           'Unknown Author';
  }

  // Truncate description for display
  getTruncatedDescription(content: any, maxLength: number = 100): string {
    const cleanDesc = this.getCleanDescription(content);
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
    this.loadFeaturedContent();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentFilters.sortBy = event.column;
    this.currentFilters.order = event.direction;
    this.currentPage = 1; // Reset to first page when sorting
    this.loadFeaturedContent(); // Reload data with new sorting
  }

  trackByContentId(index: number, content: any): string {
    return content._id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadFeaturedContent(); // Reload data with server-side filtering
  }

  // Set featured filter and reload
  setFeaturedFilter(featured: boolean | null) {
    if (featured === null) {
      delete this.currentFilters.featured;
    } else {
      this.currentFilters.featured = featured;
    }
    this.currentPage = 1; // Reset to first page when filtering
    this.loadFeaturedContent();
  }
}