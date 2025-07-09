import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {RouterOutlet, Router, RouterLink } from '@angular/router';

interface PublishedContent {
  _id: string;
  title: string;
  description: string;
  submissionType: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
  readingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  isFeatured: boolean;
  imageUrl?: string;
  excerpt: string;
  contents: any[];
}
@Component({
  selector: 'app-published-content',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './published-content.component.html',
  styleUrl: './published-content.component.css'
})
export class PublishedContentComponent {
allContent = signal<PublishedContent[]>([]);
  searchTerm = signal('');
  selectedGenre = signal('');
  sortBy = signal('newest');
  currentPage = signal(1);
  itemsPerPage = 20;

  // Computed values
  featuredContent = computed(() => 
    this.allContent().filter(content => content.isFeatured)
  );

  filteredContent = computed(() => {
    let filtered = this.allContent().filter(content => !content.isFeatured);
    
    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(content => 
        content.title.toLowerCase().includes(search) ||
        content.description.toLowerCase().includes(search) ||
        content.authorName.toLowerCase().includes(search) ||
        content.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Genre filter
    const genre = this.selectedGenre();
    if (genre) {
      filtered = filtered.filter(content => content.submissionType === genre);
    }

    // Sort
    const sort = this.sortBy();
    filtered.sort((a, b) => {
      switch (sort) {
        case 'popular':
          return b.viewCount - a.viewCount;
        case 'trending':
          return b.likeCount - a.likeCount;
        case 'oldest':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        default: // newest
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    return filtered;
  });

  paginatedContent = computed(() => {
    const filtered = this.filteredContent();
    const endIndex = this.currentPage() * this.itemsPerPage;
    return filtered.slice(0, endIndex);
  });

  totalPublished = computed(() => this.allContent().length);
  totalAuthors = computed(() => new Set(this.allContent().map(c => c.authorId)).size);
  totalReads = computed(() => this.allContent().reduce((sum, c) => sum + c.viewCount, 0));

  ngOnInit() {
    this.loadPublishedContent();
  }

  async loadPublishedContent() {
    // Mock data for now - replace with actual API call
    const mockContent: PublishedContent[] = [
      {
        _id: '1',
        title: 'The Whispers of Dawn',
        description: 'A beautiful poem about morning reflections',
        submissionType: 'poem',
        authorName: 'Sarah Mitchell',
        authorId: 'author1',
        publishedAt: new Date('2024-01-15'),
        readingTime: 3,
        viewCount: 245,
        likeCount: 23,
        commentCount: 5,
        tags: ['nature', 'morning', 'reflection'],
        isFeatured: true,
        excerpt: 'In the quiet moments before the world awakens, when the first light touches the horizon...',
        contents: []
      },
      // Add more mock data...
    ];
    
    this.allContent.set(mockContent);
  }

  onSearch() {
    this.currentPage.set(1);
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  loadMore() {
    this.currentPage.update(page => page + 1);
  }

  hasMoreContent(): boolean {
    return this.paginatedContent().length < this.filteredContent().length;
  }

  getContentSectionTitle(): string {
    const genre = this.selectedGenre();
    const sort = this.sortBy();
    
    if (genre) {
      return `${genre.charAt(0).toUpperCase() + genre.slice(1)} Works`;
    }
    
    switch (sort) {
      case 'popular': return 'Most Popular';
      case 'trending': return 'Trending Now';
      case 'featured': return 'Featured Works';
      default: return 'Latest Publications';
    }
  }

  trackByContentId(index: number, content: PublishedContent): string {
    return content._id;
  }
}
