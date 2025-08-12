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
      title: 'Kommune x PoemsIndia Writing Program',
      description: 'Submit your poems on the theme of "Incomplete Freedom" by August 25th=. Featured submissions will be published in our special edition.',
      type: 'THEME',
      color: '#d1872cff',
      link: '/submit',
      linkText: 'Submit Now'
    },
    {
      title: 'Pitches for Climate Change',
      description: 'Share your thoughts on climate change. Best essays will be featured on our homepage and shared across our social channels.',
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
    this.currentPage = 1; // Reset to first page when filtering
    
    console.log('🔍 Fetching published content, type:', type);
    
    this.loadPublishedSubmissions(type);
  }

  loadPublishedSubmissions(type: string = '') {
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    const params: any = {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: this.sortBy === 'latest' ? 'reviewedAt' : this.sortBy,
      order: 'desc' as 'desc'
    };
    
    if (type && type !== 'popular') {
      params.type = type;
    }
    
    if (type === 'popular') {
      // Get popular content (you can modify this to use view counts, likes, etc.)
      this.backendService.getPublishedContent('', params).subscribe(
        (data) => {
          console.log('📦 Received popular data:', data);
          console.log('📦 Number of submissions:', data.submissions?.length || 0);
          
          // For the first page, replace submissions; for subsequent pages, you could append for "load more" style
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          
          console.log('📊 Pagination info:', { totalItems: this.totalItems, totalPages: this.totalPages, currentPage: this.currentPage });
        },
        (error) => console.error("Error fetching submissions", error)
      );
    } else {
      this.backendService.getPublishedContent(type, params).subscribe(
        (data) => {
          console.log('📦 Received content data:', data);
          console.log('📦 Number of submissions:', data.submissions?.length || 0);
          
          this.submissions = data.submissions || [];
          this.totalItems = data.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          
          console.log('📊 Pagination info:', { totalItems: this.totalItems, totalPages: this.totalPages, currentPage: this.currentPage });
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

  // Handle sort change
  onSortChange(sortValue: string) {
    this.sortBy = sortValue;
    this.currentPage = 1; // Reset to first page
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


  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPublishedSubmissions(this.selectedType);
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