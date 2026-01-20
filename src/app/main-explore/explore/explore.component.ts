// explore.component.ts - Add this method to your existing file

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { BackendService } from '../../services/backend.service';
import { ViewTrackerService } from '../../services/view-tracker.service';
import { Router } from '@angular/router';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';
import { ButtonComponent, TrendingAuthorsComponent } from '../../shared/components';
import { TabsComponent, TabItemComponent } from '../../ui-components';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';
import { ContentCardComponent } from '../../shared/components/content-card/content-card.component';
import { ExploreStateService } from '../../services/explore-state.service';
import { RandomArchiveComponent } from '../../shared/components/random-archive/random-archive.component';
// Removed rxjs imports for debouncing as we're not using real-time search

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, PrettyLabelPipe, ButtonComponent, TrendingAuthorsComponent, TabsComponent, TabItemComponent, BadgeLabelComponent, ContentCardComponent, RandomArchiveComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
  submissions: any[] = [];
  selectedType: string = '';
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  showSearchResults: boolean = false;
  sortBy: string = 'latest';
  loading: boolean = false;
  
  // Load more properties
  itemsPerPage: number = 7;
  totalItems: number = 0;
  hasMoreItems: boolean = true;
  isLoadingMore: boolean = false;
  
  
  // Updated filter options with better labels
  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Popular This Week', value: 'popular' },
    { label: 'Poems', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essays', value: 'cinema_essay' },
    { label: 'Articles', value: 'article' },
    { label: 'Books', value: 'book_review' }
  ];

  // Sort options
  sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Popular', value: 'popular' },
    { label: 'Reading Time', value: 'readingTime' }
  ];

  trendingTags: string[] = [];
  popularTags: string[] = [];
  loadingTags: boolean = false;
 
  generatePrompt() {
    // Navigate to prompts page or show prompt modal
    this.router.navigate(['/prompts']);
  }

  onTagClick(tag: string, event?: Event) {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // Navigate to tag page
    this.router.navigate(['/tag', tag]);
  }

  onAuthorClick(author: any) {
    // Navigate to author profile
    // You can implement navigation to author profile here
  }

  handleAnnouncementAction(announcement: any) {
    if (announcement.link) {
      this.router.navigate([announcement.link]);
    }
  }

  constructor(
    private backendService: BackendService,
    private viewTrackerService: ViewTrackerService,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private exploreStateService: ExploreStateService
  ) {}

  private popStateHandler = () => {
    // run restore shortly after popstate so Angular can re-render
    setTimeout(() => this.tryRestore(), 50);
  };

  private getScrollContainer(): HTMLElement | Document {
    // Try common container candidates in order of likelihood
    const candidates: Array<HTMLElement | Document | null> = [
      document.getElementById('main-content'),
      document.querySelector('.route-transition') as HTMLElement,
      document.querySelector('main') as HTMLElement,
      document.querySelector('.min-h-screen') as HTMLElement,
      (document.scrollingElement as HTMLElement) || null,
      document.documentElement,
      document.body
    ];

    for (const c of candidates) {
      if (!c) continue;
      try {
        const el: any = c;
        const clientH = el.clientHeight || (document.documentElement && document.documentElement.clientHeight) || window.innerHeight;
        const scrollH = el.scrollHeight || (document.documentElement && document.documentElement.scrollHeight) || 0;
        const scrollTop = el.scrollTop || 0;
        if (scrollH > clientH || scrollTop > 0) {
          return c;
        }
      } catch (e) {
        // ignore and continue
      }
    }
    // fallback
    return (document.scrollingElement as HTMLElement) || document.documentElement || document.body;
  }

  private tryRestore(attempt = 0, max = 30) {
    const s = this.exploreStateService.getState();
    if (!s || !s.scrollY) return;
    const targetY = s.scrollY || 0;
    const container: any = this.getScrollContainer();

    // If the document/container is tall enough or we've exhausted attempts, restore
    if ((container.scrollHeight || document.documentElement.scrollHeight) > targetY || attempt >= max) {
      try {
        if (container && typeof container.scrollTo === 'function') {
          container.scrollTo(0, targetY);
        } else {
          window.scrollTo(0, targetY);
        }
      } catch (e) {
        // fallback
        window.scrollTo(0, targetY);
      }
      return;
    }

    requestAnimationFrame(() => this.tryRestore(attempt + 1, max));
  }

  ngOnInit() {
    this.setupPageMeta();
    // restore state from session storage if present
    this.exploreStateService.restoreFromStorage();
    const cached = this.exploreStateService.getState();
    if (cached && cached.submissions && cached.submissions.length) {
      this.submissions = cached.submissions;
      this.itemsPerPage = cached.page ? this.itemsPerPage : this.itemsPerPage;
      this.hasMoreItems = cached.hasMore;
      this.selectedType = cached.selectedType || this.selectedType;
      this.searchQuery = cached.searchQuery || this.searchQuery;
      // do not call getPublishedSubmissions - we already have data
    } else {
      this.getPublishedSubmissions();
    }
    this.loadPopularTags();

    // subscribe to state changes so UI stays in sync
    this.exploreStateService.stateObs.subscribe(s => {
      this.submissions = s.submissions || [];
      this.hasMoreItems = s.hasMore;
    });

    // ensure we listen for browser back/forward events to trigger restore
    window.addEventListener('popstate', this.popStateHandler);
  }

  private transitionTarget: Element | null = null;
  private transitionEndHandler = (_event?: Event) => {
    // restore shortly after the transition/animation ends
    setTimeout(() => this.tryRestore(), 10);
    // remove listeners once invoked
    if (this.transitionTarget) {
      this.transitionTarget.removeEventListener('animationend', this.transitionEndHandler);
      this.transitionTarget.removeEventListener('transitionend', this.transitionEndHandler);
      this.transitionTarget = null;
    }
  };

  ngAfterViewInit() {
    // attempt to restore after initial render
    setTimeout(() => this.tryRestore(), 40);

    // also listen for route transition animation/transition end so we restore after animations
    try {
      const rt = document.querySelector('.route-transition');
      if (rt) {
        this.transitionTarget = rt;
        rt.addEventListener('animationend', this.transitionEndHandler);
        rt.addEventListener('transitionend', this.transitionEndHandler);
      }
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy() {
    try {
      window.removeEventListener('popstate', this.popStateHandler);
    } catch (e) {}

    // cleanup transition listeners if still present
    try {
      if (this.transitionTarget) {
        this.transitionTarget.removeEventListener('animationend', this.transitionEndHandler);
        this.transitionTarget.removeEventListener('transitionend', this.transitionEndHandler);
        this.transitionTarget = null;
      }
    } catch (e) {}
  }

  // Force refresh data (useful after deployment)
  forceRefresh() {
    // Clear local cache and reload data
    this.submissions = [];
    this.trendingTags = [];
    this.hasMoreItems = true;
    this.getPublishedSubmissions(this.selectedType);
    this.loadPopularTags();
  }

  private setupPageMeta() {
    this.titleService.setTitle('PoemsIndia: Explore');
    this.metaService.updateTag({
      name: 'description',
      content: 'PoemsIndia - Poetry, prose, articles, and cinema essays from contemporary voices. Year-round submissions accepted. Weekly newsletter on literature and culture.'
    });
    this.metaService.updateTag({
      property: 'og:title',
      content: 'PoemsIndia: Explore'
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: 'Poetry, prose, articles, and cinema essays from contemporary voices. Year-round submissions accepted.'
    });
  }

  // Load popular tags from the new backend API
  loadPopularTags() {
    this.loadingTags = true;
    this.backendService.getPopularTags({
      limit: 8,
      _t: Date.now() // Cache-busting timestamp
    }).subscribe({
      next: (data) => {
        // Extract tag names from the response
        this.trendingTags = data.tags || [];
        this.loadingTags = false;
      },
      error: (error) => {
        console.error('Error loading popular tags:', error);
        // Set empty array if API fails
        this.trendingTags = [];
        this.loadingTags = false;
      }
    });
  }

  getPublishedSubmissions(type: string = '') {
    this.selectedType = type;
    this.submissions = []; // Reset submissions when filtering
    this.hasMoreItems = true;

    // persist selected tab to state service
    this.exploreStateService.setState({ selectedType: this.selectedType, submissions: [], page: 1, hasMore: true });

    this.loadPublishedSubmissions(type);
  }

  loadPublishedSubmissions(type: string = '', loadMore: boolean = false) {
    if (loadMore) {
      this.isLoadingMore = true;
    } else {
      this.loading = true;
    }
    const skip = loadMore ? this.submissions.length : 0;
    const params: any = {
      limit: this.itemsPerPage,
      skip: skip,
      // Map 'latest' to publishedAt so recency uses publication time (reviewedAt/publishedAt) rather than creation time
      sortBy: this.sortBy === 'latest' ? 'publishedAt' : this.sortBy,
      order: 'desc' as 'desc',
      _t: Date.now() // Cache-busting timestamp
    };

    if (type && type !== 'popular') {
      params.type = type;
    }
    
    // update state after successful fetch
    const originalNext = (newSubmissions: any[], isLoadMore: boolean, nextPage: number, hasMore: boolean) => {
      if (isLoadMore) {
        this.exploreStateService.appendSubmissions(newSubmissions, nextPage, hasMore);
      } else {
        this.exploreStateService.setState({ submissions: newSubmissions, page: nextPage, hasMore });
      }
    };

    if (type === 'popular') {
      // Get trending posts for "Popular This Week" tab
      this.viewTrackerService.getTrendingPosts(this.itemsPerPage, skip).subscribe({
        next: (data) => {
          const newSubmissions = data.submissions || [];
          if (loadMore) {
            this.submissions = [...this.submissions, ...newSubmissions];
          } else {
            this.submissions = newSubmissions;
          }
          this.totalItems = data.total || 0;
          this.hasMoreItems = newSubmissions.length >= this.itemsPerPage;
          this.loading = false;
          this.isLoadingMore = false;
          originalNext(newSubmissions, loadMore, loadMore ? (this.exploreStateService.getState().page + 1) : 1, this.hasMoreItems);
        },
        error: (error) => {
          console.error('Error loading trending posts:', error);
          // fallback logic removed for brevity - keep existing behavior
          this.loading = false;
          this.isLoadingMore = false;
        }
      });
    } else {
      // Use optimized explore endpoint with type filtering
      const exploreParams = type ? { ...params, type } : params;
      this.backendService.getExploreContent(exploreParams).subscribe({
        next: (data) => {
          const newSubmissions = data.submissions || [];
          if (loadMore) {
            this.submissions = [...this.submissions, ...newSubmissions];
          } else {
            this.submissions = newSubmissions;
          }
          this.totalItems = data.total || 0;
          this.hasMoreItems = newSubmissions.length >= this.itemsPerPage;
          this.loading = false;
          this.isLoadingMore = false;
          originalNext(newSubmissions, loadMore, loadMore ? (this.exploreStateService.getState().page + 1) : 1, this.hasMoreItems);
        },
        error: (error) => {
          console.error('Error loading published content:', error);
          // Set empty state
          this.submissions = [];
          this.totalItems = 0;
          this.hasMoreItems = false;
          this.loading = false;
          this.isLoadingMore = false;
        }
      });
    }
  }

  // Removed onSearchInput as we're not doing real-time search

  performSearch(query: string) {
    this.isSearching = true;
    this.backendService.getSubmissions({
      search: query,
      status: 'published',
      limit: 20,
      sortBy: 'publishedAt',
      _t: Date.now() // Cache-busting timestamp
    }).subscribe({
      next: (data) => {
        this.searchResults = data.submissions || [];
        this.showSearchResults = true;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Search failed:', error);
        this.searchResults = [];
        this.isSearching = false;
        this.showSearchResults = false;
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.isSearching = false;
  }

  onSearchSubmit(event: any) {
    event.preventDefault();
    if (this.searchQuery.trim()) {
      this.performSearch(this.searchQuery.trim());
    }
  }

  onFilterChange(type: string) {
    // Clear search when changing tabs
    this.clearSearch();
    // persist selected tab and reset pagination
    this.exploreStateService.setState({ selectedType: type, submissions: [], page: 1, hasMore: true });
    this.getPublishedSubmissions(type);
  }

  // Navigate to dedicated category page
  navigateToCategory(category: string) {
    if (category && category !== '') {
      this.router.navigate(['/category', category]);
    }
  }

  openSubmission(submission: any) {
    const container: any = this.getScrollContainer();
    const scrollTop = container?.scrollTop ?? window.scrollY ?? window.pageYOffset ?? 0;
    // save current scroll and state
    this.exploreStateService.setState({ scrollY: scrollTop, selectedType: this.selectedType, searchQuery: this.searchQuery });

    // Navigate to the reading interface with SEO slug or fallback to ID
    if (submission.slug) {
      this.router.navigate(['/post', submission.slug]);
    } else if (submission.seo?.slug) {
      this.router.navigate(['/post', submission.seo.slug]);
    } else {
      this.router.navigate(['/read', submission._id]);
    }
  }

  onContentCardClick(content: any) {
    // Handle card click - same as openSubmission
    this.openSubmission(content);
  }

  // Helper method to get the selected type label
  getSelectedTypeLabel(): string {
    const selectedOption = this.filterOptions.find((option: any) => option.value === this.selectedType);
    return selectedOption ? selectedOption.label : 'works';
  }



  // Sort submissions based on selected sort option
  sortSubmissions(submissions: any[]) {
    switch (this.sortBy) {
      case 'popular':
        // Sort by creation date as proxy for popularity (can be enhanced with view counts)
        return submissions.sort((a, b) => new Date(b.createdAt || b.publishedAt || b.reviewedAt).getTime() - new Date(a.createdAt || a.publishedAt || a.reviewedAt).getTime());
      case 'readingTime':
        return submissions.sort((a, b) => (a.readingTime || 5) - (b.readingTime || 5));
      case 'latest':
      default:
        // Prefer publishedAt/reviewedAt for latest ordering, fallback to createdAt
        return submissions.sort((a, b) => new Date(b.publishedAt || b.reviewedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.reviewedAt || a.createdAt).getTime());
    }
  }

  // Handle sort change
  onSortChange(sortValue: string) {
    this.sortBy = sortValue;
    this.submissions = []; // Reset submissions
    this.hasMoreItems = true;
    this.loadPublishedSubmissions(this.selectedType);
  }


  // Helper method to format numbers (for view counts)
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return Math.floor(num / 1000000) + 'M';
    } else if (num >= 1000) {
      return Math.floor(num / 1000) + 'K';
    }
    return num.toString();
  }

  // Clean content for display (convert div tags to line breaks)
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


  // Load more functionality
  loadMoreSubmissions() {
    if (this.hasMoreItems && !this.isLoadingMore) {
      this.loadPublishedSubmissions(this.selectedType, true);
    }
  }

  // Excerpt truncation method
  getTruncatedExcerpt(submission: any, maxLength: number = 100): string {
    const content = submission?.excerpt || submission?.description || '';
    if (!content) return '';
    
    // Clean HTML and get plain text
    const cleanText = this.cleanContent(content)
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    // Find the last complete word within the limit
    const truncated = cleanText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  // Make Math available in template
  Math = Math;
}