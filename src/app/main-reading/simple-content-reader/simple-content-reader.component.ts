import { Component, OnInit, signal, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { BackendService } from '../../services/backend.service';
import { ViewTrackerService } from '../../services/view-tracker.service';
import { ThemingService } from '../../services/theming.service';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';

interface SimpleContent {
  _id: string;
  title: string;
  body: string;
  type: string;
  author: {
    _id: string;
    username: string;
    name: string;
    profileImage?: string;
    bio?: string;
  };
  publishedAt: string;
  viewCount: number;
  tags: any[]; // support tag objects { _id, name, slug } or legacy strings
  slug?: string;
  isFeatured?: boolean;
  featuredAt?: string;
  authorFeaturedContent?: AuthorFeaturedContent[];
}

interface AuthorFeaturedContent {
  _id: string;
  title: string;
  viewCount: number;
  featuredAt: string;
  submissionType: string;
  slug?: string;
}

@Component({
  selector: 'app-simple-content-reader',
  imports: [
    CommonModule,
    RouterLink,
    ContentRendererComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <div class="reader-page" [class.dark]="themingService.isDark()">

      @if (loading()) {
        <div class="reader-loading">
          <div class="reader-loading-dot"></div>
        </div>
      } @else if (content()) {

        <div class="reader-shell">

          <!-- ── Article header ── -->
          <header class="reader-header">
            @if (content()!.type) {
              <span class="type-badge">{{ content()!.type }}</span>
            }
            <h1 class="reader-title">{{ content()!.title }}</h1>
            <p class="reader-byline">by {{ content()!.author.name || content()!.author.username }}</p>
          </header>

          <mat-divider class="reader-divider"></mat-divider>

          <!-- ── Content body ── -->
          <section class="reader-body">
            <app-content-renderer [html]="content()!.body" [initialFontSize]="18"></app-content-renderer>
          </section>

          <!-- ── Tags ── -->
          @if (content()!.tags && content()!.tags.length > 0) {
            <div class="reader-tags">
              @for (tag of content()!.tags; track tag) {
                <button class="tag-chip" (click)="onTagClick(tag, $event)">
                  #{{ getTagDisplayName(tag) }}
                </button>
              }
            </div>
          }

          <mat-divider class="reader-divider"></mat-divider>

          <!-- ── Author strip ── -->
          <div class="author-strip">
            <a [routerLink]="['/author', content()!.author.username]" class="author-avatar-link">
              @if (content()!.author.profileImage) {
                <img
                  [src]="content()!.author.profileImage"
                  [alt]="content()!.author.name || content()!.author.username"
                  class="author-avatar" />
              } @else {
                <div class="author-avatar author-avatar--fallback">
                  <span>{{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}</span>
                </div>
              }
            </a>

            <div class="author-info">
              <a [routerLink]="['/author', content()!.author.username]" class="author-name-link">
                {{ content()!.author.name || content()!.author.username }}
              </a>
              @if (content()!.author.bio) {
                <p class="author-bio">{{ content()!.author.bio }}</p>
              }
              @if (content()!.authorFeaturedContent?.length) {
                <div class="author-more-works">
                  <span class="more-works-label">More by this author</span>
                  @for (work of content()!.authorFeaturedContent; track work._id) {
                    <a [routerLink]="['/content', work._id]" class="more-work-link">
                      {{ work.title }}
                    </a>
                  }
                </div>
              }
            </div>
          </div>

        </div>

      } @else {
        <div class="reader-not-found">
          <h2 class="not-found-title">Content Not Found</h2>
          <p class="not-found-sub">The requested content could not be found.</p>
        </div>
      }
    </div>
  `,
  styleUrl: './simple-content-reader.component.css'
})
export class SimpleContentReaderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly backendService = inject(BackendService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly viewTracker = inject(ViewTrackerService);
  private readonly router = inject(Router);
  public readonly themingService = inject(ThemingService);

  content = signal<SimpleContent | null>(null);
  loading = signal(true);

  // Helper to render tag display name
  getTagDisplayName(tag: any): string {
    if (!tag) return '';
    if (typeof tag === 'string') return tag.replace(/^#+/, '').trim() || '';
    if (typeof tag === 'object') {
      if (tag.name && typeof tag.name === 'string' && tag.name.trim().length > 0) return tag.name;
      if (tag.slug && typeof tag.slug === 'string') return tag.slug.replace(/-/g, ' ');
      if (tag._id) return String(tag._id);
    }
    return '';
  }

  onTagClick(tag: any, event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!tag) return;

    let routeValue: string | null = null;
    if (typeof tag === 'string') {
      routeValue = tag.trim().toLowerCase().replace(/\s+/g, '-');
    } else if (typeof tag === 'object') {
      routeValue = (tag.slug && String(tag.slug).trim()) ? String(tag.slug).trim()
        : (tag._id && String(tag._id).trim()) ? String(tag._id).trim()
        : (tag.name && String(tag.name).trim()) ? String(tag.name).trim().toLowerCase().replace(/\s+/g, '-')
        : null;
    }

    if (routeValue) {
      this.router.navigate(['/tag', routeValue]);
    }
  }

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const contentId = params['id'];
      if (contentId) {
        this.loadContent(contentId);
      }
    });
  }

  private loadContent(id: string) {
    this.loading.set(true);

    // Use the specific getContentById method to fetch a single content piece
    this.backendService.getContentById(id).subscribe({
      next: (response) => {
        // Response should contain the content directly
        if (response && response._id) {
          this.content.set(response);
          this.updatePageMeta(response);

          // Track view for this content (only in browser)
          if (isPlatformBrowser(this.platformId)) {
            // Force logging to ensure views are recorded even if session dedupe exists (useful during testing or explicit reload)
            this.viewTracker.logContentView(response._id, true).subscribe({
              next: (viewResponse) => {
                if (viewResponse && viewResponse.success) {
                  const currentContent = this.content();
                  if (currentContent) {
                    currentContent.viewCount = (currentContent.viewCount || 0) + 1;
                    this.content.set(currentContent);
                  }
                }
              },
              error: (err) => {
                // Silent fail for view tracking errors
                console.warn('[ViewTracker] logContentView error', err);
              }
            });
          }
        }
      },
      error: () => {
        this.loading.set(false);
        // Handle error (e.g., show a notification or redirect)
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  private updatePageMeta(content: SimpleContent) {
    try {
      // Basic meta updates for simple content reader
      this.titleService.setTitle(`${content.title} — Poems in India`);
      const description = (content.body || '').substring(0, 150) + (content.body && content.body.length > 150 ? '...' : '');
      this.metaService.updateTag({ name: 'description', content: description });
      // Open Graph tags
      this.metaService.updateTag({ property: 'og:title', content: content.title } as any);
      this.metaService.updateTag({ property: 'og:description', content: description } as any);
      this.metaService.updateTag({ property: 'og:image', content: content.author?.profileImage || 'default-image-url' } as any);
      this.metaService.updateTag({ property: 'og:url', content: typeof window !== 'undefined' ? window.location.href : '' } as any);
    } catch (e) {
      // ignore meta update failures
      console.warn('[SimpleContentReader] updatePageMeta error', e);
    }
  }
}