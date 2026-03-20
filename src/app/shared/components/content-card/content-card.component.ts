import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StringUtils } from '../../utils';
import { Author } from '../../../models/author.model';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { Router } from '@angular/router';

export interface ContentCardData {
  id: string;
  title: string;
  description?: string;
  excerpt?: string;
  authorName?: string;
  author?: Author;
  submissionType: string;
  status?: string;
  // Optional metadata fields — kept optional so callers may pass them without forcing display
  createdAt?: string;
  publishedAt?: string;
  readingTime?: number;
  imageUrl?: string;
  tags?: string[];
  link?: string;
  isFeatured?: boolean;
  slug?: string;
  wordCount?: number;
  viewCount?: number;
  recentViews?: number;
  windowStartTime?: string;
  // Optional SEO metadata (some API responses include seo.slug)
  seo?: { slug?: string };
}

@Component({
  selector: 'app-content-card',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, BadgeLabelComponent],
  template: `
    <div class="cursor-pointer group" [ngClass]="{ 'card-sm': size === 'sm', 'card-lg': size === 'lg' }" (click)="onCardClick()">
      <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-4">
        @if (content.imageUrl) {
          <img
            [src]="content.imageUrl"
            [alt]="content.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        }
        @if (!content.imageUrl) {
          <div class="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        }
      </div>

      <div class="space-y-2">
        <div class="text-themed-accent text-xs font-medium">
          {{ content.submissionType | titlecase }}
        </div>

        <h3 class="font-bold text-gray-900 text-base leading-tight mb-1"
          style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          {{ content.title }}
        </h3>

        @if (content?.excerpt || content?.description) {
          <p class="text-gray-600 text-sm leading-relaxed mb-2"
            style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"
            [innerHTML]="sanitizeHtml(content?.excerpt || content?.description || '')">
          </p>
        }

        @if (content.tags && content.tags.length > 0) {
          <div class="flex flex-wrap gap-1 mt-2">
            @for (tagItem of content.tags.slice(0,3); track tagItem) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{{ tagItem }}</span>
            }
            @if (content.tags.length > 3) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">+{{ content.tags.length - 3 }}</span>
            }
          </div>
        }

        <div class="flex items-center gap-2 text-gray-500 text-sm mt-2">
          <span class="font-medium">{{ content.author?.name || content.authorName || 'Anonymous' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* focus styles for keyboard users */
    :host [role="button"]:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.25);
      border-radius: 0;
    }

    /* Size variants */
    .card-sm {
      min-width: 200px;
      width: 200px;
      border-radius: 0.25rem;
    }
    .card-sm .body-wrapper { padding: 0.75rem !important; }
    .card-sm .title-text { font-size: 1rem !important; line-height: 1.1 !important; }
    .card-sm .excerpt-text { font-size: 0.85rem !important; }
    .card-sm .image-wrapper { height: 120px; }

    .card-lg { min-width: 360px; width: 360px; }
    .card-lg .body-wrapper { padding: 1.5rem !important; }
    .card-lg .title-text { font-size: 1.5rem !important; }

    /* Ensure default (md) can grow naturally */
    .card-sm, .card-lg { display: inline-block; vertical-align: top; }
    `
  ]
})
export class ContentCardComponent {
  @Input() content!: ContentCardData;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showStatus = false;
  @Input() showActions = false;
  // Keep a simple showMeta input for backward compatibility with templates
  @Input() showMeta = false;
  @Input() clickable = true;
  @Input() actions: Array<{
    label: string;
    handler: (content: ContentCardData) => void;
    class?: string;
  }> = [];

  // Internal navigation: accept optional slug override. Component will navigate when clicked.
  @Input() slug?: string;

  // When true, hide the outer border (used by other templates via [noBorder])
  @Input() noBorder = false;

  constructor(private readonly router: Router) {}

  get isFeatured(): boolean {
    return this.content.isFeatured || false;
  }

  onTitleClick(): void {
    // Title click navigates same as card click
    this.onCardClick();
  }

  onCardClick(): void {
    if (!this.clickable) return;

    const slugToUse = this.slug || this.content.slug;
    if (slugToUse && slugToUse !== '') {
      this.router.navigate(['/post', slugToUse]);
      return;
    }

    // Fallback to id-based route if slug not available
    const id = (this.content as any)._id || (this.content as any).id || this.content.id;
    if (id) {
      this.router.navigate(['/read', id]);
    }
  }

  getTypeLabel(): string {
    switch (this.content.submissionType) {
      case 'poem': return 'Poetry';
      case 'story': return 'Story';
      case 'article': return 'Article';
      case 'opinion': return 'Opinion';
      case 'cinema_essay': return 'Cinema';
      default: return this.content.submissionType;
    }
  }

  getTypeClasses(): string {
    switch (this.content.submissionType) {
      case 'poem':
        return 'tag-purple';
      case 'story':
        return 'tag-green';
      case 'article':
        return 'tag-blue';
      case 'opinion':
        return 'tag-yellow';
      case 'cinema_essay':
        return 'tag-red';
      default:
        return 'tag-gray';
    }
  }


  sanitizeHtml(html: string | undefined): string {
    if (!html) return '';
    return StringUtils.stripHtml(html);
  }

  getAuthorInitials(): string {
    const name = this.content.author?.name || this.content.authorName || 'Anonymous';
    return StringUtils.getInitialsWithFallback(name, '?');
  }

  isOpinionPiece(): boolean {
    return this.content.submissionType === 'article' || this.content.submissionType === 'opinion';
  }

  /**
   * Check if content is trending based on recent views
   */
  isTrending(): boolean {
    // recentViews may be deprecated; if missing, we cannot compute trending here.
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

  /** Navigate using explicit content.link if present, otherwise fall back to slug/id routes. */
  navigateByContent(content: ContentCardData): void {
    if (content.link && content.link !== '#') {
      this.router.navigate([content.link]);
      return;
    }

    const slugToUse = content.slug;
    if (slugToUse && slugToUse !== '') {
      this.router.navigate(['/post', slugToUse]);
      return;
    }

    const id = (content as any)._id || (content as any).id || content.id;
    if (id) {
      this.router.navigate(['/read', id]);
    }
  }
}