import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContentCardData {
  id: string;
  title: string;
  description?: string;
  excerpt?: string;
  author?: {
    name: string;
    username: string;
  };
  submissionType: string;
  status?: string;
  createdAt: string;
  publishedAt?: string;
  imageUrl?: string;
  tags?: string[];
  readingTime?: number;
  isFeatured?: boolean;
  slug?: string;
}

@Component({
  selector: 'app-content-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 overflow-hidden h-auto"
      [ngClass]="{ 'ring-2 ring-orange-500': isFeatured }"
      style="min-height: 280px; max-height: 400px;">
    
      <!-- Image Header (if available) -->
      @if (content.imageUrl) {
        <div class="relative h-48 overflow-hidden">
          <img [src]="content.imageUrl"
            [alt]="content.title"
            class="w-full h-full object-cover">
          @if (content.isFeatured) {
            <div
              class="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
              Featured
            </div>
          }
        </div>
      }
    
      <!-- Card Content -->
      <div class="p-6">
        <!-- Header with Type and Status -->
        <div class="flex items-center justify-between mb-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            [ngClass]="getTypeClasses()">
            {{ getTypeLabel() }}
          </span>
    
          @if (showStatus && content.status) {
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              [ngClass]="getStatusClasses()">
              {{ getStatusLabel() }}
            </span>
          }
        </div>
    
        <!-- Title -->
        <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2"
          [class.cursor-pointer]="clickable"
          (click)="onTitleClick()">
          {{ content.title }}
        </h3>
    
        <!-- Description/Excerpt -->
        @if (content.description || content.excerpt) {
          <p
            class="text-gray-600 text-sm mb-4 line-clamp-3">
            {{ sanitizeHtml(content.description || content.excerpt) }}
          </p>
        }
    
        <!-- Tags -->
        @if (content.tags && content.tags.length > 0) {
          <div class="flex flex-wrap gap-1 mb-4">
            @for (tag of content.tags.slice(0, 3); track tag) {
              <span
                class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                #{{ tag }}
              </span>
            }
            @if (content.tags.length > 3) {
              <span
                class="text-xs text-gray-500">
                +{{ content.tags.length - 3 }} more
              </span>
            }
          </div>
        }
    
        <!-- Footer -->
        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center space-x-4">
            <!-- Author -->
            @if (content.author) {
              <span>
                by {{ content.author.name || content.author.username || 'Anonymous' }}
              </span>
            }
    
            <!-- Reading Time -->
            @if (content.readingTime) {
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {{ content.readingTime }} min read
              </span>
            }
          </div>
    
          <!-- Date -->
          <span>{{ getDisplayDate() }}</span>
        </div>
    
        <!-- Action Buttons -->
        @if (showActions) {
          <div class="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
            @for (action of actions; track action) {
              <button
                (click)="action.handler(content)"
                [ngClass]="action.class || 'px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50'"
                class="transition-colors duration-200">
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
        return 'bg-purple-100 text-purple-800';
      case 'story':
        return 'bg-green-100 text-green-800';
      case 'article':
        return 'bg-blue-100 text-blue-800';
      case 'quote':
        return 'bg-yellow-100 text-yellow-800';
      case 'cinema_essay':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800';
      case 'published':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
}