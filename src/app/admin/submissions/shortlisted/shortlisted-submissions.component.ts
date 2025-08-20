import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { BackendService } from '../../../services/backend.service';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  PENDING_REVIEWS_TABLE_COLUMNS,
  createPendingReviewActions,
  SUBMISSION_BADGE_CONFIG
} from '../../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';

@Component({
  selector: 'app-shortlisted-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent, PrettyLabelPipe],
  templateUrl: './shortlisted-submissions.component.html',
  styles: [`
    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }
  `]
})
export class ShortlistedSubmissionsComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = PENDING_REVIEWS_TABLE_COLUMNS;
  actions: TableAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 12,
    totalItems: 0
  };

  submissions: any[] = [];
  loading: boolean = false;

  // Filter properties
  currentFilters: SimpleFilterOptions = {};

  // Header stats
  headerStats: AdminPageStat[] = [
    {
      label: 'Total Shortlisted',
      value: '0',
      color: 'blue'
    },
    {
      label: 'This Week',
      value: '0',
      color: 'green'
    },
    {
      label: 'Avg. Review Time',
      value: '0d',
      color: 'purple'
    }
  ];

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupTableActions();
    this.loadShortlistedSubmissions();
  }

  setupTableActions() {
    this.actions = createPendingReviewActions((submission: any) => {
      this.router.navigate(['/review-submission', submission._id]);
    });
  }

  loadShortlistedSubmissions() {
    this.loading = true;
    
    const params: any = {
      status: 'shortlisted',
      limit: this.paginationConfig.pageSize,
      skip: (this.paginationConfig.currentPage - 1) * this.paginationConfig.pageSize,
      sortBy: this.currentFilters.sortBy || 'createdAt',
      order: this.currentFilters.order || 'desc'
    };

    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      params.search = this.currentFilters.search.trim();
    }

    // Add type filter if selected
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      params.submissionType = this.currentFilters.type;
    }

    this.backendService.getSubmissions(params).subscribe({
      next: (response: any) => {
        this.submissions = response.submissions || [];
        this.paginationConfig.totalItems = response.total || 0;
        this.paginationConfig.totalPages = Math.ceil(this.paginationConfig.totalItems / this.paginationConfig.pageSize);
        
        // Update header stats
        this.updateHeaderStats(response);
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading shortlisted submissions:', error);
        this.loading = false;
      }
    });
  }

  updateHeaderStats(response: any) {
    this.headerStats[0].value = (response.total || 0).toString();
    
    // Calculate submissions from this week
    const thisWeekCount = this.submissions.filter(sub => {
      const submissionDate = new Date(sub.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return submissionDate >= weekAgo;
    }).length;
    
    this.headerStats[1].value = thisWeekCount.toString();
  }

  handleAction(event: any) {
    const { action, item } = event;
    
    switch (action.id) {
      case 'review':
        this.router.navigate(['/review-submission', item._id]);
        break;
      case 'approve':
        this.updateSubmissionStatus(item._id, 'approved');
        break;
      case 'reject':
        this.updateSubmissionStatus(item._id, 'rejected');
        break;
      case 'needs_changes':
        this.updateSubmissionStatus(item._id, 'needs_changes');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  updateSubmissionStatus(submissionId: string, newStatus: string) {
    this.backendService.updateSubmissionStatus(submissionId, newStatus).subscribe({
      next: (response) => {
        console.log('Submission status updated:', response);
        this.loadShortlistedSubmissions(); // Reload data
      },
      error: (error) => {
        console.error('Error updating submission status:', error);
      }
    });
  }

  onPageChange(event: any) {
    this.paginationConfig.currentPage = typeof event === 'number' ? event : event.target?.value || 1;
    this.loadShortlistedSubmissions();
  }

  getAuthorName(submission: any): string {
    return submission.authorName || submission.user?.name || submission.user?.username || 'Unknown Author';
  }

  getTruncatedDescription(submission: any, maxLength: number = 80): string {
    const description = submission.description || submission.content || '';
    if (description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  getBadgeClass(value: string): string {
    const key = value?.toLowerCase() || '';
    return (this.badgeConfig as any)[key] || 'tag tag-gray';
  }

  trackBySubmissionId(index: number, submission: any): string {
    return submission._id || submission.id || index.toString();
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.paginationConfig.currentPage = 1; // Reset to first page when filtering
    this.loadShortlistedSubmissions();
  }
}