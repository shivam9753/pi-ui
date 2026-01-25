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
    <div class="bg-white rounded-none transform transition-all duration-200 overflow-hidden group"
      [ngClass]="{ 'border border-gray-200 dark:border-gray-700': !noBorder, 'ring-2 ring-primary shadow-primary-light': isFeatured, 'hover:shadow-xl hover:-translate-y-1 cursor-pointer': clickable, 'card-sm': size === 'sm', 'card-lg': size === 'lg' }"
      [attr.role]="clickable ? 'button' : null" [attr.tabindex]="clickable ? 0 : null"
      (click)="onCardClick()" (keydown.enter)="onCardClick()" (keydown.space)="$event.preventDefault(); onCardClick()">

      <!-- Image / Media -->
      @if (content.imageUrl) {
        <div class="aspect-[5/3] bg-gray-100 overflow-hidden relative image-wrapper">
          <img [src]="content.imageUrl" [alt]="content.title" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      }

      <!-- Card Body -->
      <div class="p-6 md:p-6 space-y-3 body-wrapper">
        <!-- Type label (always shown, small uppercase red) -->
        <div>
          <app-badge-label [type]="content.submissionType" badgeType="type" variant="big-red"></app-badge-label>
        </div>

        <!-- Title -->
        <h3 (click)="onTitleClick()" [class.cursor-pointer]="clickable" class="font-serif font-extrabold text-gray-900 text-2xl md:text-3xl lg:text-4xl leading-tight group-hover:text-primary transition-colors title-text" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          {{ content.title }}
        </h3>

        <!-- Author (uppercase, muted) - only show when showMeta is true -->
        <div *ngIf="showMeta" class="text-xs uppercase text-gray-500 font-semibold author-text">
          By {{ content.author?.name || content.authorName }}
        </div>

        <!-- Excerpt (larger, more leading) -->
        <p *ngIf="content.description || content.excerpt" class="content-body font-serif prose-custom text-gray-700 text-base md:text-lg leading-relaxed mb-2 excerpt-text" style="font-family: 'Crimson Text', Georgia, serif !important; font-style: italic !important; font-weight: 300 !important;">
          {{ sanitizeHtml(content.description || content.excerpt) }}
        </p>

        <!-- Actions: render passed actions or a default Learn More button when requested -->
        <div *ngIf="showActions" class="mt-4 flex items-center space-x-3">
          <button *ngFor="let a of actions" (click)="a.handler(content)" [ngClass]="a.class || 'btn-primary'">{{ a.label }}</button>
          <button *ngIf="actions.length === 0 && (content.link || content.slug)" class="btn-secondary" (click)="navigateByContent(content)">Learn More</button>
        </div>

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