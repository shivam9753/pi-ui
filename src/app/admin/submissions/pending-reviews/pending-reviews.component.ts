
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardAction, SubmissionCardComponent } from '../../../submission-card/submission-card.component';
import { BackendService } from '../../../services/backend.service';

@Component({
  selector: 'app-pending-reviews',
  imports: [SubmissionCardComponent, CommonModule, FormsModule],
  templateUrl: './pending-reviews.component.html',
  styleUrl: './pending-reviews.component.css'
})
export class PendingReviewsComponent implements OnInit {
  submissions: any[] = [];
  currentPage: number = 1;
  pageSize: number = 12;
  totalSubmissions: number = 0;
  totalPages: number = 0;
  hasMore: boolean = false;
  loading: boolean = false;

  // Enhanced filtering options
  filters = {
    type: '',
    status: '', // 'pending_review' or 'in_progress' or both
    search: '',
    authorType: '', // 'new' or 'returning'
    wordLength: '', // 'quick', 'medium', 'long'
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  filterOptions = {
    types: [
      { label: 'All Types', value: '' },
      { label: 'Poem', value: 'poem' },
      { label: 'Prose', value: 'prose' },
      { label: 'Article', value: 'article' },
      { label: 'Opinion', value: 'opinion' },
      { label: 'Book Review', value: 'book_review' },
      { label: 'Cinema Essay', value: 'cinema_essay' }
    ],
    statuses: [
      { label: 'All Statuses', value: '' },
      { label: 'Pending Review', value: 'pending_review' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Needs Revision', value: 'needs_revision' },
      { label: 'Resubmitted', value: 'resubmitted' }
    ],
    authorTypes: [
      { label: 'All Authors', value: '' },
      { label: 'New Authors', value: 'new' },
      { label: 'Returning Authors', value: 'returning' }
    ],
    wordLengths: [
      { label: 'All Lengths', value: '' },
      { label: 'Quick Read', value: 'quick' },
      { label: 'Medium Read', value: 'medium' },
      { label: 'Long Read', value: 'long' }
    ],
    sortOptions: [
      { label: 'Newest First', value: 'createdAt-desc' },
      { label: 'Oldest First', value: 'createdAt-asc' },
      { label: 'Title A-Z', value: 'title-asc' },
      { label: 'Title Z-A', value: 'title-desc' }
    ]
  };

  showAdvancedFilters = false;

  // Quick filter chips state
  activeQuickFilters: string[] = [];

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {
    
  }

  ngOnInit() {
    this.loadSubmissions();
  }

  loadSubmissions(page: number = 1) {
    this.currentPage = page;
    this.loading = true;
    
    const params = this.buildQueryParams(page);
    
    // Use the enhanced backend API for pending reviews with advanced filtering
    this.backendService.getPendingReviews(params).subscribe(
      (data) => {
        this.submissions = data.pendingSubmissions || [];
        this.totalSubmissions = data.total || 0;
        this.hasMore = data.pagination?.hasMore || false;
        this.totalPages = Math.ceil(this.totalSubmissions / this.pageSize);
        this.loading = false;
      },
      (error) => {
        console.error('Error fetching pending reviews:', error);
        this.loading = false;
      }
    );
  }

  private buildQueryParams(page: number = 1) {
    const [sortBy, order] = this.filters.sortBy.includes('-') 
      ? this.filters.sortBy.split('-') 
      : [this.filters.sortBy, this.filters.sortOrder];

    const params: any = {
      limit: this.pageSize,
      skip: (page - 1) * this.pageSize,
      sortBy,
      order
    };

    // Add filters only if they have values
    if (this.filters.type) params.type = this.filters.type;
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.authorType) params.authorType = this.filters.authorType;
    if (this.filters.wordLength) params.wordLength = this.filters.wordLength;
    if (this.filters.dateFrom) params.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) params.dateTo = this.filters.dateTo;

    return params;
  }

  onFilterChange() {
    this.loadSubmissions(1); // Reset to first page when filtering
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSubmissions(page);
    }
  }

  clearFilters() {
    this.filters = {
      type: '',
      status: '',
      search: '',
      authorType: '',
      wordLength: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.loadSubmissions(1);
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  moveToProgress(submissionId: string) {
    this.backendService.moveSubmissionToProgress(submissionId, 'Moving to in progress for detailed review').subscribe(
      (response) => {
        console.log('Submission moved to progress:', response);
        // Refresh the list
        this.loadSubmissions(this.currentPage);
      },
      (error) => {
        console.error('Error moving submission to progress:', error);
      }
    );
  }

  get pages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  trackSubmission(index: number, submission: any): any {
    return submission._id || index;
  }


  // Get card action configuration
  getCardAction(): CardAction {
    return {
      label: 'Review',
      variant: 'primary'
    };
  }

  // Handle card action clicks - navigate to review submission
  onCardAction(submissionId: string) {
    this.router.navigate(['/review-submission', submissionId]);
  }

  // Quick filter methods
  applyQuickFilter(filterType: string) {
    // Toggle filter
    const index = this.activeQuickFilters.indexOf(filterType);
    if (index > -1) {
      this.activeQuickFilters.splice(index, 1);
    } else {
      this.activeQuickFilters.push(filterType);
    }
    
    // Apply filter logic
    this.applyQuickFilterLogic(filterType);
    this.loadSubmissions(1);
  }

  private applyQuickFilterLogic(filterType: string) {
    switch (filterType) {
      case 'urgent':
        if (this.activeQuickFilters.includes('urgent')) {
          this.filters.type = 'opinion';
        } else {
          this.filters.type = '';
        }
        break;
      
      case 'resubmitted':
        if (this.activeQuickFilters.includes('resubmitted')) {
          this.filters.status = 'resubmitted';
        } else {
          this.filters.status = '';
        }
        break;
      
      case 'myReviews':
        if (this.activeQuickFilters.includes('myReviews')) {
          this.filters.status = 'in_progress';
        } else {
          this.filters.status = '';
        }
        break;
      
      case 'newAuthors':
        if (this.activeQuickFilters.includes('newAuthors')) {
          this.filters.authorType = 'new';
        } else {
          this.filters.authorType = '';
        }
        break;
      
      case 'quickRead':
        if (this.activeQuickFilters.includes('quickRead')) {
          this.filters.wordLength = 'quick';
        } else {
          this.filters.wordLength = '';
        }
        break;
    }
  }

  getQuickFilterClass(filterType: string): string {
    const isActive = this.activeQuickFilters.includes(filterType);
    const baseClasses = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300';
    const activeClasses = 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
    
    return isActive ? activeClasses : baseClasses;
  }

  clearQuickFilters() {
    this.activeQuickFilters = [];
    // Reset all quick filter related filters
    this.filters.type = '';
    this.filters.status = '';
    this.filters.authorType = '';
    this.filters.wordLength = '';
    this.loadSubmissions(1);
  }

  // Get card action for move to progress
  getMoveToProgressAction(): CardAction {
    return {
      label: 'Start Review',
      variant: 'secondary'
    };
  }

  // Make Math available in template
  Math = Math;
}
