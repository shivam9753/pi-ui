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
      [ngClass]="{ 'card-sm': size === 'sm', 'card-lg': size === 'lg', 'card-borderless': noBorder }"
      appearance="outlined"
      (click)="onCardClick()">

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
      </mat-card-content>

      <mat-card-footer class="card-footer">
        <div class="card-meta">
          @if (showMeta && content.author?.name) {
            <span class="author-name">{{ content.author?.name }}</span>
          }
          @if (showMeta && getDisplayDate()) {
            <span class="meta-separator"></span>
            <span class="meta-secondary">{{ getDisplayDate() }}</span>
          }
        </div>
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
      transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-card, #ffffff);
      border-color: var(--border-primary, #e5e7eb);
      border-radius: 16px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    }

    .content-card:hover {
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
      transform: translateY(-2px);
      border-color: var(--border-secondary, #d1d5db);
    }

    .content-card.card-borderless {
      border-color: rgba(255, 97, 0, 0.08);
      background: linear-gradient(180deg, #ffffff 0%, #fffaf7 100%);
    }

    /* Cover image fills the top of the card */
    img[mat-card-image].card-cover-img {
      width: 100%;
      aspect-ratio: 16 / 11;
      object-fit: cover;
      margin: 0;
    }

    /* Placeholder when no image */
    .card-cover-placeholder {
      width: 100%;
      aspect-ratio: 16 / 11;
      background: var(--bg-tertiary, #f3f4f6);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .placeholder-icon {
      width: 2.5rem;
      height: 2.5rem;
      color: var(--text-muted, #d1d5db);
    }

    /* Header tweaks */
    mat-card-header {
      padding: 14px 16px 0;
      flex-direction: column;
      align-items: flex-start;
    }
    .type-chip-set {
      margin-bottom: 8px;
    }
    .type-chip-set .type-chip {
      --mdc-chip-label-text-size: 0.6rem;
      --mdc-chip-label-text-weight: 700;
      --mdc-chip-container-height: 20px;
      --mdc-chip-container-shape-radius: 999px;
      --mdc-chip-elevated-container-color: var(--color-primary-light, #FFF3ED);
      --mdc-chip-label-text-color: var(--color-primary, #FF6100);
      --mat-chip-selected-trailing-icon-color: var(--color-primary, #FF6100);
      background: var(--bg-accent-light, #FFF3ED) !important;
      color: var(--bg-accent, #FF6100) !important;
      border: 1px solid rgba(255, 97, 0, 0.12);
      box-shadow: none !important;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 6px;
    }
    .card-title {
      font-size: 1.05rem !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      color: var(--text-primary, #111827) !important;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: normal !important;
    }

    /* Content */
    mat-card-content {
      padding: 10px 16px 0;
      flex: 1 1 auto;
    }
    .card-excerpt {
      font-size: 0.9rem;
      color: var(--text-secondary, #4b5563);
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    /* Footer */
    mat-card-footer.card-footer {
      display: flex;
      align-items: center;
      padding: 12px 16px 16px;
      margin-top: auto;
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-height: 1.2rem;
    }
    .author-name {
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--text-secondary, #6b7280);
      line-height: 1.4;
    }
    .meta-secondary {
      font-size: 0.78rem;
      color: var(--text-tertiary, #9ca3af);
      line-height: 1.4;
    }
    .meta-separator {
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 97, 0, 0.28);
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

    :host-context(.dark) .content-card {
      box-shadow: none;
    }

    :host-context(.dark) .content-card:hover {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    }

    :host-context(.dark) .content-card.card-borderless {
      border-color: transparent;
      background: var(--bg-card, #1e1e1e);
    }

    :host-context(.dark) .type-chip-set .type-chip {
      background: rgba(255, 255, 255, 0.04) !important;
      color: var(--bg-accent, #FF6100) !important;
      border-color: rgba(255, 255, 255, 0.08);
    }

    :host-context(.dark) .meta-separator {
      background: var(--border-secondary, #3a3a3a);
    }

    @media (max-width: 768px) {
      img[mat-card-image].card-cover-img,
      .card-cover-placeholder {
        aspect-ratio: 16 / 10;
      }

      mat-card-header {
        padding: 12px 14px 0;
      }

      mat-card-content {
        padding: 8px 14px 0;
      }

      mat-card-footer.card-footer {
        padding: 10px 14px 14px;
      }

      .card-title {
        font-size: 0.98rem !important;
      }

      .card-excerpt {
        font-size: 0.84rem;
      }
    }
    `
  ]
})
export class ContentCardComponent {
  @Input() content!: ContentCardData;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showStatus = false;
  @Input() showActions = false;
  @Input() showMeta = false;
  @Input() clickable = true;
  @Input() actions: Array<{
    label: string;
    handler: (content: ContentCardData) => void;
    class?: string;
  }> = [];

  @Input() slug?: string;

  @Input() noBorder = false;

  constructor(private readonly router: Router) {}


  onTitleClick(): void {
    this.onCardClick();
  }

  onCardClick(): void {
    if (!this.clickable) return;

    const slugToUse = this.slug || this.content.slug;
    if (slugToUse && slugToUse !== '') {
      this.router.navigate(['/post', slugToUse]);
      return;
    }

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
      case 'book_review': return 'Book Review';
      default: return this.content.submissionType;
    }
  }


  sanitizeHtml(html: string | undefined): string {
    if (!html) return '';
    return StringUtils.stripHtml(html);
  }

  getDisplayDate(): string {
    const raw = this.content.publishedAt || this.content.createdAt;
    if (!raw) return '';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

}
