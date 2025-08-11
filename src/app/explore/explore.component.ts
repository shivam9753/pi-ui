// explore.component.ts - Add this method to your existing file

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../services/backend.service';
import { Router } from '@angular/router';
import { PublishedContent } from '../utilities/published-content-card/published-content-card.component';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
// Removed rxjs imports for debouncing as we're not using real-time search

@Component({
  selector: 'app-explore',
  imports: [CommonModule, FormsModule, PrettyLabelPipe],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent implements OnInit {
  submissions: any[] = [];
  selectedType: string = '';
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  showSearchResults: boolean = false;
  sortBy: string = 'latest';
  visibleItemsCount: number = 12;
  loadMoreIncrement: number = 12;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalItems: number = 0;
  totalPages: number = 0;
  
  
  // Updated filter options with better labels
  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poems', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essays', value: 'cinema_essay' },
    { label: 'Articles', value: 'article' },
    { label: 'Popular This Week', value: 'popular' }
  ];

  // Sort options
  sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Popular', value: 'popular' },
    { label: 'Reading Time', value: 'readingTime' }
  ];

  trendingTags = ['nature', 'love', 'identity', 'urban-life', 'memory', 'dreams', 'relationships', 'travel'];
  
  // Writing/Content related announcements (for sidebar)
  writingAnnouncements = [
    {
      title: 'Winter Poetry Challenge',
      description: 'Submit your poems on the theme of "Winter Solitude" by December 31st. Featured submissions will be published in our special winter edition.',
      type: 'THEME',
      color: '#3b82f6',
      link: '/submit',
      linkText: 'Submit Now'
    },
    {
      title: 'Cinema Essay Contest',
      description: 'Share your thoughts on contemporary cinema. Best essays will be featured on our homepage and shared across our social channels.',
      type: 'CONTEST',
      color: '#8b5cf6',
      link: '/submit',
      linkText: 'Participate'
    }
  ];


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
    console.log('Tag clicked in explore:', tag); // Debug log
    this.router.navigate(['/tag', tag]);
  }

  onAuthorClick(author: any) {
    // Navigate to author profile
    console.log('View author:', author);
    // You can implement navigation to author profile here
  }

  handleAnnouncementAction(announcement: any) {
    if (announcement.link) {
      this.router.navigate([announcement.link]);
    }
  }

  // Get writing/content related announcements
  getWritingAnnouncements() {
    return this.writingAnnouncements;
  }


  constructor(private backendService: BackendService, private router: Router) {}

  ngOnInit() {
    this.getPublishedSubmissions();
  }

  getPublishedSubmissions(type: string = '') {
    this.selectedType = type;
    
    console.log('🔍 Fetching published content, type:', type);
    
    if (type === 'popular') {
      // Get popular content (you can modify this to use view counts, likes, etc.)
      this.backendService.getPublishedContent('').subscribe(
        (data) => {
          console.log('📦 Received popular data:', data);
          console.log('📦 Number of submissions:', data.submissions?.length || 0);
          if (data.submissions?.length > 0) {
            console.log('📦 First submission sample:', data.submissions[0]);
          }
          
          // Sort by creation date as proxy for popularity (you can enhance this)
          this.submissions = (data.submissions || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.updatePagination();
        },
        (error) => console.error("Error fetching submissions", error)
      );
    } else {
      this.backendService.getPublishedContent(type).subscribe(
        (data) => {
          console.log('📦 Received content data:', data);
          console.log('📦 Number of submissions:', data.submissions?.length || 0);
          if (data.submissions?.length > 0) {
            console.log('📦 First submission sample:', data.submissions[0]);
          }
          this.submissions = data.submissions || [];
          this.updatePagination();
        },
        (error) => console.error("Error fetching submissions", error)
      );
    }
  }

  // Removed onSearchInput as we're not doing real-time search

  performSearch(query: string) {
    this.isSearching = true;
    this.backendService.searchSubmissions(query, { limit: 20 }).subscribe(
      (data) => {
        this.searchResults = data.submissions || [];
        this.showSearchResults = true;
        this.isSearching = false;
      },
      (error) => {
        console.error('Error searching submissions:', error);
        this.isSearching = false;
        this.showSearchResults = false;
      }
    );
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
    this.getPublishedSubmissions(type);
  }

  // Navigate to dedicated category page
  navigateToCategory(category: string) {
    if (category && category !== '') {
      this.router.navigate(['/category', category]);
    }
  }

  openSubmission(submission: any) {
    console.log('🚀 openSubmission called with:', submission.title);
    console.log('🔗 slug:', submission.slug);
    console.log('🔗 seo.slug:', submission.seo?.slug);
    
    // Navigate to the reading interface with SEO slug or fallback to ID
    if (submission.slug) {
      console.log('✅ Navigating to /post/' + submission.slug);
      this.router.navigate(['/post', submission.slug]);
    } else if (submission.seo?.slug) {
      console.log('✅ Navigating to /post/' + submission.seo.slug);
      this.router.navigate(['/post', submission.seo.slug]);
    } else {
      console.log('❌ No slug found, using ID fallback');
      this.router.navigate(['/read', submission._id]);
    }
  }

  onContentCardClick(content: PublishedContent) {
    // Handle card click - same as openSubmission
    this.openSubmission(content);
  }

  // Helper method to get the selected type label
  getSelectedTypeLabel(): string {
    const selectedOption = this.filterOptions.find((option: any) => option.value === this.selectedType);
    return selectedOption ? selectedOption.label : 'works';
  }

  // Helper method to get submissions for display
  getDisplaySubmissions() {
    if (!this.submissions || this.submissions.length === 0) {
      return [];
    }
    
    // Apply sorting to all submissions
    const sortedSubmissions = this.sortSubmissions(this.submissions);
    
    // Apply pagination (load more)
    return sortedSubmissions.slice(0, this.visibleItemsCount);
  }


  // Sort submissions based on selected sort option
  sortSubmissions(submissions: any[]) {
    switch (this.sortBy) {
      case 'popular':
        // Sort by creation date as proxy for popularity (can be enhanced with view counts)
        return submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'readingTime':
        return submissions.sort((a, b) => (a.readingTime || 5) - (b.readingTime || 5));
      case 'latest':
      default:
        return submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  // Load more submissions
  loadMore() {
    this.visibleItemsCount += this.loadMoreIncrement;
  }

  // Check if there are more items to load
  hasMoreItems(): boolean {
    return this.visibleItemsCount < this.submissions.length;
  }

  // Handle sort change
  onSortChange(sortValue: string) {
    this.sortBy = sortValue;
    this.visibleItemsCount = this.loadMoreIncrement; // Reset pagination
  }

  // Get total items available for display
  getTotalDisplayItems(): number {
    return this.submissions?.length || 0;
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

  // Pagination methods
  getCurrentPageSubmissions(): any[] {
    if (this.showSearchResults) {
      return this.searchResults;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.submissions.slice(startIndex, endIndex);
  }

  updatePagination() {
    this.totalItems = this.submissions.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Excerpt truncation method
  getTruncatedExcerpt(submission: any, maxLength: number = 100): string {
    const content = submission.excerpt || submission.description || '';
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