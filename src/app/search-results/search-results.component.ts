import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { FormsModule } from '@angular/forms';
import { ContentCardComponent } from '../shared/components/content-card/content-card.component';

@Component({
  selector: 'app-search-results',
  imports: [CommonModule, RouterModule, FormsModule, ContentCardComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css'
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private backendService = inject(BackendService);

  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  isLoading = signal(false);
  totalResults = signal(0);
  currentPage = signal(1);
  resultsPerPage = 20;
  hasError = signal(false);
  errorMessage = signal('');

  newSearchQuery = '';

  ngOnInit() {
    // Subscribe to route query parameters
    this.route.queryParams.subscribe(params => {
      const query = params['q'] || '';
      if (query) {
        this.searchQuery.set(query);
        this.newSearchQuery = query;
        this.performSearch(query);
      }
    });
  }

  performSearch(query: string, page: number = 1) {
    if (!query.trim()) return;

    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    const skip = (page - 1) * this.resultsPerPage;

    this.backendService.getSubmissions({
      search: query.trim(),
      status: 'published',
      limit: this.resultsPerPage,
      skip: skip,
      sortBy: 'publishedAt',
      order: 'desc'
    }).subscribe({
      next: (response) => {
        const resultsCount = response.total || 0;
        this.searchResults.set(response.submissions || []);
        this.totalResults.set(resultsCount);
        this.currentPage.set(page);
        this.isLoading.set(false);

        // Track the search for analytics (only on first page to avoid duplicates)
        if (page === 1) {
          this.trackSearchAnalytics(query, resultsCount);
        }
      },
      error: (error) => {
        console.error('Search error:', error);
        this.hasError.set(true);
        this.errorMessage.set('Failed to perform search. Please try again.');
        this.isLoading.set(false);

        // Track failed search as well
        if (page === 1) {
          this.trackSearchAnalytics(query, 0);
        }
      }
    });
  }

  onNewSearch() {
    if (this.newSearchQuery.trim()) {
      this.router.navigate(['/search'], { 
        queryParams: { q: this.newSearchQuery.trim() } 
      });
    }
  }

  onPageChange(page: number) {
    const query = this.searchQuery();
    if (query) {
      this.performSearch(query, page);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalResults() / this.resultsPerPage);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const pages: number[] = [];
    
    // Show up to 5 pages around current page
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  clearSearch() {
    this.newSearchQuery = '';
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.router.navigate(['/search']);
  }

  onCardClick(content: any) {
    // Navigate to reading interface using slug if available, otherwise use ID
    const route = content.slug ? `/post/${content.slug}` : `/read/${content._id}`;
    this.router.navigate([route]);
  }

  private trackSearchAnalytics(query: string, resultsCount: number) {
    // Track search for analytics purposes
    this.backendService.trackSearch({
      query: query.trim(),
      source: 'search-results',
      resultsCount: resultsCount
    }).subscribe({
      next: () => {
        // Search tracked successfully (silent success)
      },
      error: (error) => {
        // Silently handle tracking errors to not disrupt user experience
        console.warn('Search tracking failed:', error);
      }
    });
  }
}
