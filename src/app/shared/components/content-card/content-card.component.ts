import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { CommonUtils, StringUtils } from '../../utils';
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
  imports: [CommonModule, StatusBadgeComponent, BadgeLabelComponent],
  template: `
    <div class="bg-white rounded-none transform transition-all duration-200 overflow-hidden group"
      role="button" tabindex="0"
      [ngClass]="{ 'ring-2 ring-primary shadow-primary-light': isFeatured, 'hover:shadow-xl hover:-translate-y-1 cursor-pointer': clickable }"
      (click)="onCardClick()" (keydown.enter)="onCardClick()" (keydown.space)="$event.preventDefault(); onCardClick()">

      <!-- Image / Media -->
      <div class="aspect-[5/3] bg-gray-100 overflow-hidden relative">
        @if (content.imageUrl) {
          <img [src]="content.imageUrl" [alt]="content.title" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        } @else {
          <div class="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
        }
      </div>

      <!-- Card Body -->
      <div class="p-6 md:p-6 space-y-3">
        <!-- Type label (always shown, small uppercase red) -->
        <div>
          <app-badge-label [type]="content.submissionType" variant="big-red"></app-badge-label>
        </div>

        <!-- Title -->
        <h3 (click)="onTitleClick()" [class.cursor-pointer]="clickable" class="font-serif font-extrabold text-gray-900 text-2xl md:text-3xl lg:text-4xl leading-tight group-hover:text-primary transition-colors" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          {{ content.title }}
        </h3>

        <!-- Author (uppercase, muted) -->
        <div class="text-xs uppercase text-gray-500 font-semibold">
          By {{ content.author?.name || content.authorName || 'The Editors' }}
        </div>

        <!-- Excerpt (larger, more leading) -->
        <p *ngIf="content.description || content.excerpt" class="content-body font-serif prose-custom text-gray-700 text-base md:text-lg leading-relaxed mb-2" style="font-family: 'Crimson Text', Georgia, serif !important; font-style: italic !important; font-weight: 300 !important;">
          {{ sanitizeHtml(content.description || content.excerpt) }}
        </p>

        <!-- Removed meta block (date & reading time) per design change -->

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
    `
  ]
})
export class ContentCardComponent {
  @Input() content!: ContentCardData;
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

  constructor(private router: Router) {}

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