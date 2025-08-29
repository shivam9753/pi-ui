import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { ViewTrackerService } from '../services/view-tracker.service';
import { CommonUtils } from '../shared/utils';

@Component({
  selector: 'app-category',
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit {
  category: string = '';
  submissions: any[] = [];
  loading: boolean = true;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalItems: number = 0;
  totalPages: number = 0;

  // Category display labels
  categoryLabels: { [key: string]: string } = {
    'poem': 'Poems',
    'prose': 'Prose',
    'article': 'Articles',
    'cinema_essay': 'Cinema Essays',
    'book_review': 'Book Reviews',
    'popular': 'Popular This Week'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private viewTrackerService: ViewTrackerService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.category = params['category'];
      this.loadCategoryContent();
    });
  }

  loadCategoryContent() {
    this.loading = true;
    this.currentPage = 1; // Reset to first page
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    if (this.category === 'popular') {
      // Use trending API for popular category
      this.viewTrackerService.getTrendingPosts(this.itemsPerPage, skip).subscribe({
        next: (data) => {
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.loading = false;
        },
        error: (error) => {
          this.submissions = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.loading = false;
        }
      });
    } else {
      // Use regular content API for other categories
      this.backendService.getPublishedContentByType(this.category, {
        limit: this.itemsPerPage,
        skip: skip,
        sortBy: 'createdAt',
        order: 'desc'
      }).subscribe({
        next: (data) => {
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.loading = false;
        },
        error: (error) => {
          this.submissions = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.loading = false;
        }
      });
    }
  }

  getCategoryDisplayName(): string {
    return this.categoryLabels[this.category] || CommonUtils.capitalizeFirstOnly(this.category);
  }

  openSubmission(submission: any) {
    // Navigate to the reading interface with SEO slug or fallback to ID
    if (submission.slug) {
      this.router.navigate(['/post', submission.slug]);
    } else if (submission.seo?.slug) {
      this.router.navigate(['/post', submission.seo.slug]);
    } else {
      // Fallback to ID if no slug available
      this.router.navigate(['/read', submission._id]);
    }
  }

  // Load specific page
  loadPage(page: number) {
    this.loading = true;
    this.currentPage = page;
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    if (this.category === 'popular') {
      // Use trending API for popular category
      this.viewTrackerService.getTrendingPosts(this.itemsPerPage, skip).subscribe({
        next: (data) => {
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.loading = false;
        },
        error: (error) => {
          this.submissions = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.loading = false;
        }
      });
    } else {
      // Use regular content API for other categories
      this.backendService.getPublishedContentByType(this.category, {
        limit: this.itemsPerPage,
        skip: skip,
        sortBy: 'createdAt',
        order: 'desc'
      }).subscribe({
        next: (data) => {
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.loading = false;
        },
        error: (error) => {
          this.submissions = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.loading = false;
        }
      });
    }
  }

  // Navigate to specific page
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadPage(page);
      // Scroll to top of main content area
      setTimeout(() => {
        const contentElement = document.querySelector('.min-h-screen') || document.querySelector('.max-w-7xl');
        if (contentElement) {
          contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Clean content for display (same as explore component)
  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div>/g, '')           // Remove opening div tags
      .replace(/<\/div>/g, '<br>')     // Convert closing div tags to line breaks
      .replace(/<br\s*\/?>/g, '<br>')  // Normalize br tags
      .replace(/&nbsp;/g, ' ')         // Convert non-breaking spaces
      .replace(/&amp;/g, '&')          // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();                         // Remove leading/trailing whitespace
  }

  // Navigate back to explore
  goBackToExplore() {
    this.router.navigate(['/explore']);
  }

  // Make Math available in template
  Math = Math;
}