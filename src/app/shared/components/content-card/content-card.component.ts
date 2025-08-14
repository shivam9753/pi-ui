import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Author } from '../../../models';

export interface ContentCardData {
  id: string;
  title: string;
  description?: string;
  excerpt?: string;
  author?: Author;
  submissionType: string;
  status?: string;
  createdAt: string;
  publishedAt?: string;
  imageUrl?: string;
  tags?: string[];
  readingTime?: number;
  isFeatured?: boolean;
  slug?: string;
  wordCount?: number;
  viewCount?: number;
  recentViews?: number;
  windowStartTime?: string;
}

@Component({
  selector: 'app-content-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
      [ngClass]="{ 'ring-2 ring-orange-400 shadow-orange-100': isFeatured }"
      style="min-height: 320px;">
    
      <!-- Featured Badge -->
      @if (content.isFeatured) {
        <div class="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2">
          <div class="flex items-center text-white text-xs font-medium">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Featured
          </div>
        </div>
      }
    
      <!-- Card Content -->
      <div class="p-6">
        <!-- Header with Type and Status -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <!-- Trending Badge -->
            @if (isTrending()) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                🔥 Trending
              </span>
            }
            
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              [ngClass]="getTypeClasses()">
              {{ getTypeLabel() }}
            </span>
            
            <!-- Word Count for Opinion pieces -->
            @if (isOpinionPiece() && content.wordCount) {
              <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                {{ content.wordCount }} words
              </span>
            }
          </div>
    
          @if (showStatus && content.status) {
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              [ngClass]="getStatusClasses()">
              {{ getStatusLabel() }}
            </span>
          }
        </div>
    
        <!-- Title -->
        <h3 class="ext-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 min-h-[3rem] group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200"
          [class.cursor-pointer]="clickable"
          (click)="onTitleClick()">
          {{ content.title }}
        </h3>
    
        <!-- Author Info -->
        @if (content.author) {
          <div class="flex items-center mb-3">
            <div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
              {{ getAuthorInitials() }}
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ content.author.name || 'Anonymous' }}
              </div>
            </div>
          </div>
        }
    
        <!-- Description/Excerpt -->
        @if (content.description || content.excerpt) {
          <p class="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed line-clamp-3 min-h-[4.875rem]">
            {{ sanitizeHtml(content.description || content.excerpt) }}
          </p>
        }
    
        <!-- Tags -->
        @if (content.tags && content.tags.length > 0) {
          <div class="flex flex-wrap gap-1 mb-4">
            @for (tag of content.tags.slice(0, 2); track tag) {
              <span
                class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                #{{ tag }}
              </span>
            }
            @if (content.tags.length > 2) {
              <span
                class="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">
                +{{ content.tags.length - 2 }} more
              </span>
            }
          </div>
        }
    
        <!-- Footer -->
        <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div class="flex items-center space-x-3">
            <!-- Reading Time -->
            @if (content.readingTime) {
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {{ content.readingTime }}m
              </span>
            }
            
            <!-- View Count -->
            @if (content.viewCount) {
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                {{ formatNumber(content.viewCount) }}
              </span>
            }
            
            <!-- Date -->
            <span class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {{ getDisplayDate() }}
            </span>
          </div>
        </div>
    
        <!-- Action Buttons -->
        @if (showActions && actions.length > 0) {
          <div class="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            @for (action of actions; track action) {
              <button
                (click)="action.handler(content)"
                [ngClass]="action.class || 'px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200'"
                class="transition-all duration-200">
                {{ action.label }}
              </button>
            }
          </div>
        }
      </div>
    </div>
    `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-4 {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ContentCardComponent {
  @Input() content!: ContentCardData;
  @Input() showStatus = false;
  @Input() showActions = false;
  @Input() clickable = true;
  @Input() actions: Array<{
    label: string;
    handler: (content: ContentCardData) => void;
    class?: string;
  }> = [];

  @Output() titleClick = new EventEmitter<ContentCardData>();
  @Output() cardClick = new EventEmitter<ContentCardData>();

  get isFeatured(): boolean {
    return this.content.isFeatured || false;
  }

  onTitleClick(): void {
    if (this.clickable) {
      this.titleClick.emit(this.content);
    }
  }

  getTypeLabel(): string {
    switch (this.content.submissionType) {
      case 'poem': return 'Poetry';
      case 'story': return 'Story';
      case 'article': return 'Article';
      case 'quote': return 'Quote';
      case 'cinema_essay': return 'Cinema';
      default: return this.content.submissionType;
    }
  }

  getTypeClasses(): string {
    switch (this.content.submissionType) {
      case 'poem':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'story':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'article':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'quote':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cinema_essay':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getStatusLabel(): string {
    if (!this.content.status) return '';
    
    switch (this.content.status) {
      case 'pending_review': return 'Pending Review';
      case 'in_progress': return 'In Review';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'needs_revision': return 'Needs Revision';
      case 'published': return 'Published';
      default: return this.content.status;
    }
  }

  getStatusClasses(): string {
    switch (this.content.status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'published':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getDisplayDate(): string {
    const date = this.content.publishedAt || this.content.createdAt;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  sanitizeHtml(html: string | undefined): string {
    if (!html) return '';
    // Remove HTML tags, decode common entities, and clean up extra whitespace
    return html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&')  // Decode ampersands
      .replace(/&lt;/g, '<')   // Decode less than
      .replace(/&gt;/g, '>')   // Decode greater than
      .replace(/&quot;/g, '"') // Decode quotes
      .replace(/&#39;/g, "'")  // Decode apostrophes
      .replace(/&[^;]+;/g, ' ') // Replace any other entities with space
      .replace(/\s+/g, ' ')     // Collapse multiple whitespace to single space
      .trim();
  }

  getAuthorInitials(): string {
    if (!this.content.author) return '?';
    
    const name = this.content.author.name || 'Anonymous';
    const words = name.split(' ');
    
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return words.slice(0, 2).map((word: string) => word.charAt(0).toUpperCase()).join('');
  }

  isOpinionPiece(): boolean {
    return this.content.submissionType === 'article' || this.content.submissionType === 'opinion';
  }

  /**
   * Check if content is trending based on recent views
   */
  isTrending(): boolean {
    if (!this.content.recentViews || !this.content.viewCount) return false;
    
    // Consider trending if:
    // 1. Has at least 10 recent views, AND
    // 2. Recent views are at least 30% of total views
    const minRecentViews = 10;
    const trendingThreshold = 0.3;
    
    return this.content.recentViews >= minRecentViews && 
           (this.content.recentViews / this.content.viewCount) >= trendingThreshold;
  }

  /**
   * Format large numbers (1234 -> 1.2k, 1000000 -> 1M)
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  }
}