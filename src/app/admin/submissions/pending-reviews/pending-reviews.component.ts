
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentCardComponent, ContentCardData } from '../../../shared/components/content-card/content-card.component';
import { FilterBarComponent, FilterConfig, FilterState, QuickFilterConfig } from '../../../shared/components/filter-bar/filter-bar.component';
import { BackendService } from '../../../services/backend.service';

@Component({
  selector: 'app-pending-reviews',
  imports: [ContentCardComponent, CommonModule, FormsModule, FilterBarComponent],
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
  filters: FilterState = {
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

  // Filter configuration for FilterBarComponent
  filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search submissions...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'needs_revision', label: 'Needs Revision' },
        { value: 'resubmitted', label: 'Resubmitted' }
      ]
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All Types', value: '' },
        { label: 'Poem', value: 'poem' },
        { label: 'Prose', value: 'prose' },
        { label: 'Article', value: 'article' },
        { label: 'Opinion', value: 'opinion' },
        { label: 'Book Review', value: 'book_review' },
        { label: 'Cinema Essay', value: 'cinema_essay' }
      ]
    },
    {
      key: 'authorType',
      label: 'Author Type',
      type: 'select',
      options: [
        { label: 'All Authors', value: '' },
        { label: 'New Authors', value: 'new' },
        { label: 'Returning Authors', value: 'returning' }
      ]
    },
    {
      key: 'wordLength',
      label: 'Length',
      type: 'select',
      options: [
        { label: 'All Lengths', value: '' },
        { label: 'Quick Read', value: 'quick' },
        { label: 'Medium Read', value: 'medium' },
        { label: 'Long Read', value: 'long' }
      ]
    },
    {
      key: 'createdAt',
      label: 'Date Range',
      type: 'date-range'
    }
  ];

  // Quick filters configuration
  quickFilters: QuickFilterConfig[] = [
    {
      key: 'urgent',
      label: 'Urgent',
      color: 'red'
    },
    {
      key: 'resubmitted', 
      label: 'Resubmitted',
      color: 'blue'
    },
    {
      key: 'myReviews',
      label: 'My Reviews', 
      color: 'purple'
    },
    {
      key: 'newAuthors',
      label: 'New Authors',
      color: 'green'
    },
    {
      key: 'quickRead',
      label: 'Quick Read',
      color: 'yellow'
    }
  ];

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
    const [sortBy, order] = this.filters['sortBy'].includes('-') 
      ? this.filters['sortBy'].split('-') 
      : [this.filters['sortBy'], this.filters['sortOrder']];

    const params: any = {
      limit: this.pageSize,
      skip: (page - 1) * this.pageSize,
      sortBy,
      order
    };

    // Add filters only if they have values
    if (this.filters['type']) params.type = this.filters['type'];
    if (this.filters['status']) params.status = this.filters['status'];
    if (this.filters['search']) params.search = this.filters['search'];
    if (this.filters['authorType']) params.authorType = this.filters['authorType'];
    if (this.filters['wordLength']) params.wordLength = this.filters['wordLength'];
    if (this.filters['dateFrom']) params.dateFrom = this.filters['dateFrom'];
    if (this.filters['dateTo']) params.dateTo = this.filters['dateTo'];

    return params;
  }

  onFilterChange() {
    this.loadSubmissions(1); // Reset to first page when filtering
  }

  // Handle filter changes from FilterBarComponent
  onFiltersChange(newFilters: FilterState) {
    this.filters = { ...this.filters, ...newFilters };
    this.loadSubmissions(1);
  }

  // Handle search from FilterBarComponent
  onSearchChange(searchTerm: string) {
    this.filters['search'] = searchTerm;
    this.loadSubmissions(1);
  }

  // Handle quick filter toggle from FilterBarComponent
  onQuickFilterToggle(event: {key: string, active: boolean}) {
    console.log('Quick filter toggle:', event);
    
    // Update active quick filters array
    if (event.active) {
      if (!this.activeQuickFilters.includes(event.key)) {
        this.activeQuickFilters.push(event.key);
      }
    } else {
      this.activeQuickFilters = this.activeQuickFilters.filter(f => f !== event.key);
    }
    
    this.applyQuickFilterLogic(event.key, event.active);
    this.loadSubmissions(1);
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


  // Get card actions for content cards
  getCardActions() {
    return [
      {
        label: 'Review',
        handler: (content: ContentCardData) => this.router.navigate(['/review-submission', content.id]),
        class: 'px-3 py-1 text-sm rounded bg-orange-600 text-white hover:bg-orange-700'
      }
    ];
  }

  // Convert submission to ContentCardData format
  convertToContentCardData(submission: any): ContentCardData {
    return {
      id: submission._id || submission.id,
      title: submission.title,
      description: submission.description || submission.excerpt,
      excerpt: submission.excerpt,
      author: submission.userId ? { 
        name: submission.userId.name || submission.userId.username || 'Unknown', 
        username: submission.userId.username || ''
      } : submission.submitterName ? { 
        name: submission.submitterName,
        username: submission.submitterName
      } : undefined,
      submissionType: submission.submissionType,
      status: submission.status,
      createdAt: submission.createdAt,
      publishedAt: submission.publishedAt,
      imageUrl: submission.imageUrl,
      tags: submission.tags,
      readingTime: submission.readingTime,
      isFeatured: submission.isFeatured,
      wordCount: submission.wordCount || this.calculateWordCount(submission.description || submission.excerpt || '')
    };
  }

  // Calculate word count from text
  private calculateWordCount(text: string): number {
    if (!text) return 0;
    // Remove HTML tags and clean up text
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
    
    if (!cleanText) return 0;
    
    // Count words by splitting on whitespace
    return cleanText.split(' ').filter(word => word.length > 0).length;
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

  private applyQuickFilterLogic(filterType: string, active?: boolean) {
    const isActive = active !== undefined ? active : this.activeQuickFilters.includes(filterType);
    console.log('Applying quick filter logic:', filterType, 'active:', isActive);
    
    switch (filterType) {
      case 'urgent':
        this.filters['type'] = isActive ? 'opinion' : '';
        break;
      
      case 'resubmitted':
        this.filters['status'] = isActive ? 'resubmitted' : '';
        break;
      
      case 'myReviews':
        this.filters['status'] = isActive ? 'in_progress' : '';
        break;
      
      case 'newAuthors':
        this.filters['authorType'] = isActive ? 'new' : '';
        break;
      
      case 'quickRead':
        this.filters['wordLength'] = isActive ? 'quick' : '';
        break;
    }
    
    console.log('Updated filters:', this.filters);
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
    this.filters['type'] = '';
    this.filters['status'] = '';
    this.filters['authorType'] = '';
    this.filters['wordLength'] = '';
    this.loadSubmissions(1);
  }

  // Get card action for move to progress
  getMoveToProgressAction() {
    return {
      label: 'Start Review',
      variant: 'secondary'
    };
  }

  // Make Math available in template
  Math = Math;
}
