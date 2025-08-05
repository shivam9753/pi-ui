// explore.component.ts - Add this method to your existing file

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../services/backend.service';
import { Router, RouterLink } from '@angular/router';
import { BadgeLabelComponent } from '../utilities/badge-label/badge-label.component';
import { PublishedContentCardComponent, PublishedContent } from '../utilities/published-content-card/published-content-card.component';
// Removed rxjs imports for debouncing as we're not using real-time search

@Component({
  selector: 'app-explore',
  imports: [DatePipe, CommonModule, BadgeLabelComponent, FormsModule, PublishedContentCardComponent],
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
  
  // Updated filter options with better labels
  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poems', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essays', value: 'cinema_essay' },
    { label: 'Articles', value: 'article' }
  ];

  trendingTags = ['nature', 'love', 'identity', 'urban-life', 'memory', 'dreams', 'relationships', 'travel'];
  featuredAuthors = [
    { name: 'Emma Richardson', works: 23 },
    { name: 'Marcus Chen', works: 18 },
    { name: 'Sofia Ahmed', works: 31 },
    { name: 'David Park', works: 15 },
    { name: 'Luna Torres', works: 27 }
  ];

  recentActivity = [
    {
      author: 'Sarah M.',
      action: 'published',
      work: 'Midnight Reflections',
      time: '2 hours ago'
    },
    {
      author: 'Alex K.',
      action: 'shared',
      work: 'The Art of Solitude',
      time: '4 hours ago'
    },
    {
      author: 'Maria L.',
      action: 'published',
      work: 'City Dreams',
      time: '6 hours ago'
    },
    {
      author: 'James R.',
      action: 'commented on',
      work: 'Digital Age Blues',
      time: '8 hours ago'
    },
    {
      author: 'Nina P.',
      action: 'published',
      work: 'Ocean Whispers',
      time: '12 hours ago'
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

  constructor(private backendService: BackendService, private router: Router) {}

  ngOnInit() {
    this.getPublishedSubmissions();
  }

  getPublishedSubmissions(type: string = '') {
    this.selectedType = type;
    this.backendService.getPublishedContent(type).subscribe(
      (data) => (this.submissions = data.submissions || []),
      (error) => console.error("Error fetching submissions", error)
    );
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