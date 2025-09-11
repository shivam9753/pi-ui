// explore-revamped.component.ts - Modern Content Discovery Architecture

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { ViewTrackerService } from '../services/view-tracker.service';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';

interface ContentSection {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  layout: 'hero' | 'horizontal-scroll' | 'grid' | 'list' | 'magazine';
  items: any[];
  loading: boolean;
  hasMore: boolean;
  loadMoreCallback?: () => void;
}

@Component({
  selector: 'app-explore-revamped',
  imports: [CommonModule, FormsModule, PrettyLabelPipe],
  templateUrl: './explore-revamped.component.html',
  styleUrl: './explore-revamped.component.css'
})
export class ExploreRevampedComponent implements OnInit {
  // Reactive state using signals
  searchQuery = signal('');
  showSearchResults = signal(false);
  searchResults = signal<any[]>([]);
  contentSections = signal<ContentSection[]>([]);
  globalLoading = signal(false);
  
  // All Stories section (main infinite scroll feed)
  allStoriesItems = signal<any[]>([]);
  allStoriesLoading = signal(false);
  allStoriesPage = 1;
  allStoriesHasMore = signal(true);
  
  // Quick filters state
  quickFilters = signal([
    { id: 'recent', label: 'Recent', icon: '🆕', active: false },
    { id: 'popular', label: 'Popular', icon: '🔥', active: false },
    { id: 'short', label: 'Quick Read', icon: '⚡', active: false },
    { id: 'long', label: 'Deep Dive', icon: '📚', active: false },
  ]);

  constructor(
    private backendService: BackendService,
    private viewTrackerService: ViewTrackerService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initializeContentSections();
    
    // Handle search query from route parameters
    this.route.queryParams.subscribe(params => {
      const searchQuery = params['search'];
      if (searchQuery) {
        this.searchQuery.set(searchQuery);
        this.performSearch();
      } else {
        this.loadInitialContent();
      }
    });
  }

  private initializeContentSections() {
    const sections: ContentSection[] = [
      {
        id: 'hero',
        title: 'Editor\'s Pick',
        subtitle: 'Featured content curated by our editorial team',
        icon: '⭐',
        layout: 'hero',
        items: [],
        loading: false,
        hasMore: false
      },
      {
        id: 'trending',
        title: 'Popular This Week',
        subtitle: 'Most viewed content this week',
        icon: '🔥',
        layout: 'horizontal-scroll',
        items: [],
        loading: false,
        hasMore: false  // No individual load more for curated sections
      },
      {
        id: 'fresh-poetry',
        title: 'Poems',
        subtitle: 'Latest verses from our poets',
        icon: '📝',
        layout: 'magazine',
        items: [],
        loading: false,
        hasMore: false  // No individual load more for curated sections
      },
      {
        id: 'cinema-essays',
        title: 'Cinema',
        subtitle: 'Film analysis and cultural commentary',
        icon: '🎬',
        layout: 'horizontal-scroll',
        items: [],
        loading: false,
        hasMore: false
      },
      {
        id: 'book-reviews',
        title: 'Books',
        subtitle: 'Literary critiques and recommendations',
        icon: '📚',
        layout: 'horizontal-scroll',
        items: [],
        loading: false,
        hasMore: false
      },
      {
        id: 'prose',
        title: 'Prose',
        subtitle: 'Creative writing and storytelling',
        icon: '✍️',
        layout: 'magazine',
        items: [],
        loading: false,
        hasMore: false
      },
      {
        id: 'articles',
        title: 'Articles',
        subtitle: 'News and insights',
        icon: '📄',
        layout: 'magazine',
        items: [],
        loading: false,
        hasMore: false
      }
    ];

    this.contentSections.set(sections);
  }

  private async loadInitialContent() {
    this.globalLoading.set(true);

    try {
      // Load curated sections first (reduced items per section)
      const sections = this.contentSections();
      const priorityOrder = ['hero', 'trending', 'articles', 'fresh-poetry', 'cinema-essays', 'book-reviews', 'prose'];
      const orderedSections = priorityOrder
        .map(id => sections.find(s => s.id === id))
        .filter(s => s !== undefined);
      
      for (let i = 0; i < orderedSections.length; i++) {
        await this.loadSectionContent(orderedSections[i].id);
        
        if (i < orderedSections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Load initial All Stories content
      await this.loadAllStoriesContent(false);
      
    } finally {
      this.globalLoading.set(false);
    }
  }

  // Load All Stories content (main infinite scroll feed)
  private async loadAllStoriesContent(loadMore = false) {
    if (this.allStoriesLoading()) return;
    
    this.allStoriesLoading.set(true);

    try {
      const itemsPerPage = 12;
      const skip = loadMore ? this.allStoriesItems().length : 0;
      
      const params = {
        limit: itemsPerPage,
        skip: skip,
        sortBy: 'createdAt',
        order: 'desc' as 'desc'
      };

      const data = await this.backendService.getPublishedContent('', params).toPromise();
      const newItems = data?.submissions || [];

      if (loadMore) {
        this.allStoriesItems.update(items => [...items, ...newItems]);
      } else {
        this.allStoriesItems.set(newItems);
      }

      this.allStoriesHasMore.set(newItems.length >= itemsPerPage);
      
      if (loadMore) {
        this.allStoriesPage++;
      } else {
        this.allStoriesPage = 1;
      }

    } catch (error) {
      console.error('Error loading all stories:', error);
      this.allStoriesHasMore.set(false);
    } finally {
      this.allStoriesLoading.set(false);
    }
  }

  private async loadSectionContent(sectionId: string, loadMore = false) {
    const sections = this.contentSections();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    
    // Prevent multiple simultaneous loads
    if (section.loading) return;
    
    section.loading = true;
    this.contentSections.set([...sections]);

    try {
      let params: any = { limit: this.getSectionLimit(sectionId) };
      
      // Add pagination for loadMore
      if (loadMore) {
        params.skip = section.items.length; // Skip existing items
      }
      
      // Apply section-specific filters
      switch (sectionId) {
        case 'hero':
          // Hero section doesn't support loadMore (only 1 item)
          if (loadMore) {
            section.loading = false;
            this.contentSections.set([...sections]);
            return;
          }
          params = { ...params, sortBy: 'viewCount', order: 'desc', limit: 1 };
          break;
        case 'trending':
          // Use trending API - will be handled separately
          break;
        case 'fresh-poetry':
          params = { ...params, type: 'poem', sortBy: 'createdAt', order: 'desc' };
          break;
        case 'articles':
          params = { ...params, type: 'article', sortBy: 'createdAt', order: 'desc' };
          break;
        case 'cinema-essays':
          params = { ...params, type: 'cinema_essay', sortBy: 'createdAt', order: 'desc' };
          break;
        case 'book-reviews':
          params = { ...params, type: 'book_review', sortBy: 'createdAt', order: 'desc' };
          break;
        case 'prose':
          params = { ...params, type: 'prose', sortBy: 'createdAt', order: 'desc' };
          break;
      }

      let data;
      if (sectionId === 'trending') {
        const skip = loadMore ? section.items.length : 0;
        data = await this.viewTrackerService.getTrendingPosts(params.limit, skip).toPromise();
      } else {
        data = await this.backendService.getPublishedContent('', params).toPromise();
      }

      const newItems = data?.submissions || [];
      
      // Update section
      section.items = loadMore ? [...section.items, ...newItems] : newItems;
      section.hasMore = newItems.length >= params.limit;
      section.loading = false;

      this.contentSections.set([...sections]);
    } catch (error) {
      console.error(`Error loading section ${sectionId}:`, error);
      
      // Set empty items and disable hasMore on error
      section.items = loadMore ? section.items : [];
      section.hasMore = false;
      section.loading = false;
      
      this.contentSections.set([...sections]);
    }
  }

  private getSectionLimit(sectionId: string): number {
    const limits: { [key: string]: number } = {
      'hero': 1,           // Featured content - just 1
      'trending': 4,       // Popular - reduced to 4  
      'fresh-poetry': 4,   // Latest poetry - reduced to 4
      'cinema-essays': 3,  // Cinema - reduced to 3
      'book-reviews': 3,   // Books - reduced to 3
      'prose': 4          // Prose - reduced to 4
    };
    return limits[sectionId] || 4;
  }


  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showSearchResults.set(false);
    
    // Clear the query param and reload content
    this.router.navigate(['/explore']);
    this.loadInitialContent();
  }

  // Search functionality (called when navigated from header)
  private performSearch() {
    if (!this.searchQuery()) return;
    
    this.globalLoading.set(true);
    this.backendService.getSubmissions({ search: this.searchQuery().trim(), status: 'published', limit: 50 }).subscribe({
      next: (data) => {
        this.searchResults.set(data.submissions || []);
        this.showSearchResults.set(true);
        this.globalLoading.set(false);
      },
      error: (error) => {
        console.error('Search failed:', error);
        this.searchResults.set([]);
        this.showSearchResults.set(false);
        this.globalLoading.set(false);
      }
    });
  }

  toggleQuickFilter(filterId: string) {
    const filters = this.quickFilters();
    const filterIndex = filters.findIndex(f => f.id === filterId);
    if (filterIndex !== -1) {
      filters[filterIndex].active = !filters[filterIndex].active;
      this.quickFilters.set([...filters]);
      this.applyQuickFilters();
    }
  }

  private applyQuickFilters() {
    const activeFilters = this.quickFilters().filter(f => f.active).map(f => f.id);
    // Apply filters to content sections
    // This would modify the API calls in loadSectionContent
    this.loadInitialContent();
  }

  loadMoreSection(sectionId: string) {
    this.loadSectionContent(sectionId, true);
  }

  // Load more for All Stories section
  loadMoreAllStories() {
    this.loadAllStoriesContent(true);
  }

  // Get category type for section to redirect to category page
  getSectionCategoryType(sectionId: string): string | null {
    const sectionToCategoryMap: { [key: string]: string } = {
      'trending': 'popular',        // Special category for trending
      'fresh-poetry': 'poem',
      'articles': 'article', 
      'cinema-essays': 'cinema_essay',
      'book-reviews': 'book_review',
      'prose': 'prose'
    };
    
    return sectionToCategoryMap[sectionId] || null;
  }

  // Navigate to category page
  navigateToCategory(category: string) {
    if (category === 'popular') {
      // For trending/popular, show all content sorted by popularity
      this.router.navigate(['/category/popular']);
    } else {
      this.router.navigate(['/category', category]);
    }
  }

  openContent(item: any) {
    if (item.slug) {
      this.router.navigate(['/post', item.slug]);
    } else if (item.seo?.slug) {
      this.router.navigate(['/post', item.seo.slug]);
    } else {
      this.router.navigate(['/read', item._id]);
    }
  }

  // Utility methods
  getInitial(title: string): string {
    return title?.charAt(0)?.toUpperCase() || 'P';
  }

  formatViewCount(count: number): string {
    if (count >= 1000000) return `${Math.floor(count / 1000000)}M views`;
    if (count >= 1000) return `${Math.floor(count / 1000)}K views`;
    return `${count || 0} views`;
  }

  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div>/g, '')
      .replace(/<\/div>/g, '<br>')
      .replace(/<br\s*\/?>/g, '<br>')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  // Removed infinite scroll - using load more button only
}