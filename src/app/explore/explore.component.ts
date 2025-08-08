// explore.component.ts - Add this method to your existing file

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../services/backend.service';
import { Router, RouterLink } from '@angular/router';
import { PublishedContentCardComponent, PublishedContent } from '../utilities/published-content-card/published-content-card.component';
// Removed rxjs imports for debouncing as we're not using real-time search

@Component({
  selector: 'app-explore',
  imports: [CommonModule, FormsModule],
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

  onTagClick(tag: string) {
    // Filter content by tag or navigate to tag page
    console.log('Filtering by tag:', tag);
    // You can implement tag-based filtering here
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
    
    if (type === 'popular') {
      // Get popular content (you can modify this to use view counts, likes, etc.)
      this.backendService.getPublishedContent('').subscribe(
        (data) => {
          // Sort by creation date as proxy for popularity (you can enhance this)
          this.submissions = (data.submissions || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        },
        (error) => console.error("Error fetching submissions", error)
      );
    } else {
      this.backendService.getPublishedContent(type).subscribe(
        (data) => (this.submissions = data.submissions || []),
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

  openSubmission(submission: any) {
    // Navigate to the reading interface with submission ID
    this.router.navigate(['/read', submission._id]);
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

  // Helper method to get submissions for display (excluding featured if it exists)
  getDisplaySubmissions() {
    if (!this.submissions || this.submissions.length === 0) {
      return [];
    }
    
    let displaySubmissions = [];
    
    // If we're showing all content (no filter) and have more than 1 submission,
    // skip the first one as it's shown in featured section
    if (!this.selectedType && this.submissions.length > 1) {
      displaySubmissions = this.submissions.slice(1);
    } else {
      // For filtered content, show all submissions as there's no separate featured section
      displaySubmissions = this.submissions;
    }
    
    // Apply sorting
    displaySubmissions = this.sortSubmissions(displaySubmissions);
    
    // Apply pagination (load more)
    return displaySubmissions.slice(0, this.visibleItemsCount);
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
    let totalItems = this.submissions.length;
    if (!this.selectedType && this.submissions.length > 1) {
      totalItems = this.submissions.length - 1; // Exclude featured item
    }
    return this.visibleItemsCount < totalItems;
  }

  // Handle sort change
  onSortChange(sortValue: string) {
    this.sortBy = sortValue;
    this.visibleItemsCount = this.loadMoreIncrement; // Reset pagination
  }

  // Get total items available for display
  getTotalDisplayItems(): number {
    if (!this.submissions || this.submissions.length === 0) {
      return 0;
    }
    
    if (!this.selectedType && this.submissions.length > 1) {
      return this.submissions.length - 1; // Exclude featured item
    }
    
    return this.submissions.length;
  }

  // Sidebar Statistics Methods
  getTotalPublishedCount(): number {
    return this.submissions?.length || 0;
  }

  getActiveWritersCount(): number {
    if (!this.submissions || this.submissions.length === 0) return 0;
    
    // Count unique authors
    const uniqueAuthors = new Set(this.submissions.map(sub => sub.author?.name || sub.userId?.name));
    return uniqueAuthors.size;
  }

  getThisMonthCount(): number {
    if (!this.submissions || this.submissions.length === 0) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this.submissions.filter(sub => {
      const subDate = new Date(sub.createdAt);
      return subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear;
    }).length;
  }

  getContentTypeStats() {
    if (!this.submissions || this.submissions.length === 0) {
      return [
        { label: 'Poems', count: 0, color: '#f97316' },
        { label: 'Stories', count: 0, color: '#3b82f6' },
        { label: 'Articles', count: 0, color: '#10b981' },
        { label: 'Cinema Essays', count: 0, color: '#8b5cf6' }
      ];
    }

    const counts = this.submissions.reduce((acc: any, sub) => {
      const type = sub.submissionType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return [
      { label: 'Poems', count: counts.poem || 0, color: '#f97316' },
      { label: 'Stories', count: counts.story || 0, color: '#3b82f6' },
      { label: 'Articles', count: counts.article || 0, color: '#10b981' },
      { label: 'Cinema Essays', count: counts.cinema_essay || 0, color: '#8b5cf6' }
    ];
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
}