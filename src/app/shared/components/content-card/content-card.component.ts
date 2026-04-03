import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
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
  imports: [CommonModule, MatCardModule, MatChipsModule, StatusBadgeComponent, BadgeLabelComponent],
  template: `
    <mat-card
      class="content-card cursor-pointer"
      [ngClass]="{ 'card-sm': size === 'sm', 'card-lg': size === 'lg' }"
      appearance="outlined"
      (click)="onCardClick()">

      <!-- Cover image -->
      @if (content.imageUrl) {
        <img mat-card-image [src]="content.imageUrl" [alt]="content.title" class="card-cover-img" />
      }
      @if (!content.imageUrl) {
        <div class="card-cover-placeholder">
          <svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
      }

      <mat-card-header>
        <mat-chip-set class="type-chip-set">
          <mat-chip class="type-chip" disableRipple>{{ getTypeLabel() }}</mat-chip>
        </mat-chip-set>
        <mat-card-title class="card-title">{{ content.title }}</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        @if (content?.excerpt || content?.description) {
          <p class="card-excerpt"
            [innerHTML]="sanitizeHtml(content?.excerpt || content?.description || '')">
          </p>
        }

        @if (content.tags && content.tags.length > 0) {
          <mat-chip-set class="tag-chip-set">
            @for (tagItem of content.tags.slice(0, 3); track tagItem) {
              <mat-chip disableRipple>{{ tagItem }}</mat-chip>
            }
            @if (content.tags.length > 3) {
              <mat-chip disableRipple>+{{ content.tags.length - 3 }}</mat-chip>
            }
          </mat-chip-set>
        }
      </mat-card-content>

      <mat-card-footer class="card-footer">
        <span class="author-name">{{ content.author?.name }}</span>
      </mat-card-footer>

    </mat-card>
  `,
  styles: [
    `
    :host {
      display: block;
    }

    .content-card {
      overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      height: 100%;
    }

    .content-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    /* Cover image fills the top of the card */
    img[mat-card-image].card-cover-img {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      margin: 0;
    }

    /* Placeholder when no image */
    .card-cover-placeholder {
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .placeholder-icon {
      width: 2.5rem;
      height: 2.5rem;
      color: #d1d5db;
    }

    /* Header tweaks */
    mat-card-header {
      padding: 12px 16px 0;
      flex-direction: column;
      align-items: flex-start;
    }
    .type-chip-set {
      margin-bottom: 6px;
    }
    .type-chip-set .type-chip {
      --mdc-chip-label-text-size: 0.6rem;
      --mdc-chip-label-text-weight: 700;
      --mdc-chip-container-height: 20px;
      --mdc-chip-container-shape-radius: 999px;
      --mdc-chip-elevated-container-color: var(--color-primary-light, #FFF3ED);
      --mdc-chip-label-text-color: var(--color-primary, #FF6100);
      --mat-chip-selected-trailing-icon-color: var(--color-primary, #FF6100);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 6px;
    }
    .card-title {
      font-size: 1rem !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: normal !important;
    }

    /* Content */
    mat-card-content {
      padding: 8px 16px 0;
    }
    .card-excerpt {
      font-size: 0.875rem;
      color: #4b5563;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 8px;
    }

    /* Chips */
    .tag-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .tag-chip-set mat-chip {
      font-size: 0.7rem !important;
      min-height: 22px !important;
      padding: 0 8px !important;
    }

    /* Footer */
    mat-card-footer.card-footer {
      display: flex;
      align-items: center;
      padding: 8px 16px 12px;
    }
    .author-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
    }

    /* Size variants */
    :host-context(.card-sm) .content-card,
    .content-card.card-sm {
      width: 200px;
      min-width: 200px;
    }
    .content-card.card-sm img[mat-card-image].card-cover-img,
    .content-card.card-sm .card-cover-placeholder {
      aspect-ratio: unset;
      height: 120px;
    }
    .content-card.card-sm .card-title { font-size: 0.9rem !important; }
    .content-card.card-sm .card-excerpt { font-size: 0.8rem !important; }

    .content-card.card-lg {
      width: 360px;
      min-width: 360px;
    }
    .content-card.card-lg .card-title { font-size: 1.4rem !important; }
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
    const name = this.content?.author?.name || '';
    return StringUtils.getInitialsWithFallback(name);
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