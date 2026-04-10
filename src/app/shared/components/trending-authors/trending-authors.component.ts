import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BackendService } from '../../../services/backend.service';

interface TrendingAuthor {
  _id: string;
  author: {
    _id: string;
    name: string;
    username: string;
    profileImage?: string;
    bio?: string;
  };
  totalViews: number;
  featuredCount: number;
  // trendingContent may be absent for some authors — mark optional
  trendingContent?: {
    _id: string;
    title: string;
    viewCount: number;
    featuredAt: string;
  };
  // backend returns `topSubmission` in aggregation; include as optional fallback
  topSubmission?: {
    _id: string;
    title: string;
    viewCount?: number;
    periodViews?: number;
  };
}

@Component({
  selector: 'app-trending-authors',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="trending-authors-section">
      <!-- Section Header -->
      <div class="section-header">
        <div>
          <p class="section-kicker">Trending Poets</p>
          <h2 class="section-title">Poets readers are discovering most this week</h2>
        </div>
        <p class="section-subtitle">Ranked by featured poem views from the last 7 days.</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="ml-3 text-gray-500">Loading authors...</span>
        </div>
      }

      @if (!loading() && trendingAuthors().length === 0) {
        <div class="text-center py-8 text-gray-500">
          No featured poets available at the moment
        </div>
      }

      @if (!loading() && trendingAuthors().length > 0) {
        <!-- Desktop: Grid Layout -->
        <div class="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
          @for (authorData of trendingAuthors().slice(0, 4); track authorData._id) {
            <div
              class="author-card group"
              [routerLink]="['/author', authorData.author._id]">

              <!-- Trending Icon - Top Right -->
              <div class="author-card__icon">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>

              <!-- Author Avatar -->
              <div class="author-card__avatar-wrap">
                @if (authorData.author.profileImage) {
                  <img
                    [src]="authorData.author.profileImage"
                    [alt]="authorData.author.name"
                    class="author-card__avatar">
                } @else {
                  <div class="author-card__avatar author-card__avatar--fallback">
                    <span>{{ getInitials(authorData.author.name) }}</span>
                  </div>
                }
              </div>

              <div class="author-card__body">
                <h3 class="author-card__name">
                  {{ authorData.author.name }}
                </h3>
                @if (authorData.trendingContent?.title || authorData.topSubmission?.title) {
                  <p class="author-card__poem-title">
                    {{ authorData.trendingContent?.title || authorData.topSubmission?.title }}
                  </p>
                }
                <div class="author-card__meta">
                  <span>{{ formatNumber(authorData.totalViews) }} views this week</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Mobile: Horizontal Scroll -->
        <div class="md:hidden">
          <div class="authors-scroll">
            @for (authorData of trendingAuthors().slice(0, 4); track authorData._id) {
              <div
                class="author-card author-card--mobile group"
                [routerLink]="['/author', authorData.author._id]">

                <div class="author-card__icon">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>

                <div class="author-card__avatar-wrap">
                  @if (authorData.author.profileImage) {
                    <img
                      [src]="authorData.author.profileImage"
                      [alt]="authorData.author.name"
                      class="author-card__avatar author-card__avatar--mobile">
                  } @else {
                    <div class="author-card__avatar author-card__avatar--fallback author-card__avatar--mobile">
                      <span>{{ getInitials(authorData.author.name) }}</span>
                    </div>
                  }
                </div>

                <div class="author-card__body">
                  <h3 class="author-card__name">
                    {{ authorData.author.name }}
                  </h3>
                  @if (authorData.trendingContent?.title || authorData.topSubmission?.title) {
                    <p class="author-card__poem-title">
                      {{ authorData.trendingContent?.title || authorData.topSubmission?.title }}
                    </p>
                  }
                  <div class="author-card__meta">
                    <span>{{ formatNumber(authorData.totalViews) }} views this week</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .trending-authors-section {
      padding: 0.5rem 0 0;
    }

    .section-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .section-kicker {
      margin: 0 0 0.35rem;
      color: var(--bg-accent, #ff6100);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .section-title {
      margin: 0;
      color: var(--text-primary, #111827);
      font-size: clamp(1.6rem, 2vw, 2.25rem);
      line-height: 1.1;
      font-weight: 700;
    }

    .section-subtitle {
      margin: 0;
      color: var(--text-secondary, #6b7280);
      font-size: 0.95rem;
      max-width: 22rem;
      text-align: right;
      line-height: 1.5;
    }

    .author-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 1.25rem;
      border-radius: 20px;
      border: 1px solid var(--border-primary, rgba(255, 97, 0, 0.14));
      background: var(--bg-card, #fff);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    }

    .author-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 97, 0, 0.24);
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.09);
    }

    .author-card__icon {
      position: absolute;
      top: 1rem;
      right: 1rem;
      color: var(--bg-accent, #ff6100);
      opacity: 0.85;
    }

    .author-card__avatar-wrap {
      margin-bottom: 1rem;
    }

    .author-card__avatar {
      width: 72px;
      height: 72px;
      border-radius: 999px;
      object-fit: cover;
      display: block;
      border: 2px solid rgba(255, 97, 0, 0.12);
    }

    .author-card__avatar--mobile {
      width: 64px;
      height: 64px;
    }

    .author-card__avatar--fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--bg-accent, #ff6100), var(--bg-accent-hover, #ff752b));
      color: white;
      font-size: 1.4rem;
      font-weight: 700;
    }

    .author-card__body {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      min-height: 100%;
    }

    .author-card__name {
      margin: 0;
      color: var(--text-primary, #111827);
      font-size: 1.15rem;
      line-height: 1.2;
      font-weight: 700;
    }

    .author-card__poem-title {
      margin: 0;
      color: var(--text-secondary, #4b5563);
      font-size: 0.92rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .author-card__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.45rem;
      color: var(--text-tertiary, #8f8f8f);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .author-card__dot {
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 97, 0, 0.28);
    }

    .authors-scroll {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding: 0.25rem 0 0.5rem;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .author-card--mobile {
      width: 250px;
      flex-shrink: 0;
    }

    /* Hide scrollbar for webkit browsers */
    .authors-scroll::-webkit-scrollbar {
      display: none;
    }

    :host-context(.dark) .author-card {
      border-color: var(--border-primary, #2f2f2f);
      background: var(--bg-card, #1e1e1e);
      box-shadow: none;
    }

    :host-context(.dark) .author-card:hover {
      border-color: var(--border-secondary, #3a3a3a);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.16);
    }

    :host-context(.dark) .author-card__avatar {
      border-color: rgba(255, 255, 255, 0.08);
    }

    :host-context(.dark) .author-card__dot {
      background: var(--border-secondary, #3a3a3a);
    }

    :host-context(.dark) .author-card__poem-title {
      color: var(--text-secondary, #c4c4c4);
    }

    @media (max-width: 768px) {
      .trending-authors-section {
        padding-top: 0;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        margin-bottom: 1.25rem;
      }

      .section-subtitle {
        text-align: left;
        max-width: none;
        font-size: 0.9rem;
      }
    }
  `]
})
export class TrendingAuthorsComponent implements OnInit {
  private backendService = inject(BackendService);

  trendingAuthors = signal<TrendingAuthor[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadTrendingAuthors();
  }

  private loadTrendingAuthors() {
    this.loading.set(true);

    const options = { limit: 5, windowDays: 7 };

    this.backendService.getTrendingAuthors(options).subscribe({
      next: (response) => {
        this.trendingAuthors.set(response.authors || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading trending authors:', err);
        this.loading.set(false);
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }
}
