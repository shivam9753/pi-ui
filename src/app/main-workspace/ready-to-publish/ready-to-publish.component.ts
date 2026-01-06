import { Component, OnInit } from '@angular/core';
import { CommonModule} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';
import { ConsistentSubmissionMobileCardComponent, ContentCardData, createReadyToPublishActions, DataTableComponent, PaginationConfig, READY_TO_PUBLISH_TABLE_COLUMNS, SimpleFilterOptions, SimpleSubmissionFilterComponent, SUBMISSION_BADGE_CONFIG, SubmissionAction, SubmissionMobileCardComponent, TableAction, TableColumn } from '../../shared/components';
import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-ready-to-publish',
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent, DataTableComponent, ConsistentSubmissionMobileCardComponent, SimpleSubmissionFilterComponent, SubmissionMobileCardComponent],
  templateUrl: './ready-to-publish.component.html',
  styleUrl: './ready-to-publish.component.css'
})
export class ReadyToPublishComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = READY_TO_PUBLISH_TABLE_COLUMNS;
  actions: TableAction[] = [];
  consistentActions: SubmissionAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 50,
    totalItems: 0
  };

  acceptedSubmissions: any[] = [];
  filteredSubmissions: any[] = [];
  loading = true;
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupTableActions();
    this.loadAcceptedSubmissions();
  }

  setupTableActions() {
    this.actions = createReadyToPublishActions(
      (submission) => this.configurePublishing(submission._id || submission.id)
    );
    
    // Setup consistent actions for mobile cards
    this.consistentActions = [
      {
        label: 'Configure & Publish',
        color: 'primary',
        handler: (submission) => this.configurePublishing(submission._id || submission.id)
      }
    ];
  }

  // Load accepted submissions
  loadAcceptedSubmissions() {
    this.loading = true;
    
    // Build API parameters from current filters, pagination, and sorting
    const apiParams: any = {
      status: "accepted",
      limit: this.paginationConfig.pageSize,
      skip: (this.paginationConfig.currentPage - 1) * this.paginationConfig.pageSize,
      sortBy: this.currentFilters.sortBy || 'reviewedAt',
      order: this.currentFilters.order || 'desc'
    };
    
    // Add type filter if selected
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      apiParams.type = this.currentFilters.type.trim();
    }
    
    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      apiParams.search = this.currentFilters.search.trim();
    }
    
    // Use the submissions endpoint for publish queue data
    this.backendService.getSubmissions({
      ...apiParams,
      status: 'approved' // Ready to publish submissions are approved ones
    }).subscribe({
      next: (data: any) => {
        // Handle optimized response structure
        this.acceptedSubmissions = data.submissions || [];
        this.filteredSubmissions = this.acceptedSubmissions; // Use API response directly
        
        // Update pagination from API response
        if (data.pagination) {
          this.paginationConfig = {
            currentPage: data.pagination.currentPage || 1,
            totalPages: data.pagination.totalPages || 1,
            pageSize: data.pagination.limit || 50,
            totalItems: data.total || 0
          };
        }
        
        this.loading = false;
      },
      error: (err: any) => {
        this.showError('Failed to load submissions');
        this.loading = false;
      }
    });
  }

  getAuthorInitials(tell: any) {

  }

  // Configure publishing - navigate to publishing interface
  configurePublishing(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId]);
  }


  // Get card action configuration
  getCardAction() {
    return {
      label: 'Configure & Publish',
      variant: 'outline'
    };
  }

  // Get card actions for content cards
  getCardActions() {
    return [
      {
        label: 'Configure Publishing',
        handler: (content: ContentCardData) => this.configurePublishing(content.id),
        class: 'px-3 py-1 text-sm rounded border border-primary text-primary hover:bg-primary-light'
      }
    ];
  }

  // Convert submission to ContentCardData format
  convertToContentCardData(submission: any): ContentCardData {
    return {
      id: submission._id || submission.id,
      title: submission.title,
      description: submission?.description || submission?.excerpt,
      excerpt: submission?.excerpt,
      author: submission.userId ? { 
        id: submission.userId._id || submission.userId.id || 'unknown',
        name: submission.userId.name || submission.userId.username || 'Unknown',
        profileImage: submission.userId.profileImage
      } : undefined,
      submissionType: submission.submissionType,
      status: submission.status,
      createdAt: submission.createdAt,
      publishedAt: submission.publishedAt,
      imageUrl: submission.imageUrl,
      tags: submission.tags,
      readingTime: submission.readingTime,
      isFeatured: submission.isFeatured
    };
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

  // Show success message
  showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  // Show error message  
  showError(message: string) {
    this.showToast(message, 'error');
  }

  // Refresh the submissions list
  refreshList() {
    this.loadAcceptedSubmissions();
  }

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Table management methods
  updatePaginationConfig(totalItems?: number) {
    const items = totalItems ?? this.filteredSubmissions.length;
    this.paginationConfig = {
      ...this.paginationConfig,
      totalItems: items,
      totalPages: Math.ceil(items / this.paginationConfig.pageSize)
    };
  }

  onTablePageChange(page: number) {
    this.paginationConfig.currentPage = page;
    this.loadAcceptedSubmissions();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: event.column,
      order: event.direction
    };
    this.paginationConfig.currentPage = 1; // Reset to first page when sorting
    this.loadAcceptedSubmissions(); // Reload data with new sorting
  }

  // Helper methods for table display
  getAuthorName(submission: any): string {
    return submission.userId?.name ||
           submission.userId?.username ||
           submission.username || 
           submission.authorName || 
           submission.author?.username || 
           submission.author?.name || 
           submission.submitterName || 
           'Unknown Author';
  }

  getTruncatedDescription(submission: any, maxLength: number = 100): string {
    const desc = submission?.description || submission?.excerpt || '';
    if (!desc) return 'No description available';
    return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
  }

  trackBySubmissionId(index: number, submission: any): string {
    return submission._id || submission.id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = { ...filters };
    
    // Update sorting if provided in filters
    if (filters.sortBy) {
      // sortBy is handled in loadAcceptedSubmissions
    }
    if (filters.order) {
      // order is handled in loadAcceptedSubmissions
    }
    
    this.paginationConfig.currentPage = 1; // Reset to first page when filtering
    this.loadAcceptedSubmissions(); // Reload data with new filters
  }

  applyFilters() {
    this.filteredSubmissions = this.acceptedSubmissions.filter(submission => {
      let matchesStatus = true;
      let matchesType = true;

      if (this.currentFilters.status) {
        matchesStatus = submission.status === this.currentFilters.status;
      }

      if (this.currentFilters.type) {
        matchesType = submission.submissionType === this.currentFilters.type;
      }

      return matchesStatus && matchesType;
    });

    this.updatePaginationConfig();
  }
}
