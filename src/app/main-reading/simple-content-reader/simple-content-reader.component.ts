import { Component, OnInit, signal, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { BackendService } from '../../services/backend.service';
import { ViewTrackerService } from '../../services/view-tracker.service';
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
  tags: string[];
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
  imports: [CommonModule, RouterLink, ContentRendererComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (loading()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="animate-pulse text-gray-600">Loading...</div>
        </div>
      } @else if (content()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <!-- Two Column Layout (main content only) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <!-- Main Content Column (no surrounding box) -->
            <div class="lg:col-span-2">
              <!-- removed bg/rounded/border/shadow to make it unboxed -->
              <div>
                <!-- Header -->
                <div class="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100">
                  <!-- Content Type Badge -->
                  @if (content()!.type) {
                    <div class="mb-3">
                      <span class="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full uppercase tracking-wide">
                        {{ content()!.type }}
                      </span>
                    </div>
                  }

                  <!-- Title -->
                  <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-2">
                    {{ content()!.title }}
                  </h1>

                  <!-- Author Name -->
                  <p class="text-lg text-gray-600 mb-3 sm:mb-4">
                    by {{ content()!.author.name || content()!.author.username }}
                  </p>

                </div>

                <!-- Content Body -->
                <div class="p-4 sm:p-6">
                  <div class="prose prose-lg prose-gray max-w-none font-serif leading-relaxed">
                    <app-content-renderer [html]="content()!.body" [initialFontSize]="18"></app-content-renderer>
                  </div>

                  <!-- Tags -->
                  @if (content()!.tags && content()!.tags.length > 0) {
                    <div class="mt-8 pt-4 border-t border-gray-100">
                      <div class="flex flex-wrap gap-2">
                        @for (tag of content()!.tags; track tag) {
                          <span class="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                            #{{ tag }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right column removed (author moved below) -->

          </div>

          <!-- Author Section moved below content, simplified and unboxed -->
          @if (content()) {
            <div class="mt-8 flex items-start gap-4">
              <!-- Author avatar -->
              <div class="flex-shrink-0">
                @if (content()!.author.profileImage) {
                  <img
                    [src]="content()!.author.profileImage"
                    [alt]="content()!.author.name || content()!.author.username"
                    class="w-16 h-16 rounded-full object-cover">
                } @else {
                  <div class="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
                    <span class="text-lg font-semibold text-primary">
                      {{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}
                    </span>
                  </div>
                }
              </div>

              <!-- Author details (no heading) -->
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-900">
                  {{ content()!.author.name || content()!.author.username }}
                </div>

                @if (content()!.author.bio) {
                  <div class="text-sm text-gray-600 mt-1 leading-relaxed">
                    {{ content()!.author.bio }}
                  </div>
                }

                @if (content()!.authorFeaturedContent?.length) {
                  <div class="mt-3 space-y-2">
                    @for (work of content()!.authorFeaturedContent; track work._id) {
                      <a [routerLink]="['/content', work._id]" class="text-sm text-primary hover:underline block">
                        {{ work.title }}
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          }

        </div>
      } @else {
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Content Not Found</h2>
            <p class="text-gray-600">The requested content could not be found.</p>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './simple-content-reader.component.css'
})
export class SimpleContentReaderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private backendService = inject(BackendService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private viewTracker = inject(ViewTrackerService);

  content = signal<SimpleContent | null>(null);
  loading = signal(true);
  // sanitizedContent removed — ContentRenderer handles cleaning

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

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
            this.viewTracker.logContentView(response._id).subscribe({
              next: (viewResponse) => {
                if (viewResponse.success) {
                  const currentContent = this.content();
                  if (currentContent) {
                    // Increment the view count optimistically
                    currentContent.viewCount++;
                    this.content.set(currentContent);
                  }
                }
              },
              error: () => {
                // Handle view tracking error if needed
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
    // Update title
    this.titleService.setTitle(content.title + ' - Your Site Name');

    // Update meta tags
    this.metaService.updateTag({ name: 'description', content: content.body.substring(0, 150) + '...' });
    this.metaService.updateTag({ property: 'og:title', content: content.title });
    this.metaService.updateTag({ property: 'og:description', content: content.body.substring(0, 150) + '...' });
    this.metaService.updateTag({ property: 'og:image', content: content.author.profileImage || 'default-image-url' });
  }
}