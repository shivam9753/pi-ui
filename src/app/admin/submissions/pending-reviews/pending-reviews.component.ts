
import { Component,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardAction, SubmissionCardComponent } from '../../../submission-card/submission-card.component';
import { BackendService } from '../../../services/backend.service';

@Component({
  selector: 'app-pending-reviews',
  imports: [SubmissionCardComponent, CommonModule],
  templateUrl: './pending-reviews.component.html',
  styleUrl: './pending-reviews.component.css'
})
export class PendingReviewsComponent implements OnInit {
  submissions: any[] = [];
  selectedType: string = '';
  currentPage: number = 1;
  pageSize: number = 12;
  totalSubmissions: number = 0;
  totalPages: number = 0;
  hasMore: boolean = false;
  loading: boolean = false;

  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poem', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essay', value: 'cinema_essay' },
    { label: 'Article', value: 'article' }
  ];

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {
    
  }

  ngOnInit() {
      this.getSubmissions();
  }

  getSubmissions(type: string = '', page: number = 1) {
    this.selectedType = type;
    this.currentPage = page;
    this.loading = true;
    
    const params = {
      type: type || undefined,
      limit: this.pageSize,
      skip: (page - 1) * this.pageSize
    };

    // Use the new consolidated endpoint for pending reviews
    this.backendService.getSubmissions(type || "", "pending_review", {
      limit: this.pageSize,
      skip: (page - 1) * this.pageSize,
      sortBy: 'createdAt',
      order: 'desc'
    }).subscribe(
      (data) => {
        this.submissions = data.submissions || [];
        this.totalSubmissions = data.total || 0;
        this.hasMore = data.pagination?.hasMore || false;
        this.totalPages = Math.ceil(this.totalSubmissions / this.pageSize);
        this.loading = false;
      },
      (error) => {
        console.error("Error fetching submissions", error);
        this.loading = false;
      }
    );
  }

  onFilterChange(type: string) {
    this.getSubmissions(type, 1); // Reset to first page when filtering
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.getSubmissions(this.selectedType, page);
    }
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

  // Make Math available in template
  Math = Math;
}
