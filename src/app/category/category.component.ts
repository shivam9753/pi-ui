import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';

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
  visibleItemsCount: number = 12;
  loadMoreIncrement: number = 12;

  // Category display labels
  categoryLabels: { [key: string]: string } = {
    'poem': 'Poems',
    'story': 'Stories',
    'article': 'Articles',
    'quote': 'Quotes',
    'cinema_essay': 'Cinema Essays'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.category = params['category'];
      this.loadCategoryContent();
    });
  }

  loadCategoryContent() {
    this.loading = true;
    this.backendService.getPublishedContentByType(this.category, {
      limit: 50, // Load more initially
      sortBy: 'createdAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        this.submissions = data.submissions || [];
        this.loading = false;
      },
      error: (error) => {
        this.submissions = [];
        this.loading = false;
      }
    });
  }

  getCategoryDisplayName(): string {
    return this.categoryLabels[this.category] || this.category.charAt(0).toUpperCase() + this.category.slice(1);
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

  // Get submissions for display with pagination
  getDisplaySubmissions() {
    return this.submissions.slice(0, this.visibleItemsCount);
  }

  // Load more submissions
  loadMore() {
    this.visibleItemsCount += this.loadMoreIncrement;
  }

  // Check if there are more items to load
  hasMoreItems(): boolean {
    return this.visibleItemsCount < this.submissions.length;
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
}