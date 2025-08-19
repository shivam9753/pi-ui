import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { CommonUtils } from '../shared/utils';

@Component({
  selector: 'app-tag',
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.css'
})
export class TagComponent implements OnInit {
  tag: string = '';
  submissions: any[] = [];
  loading: boolean = true;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.tag = params['tag'];
      this.loadTagContent();
    });
  }

  loadTagContent() {
    this.loading = true;
    this.currentPage = 1; // Reset to first page
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    this.backendService.getPublishedContentByTag(this.tag, {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: 'createdAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        this.submissions = data.contents || [];
        this.totalItems = data.total || 0;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tagged content:', error);
        this.submissions = [];
        this.totalItems = 0;
        this.totalPages = 0;
        this.loading = false;
      }
    });
  }

  getTagDisplayName(): string {
    return CommonUtils.capitalizeFirstOnly(this.tag);
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
    
    this.backendService.getPublishedContentByTag(this.tag, {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: 'createdAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        this.submissions = data.contents || [];
        this.totalItems = data.total || 0;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tagged content:', error);
        this.submissions = [];
        this.totalItems = 0;
        this.totalPages = 0;
        this.loading = false;
      }
    });
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