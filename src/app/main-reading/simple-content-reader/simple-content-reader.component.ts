import { Component, OnInit, signal, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta, SafeHtml } from '@angular/platform-browser';
import { BackendService } from '../../services/backend.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';
import { ViewTrackerService } from '../../services/view-tracker.service';

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
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (loading()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="animate-pulse text-gray-600">Loading...</div>
        </div>
      } @else if (content()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <!-- Two Column Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Main Content Column -->
            <div class="lg:col-span-2">
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  <div 
                    class="prose prose-lg prose-gray max-w-none font-serif leading-relaxed"
                    [innerHTML]="sanitizedContent()">
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

            <!-- Author Info - Mobile (Bottom) -->
            <div class="lg:hidden">
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <!-- Author Header -->
                <div class="p-4 border-b border-gray-100">
                  <h3 class="text-base font-semibold text-gray-900 mb-3">About the Author</h3>
                  
                  <!-- Author Profile -->
                  <div class="flex items-center space-x-4">
                    @if (content()!.author.profileImage) {
                      <img 
                        [src]="content()!.author.profileImage" 
                        [alt]="content()!.author.name || content()!.author.username"
                        class="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0">
                    } @else {
                      <div class="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                        <span class="text-sm font-semibold text-primary">
                          {{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    }
                    
                    <div class="flex-1 min-w-0">
                      <h4 class="font-semibold text-gray-900">
                        {{ content()!.author.name || content()!.author.username }}
                      </h4>
                      
                    </div>
                    
                  </div>
                  
                  <!-- Author Bio - Mobile -->
                  @if (content()!.author.bio) {
                    <div class="mt-3 pt-3 border-t border-gray-100">
                      <p class="text-sm text-gray-600 leading-relaxed">
                        {{ content()!.author.bio }}
                      </p>
                    </div>
                  }
                </div>

                <!-- Other Works - Mobile -->
                @if (content()!.authorFeaturedContent?.length) {
                  <div class="p-4 border-t border-gray-100">
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">More by {{ content()!.author.name || content()!.author.username }}</h4>
                    <div class="space-y-2">
                      @for (work of content()!.authorFeaturedContent; track work._id) {
                        <a 
                          [routerLink]="['/content', work._id]"
                          class="block p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div class="text-sm font-medium text-gray-900 line-clamp-2">{{ work.title }}</div>
                          <div class="text-xs text-gray-500 mt-1">
                            {{ work.submissionType }} • {{ work.viewCount | number }} views
                          </div>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Author Sidebar - Desktop -->
            <div class="hidden lg:block">
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                <!-- Author Header -->
                <div class="p-6 border-b border-gray-100">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">About the Author</h3>
                  
                  <!-- Author Profile -->
                  <div class="text-center">
                    @if (content()!.author.profileImage) {
                      <img 
                        [src]="content()!.author.profileImage" 
                        [alt]="content()!.author.name || content()!.author.username"
                        class="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-gray-200">
                    } @else {
                      <div class="w-20 h-20 rounded-full mx-auto mb-3 bg-primary-light flex items-center justify-center border-2 border-gray-200">
                        <span class="text-xl font-semibold text-primary">
                          {{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    }
                    
                    <h4 class="font-semibold text-gray-900 mb-1">
                      {{ content()!.author.name || content()!.author.username }}
                    </h4>
                    
                    
                  </div>
                  
                  <!-- Author Bio -->
                  @if (content()!.author.bio) {
                    <div class="mt-4 pt-4 border-t border-gray-100">
                      <p class="text-sm text-gray-600 leading-relaxed">
                        {{ content()!.author.bio }}
                      </p>
                    </div>
                  }
                </div>

                <!-- Other Featured Works -->
                @if (content()!.authorFeaturedContent?.length) {
                  <div class="p-6 border-t border-gray-100">
                    <h4 class="text-sm font-semibold text-gray-900 mb-4">More by {{ content()!.author.name || content()!.author.username }}</h4>
                    <div class="space-y-3">
                      @for (work of content()!.authorFeaturedContent; track work._id) {
                        <a 
                          [routerLink]="['/content', work._id]"
                          class="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                          <div class="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{{ work.title }}</div>
                          <div class="text-xs text-gray-500">
                            {{ work.submissionType }} • {{ work.viewCount | number }} views
                          </div>
                          <div class="text-xs text-gray-400 mt-1">
                            Featured {{ work.featuredAt | date:'MMM d, y' }}
                          </div>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
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
  private router = inject(Router);
  private backendService = inject(BackendService);
  private htmlSanitizer = inject(HtmlSanitizerService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private viewTracker = inject(ViewTrackerService);

  content = signal<SimpleContent | null>(null);
  loading = signal(true);
  sanitizedContent = signal<SafeHtml>('');

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
          this.sanitizedContent.set(
            this.htmlSanitizer.cleanContentPreservingBreaks(response.body)
          );
          this.updatePageMeta(response);

          // Track view for this content (only in browser)
          if (isPlatformBrowser(this.platformId)) {
            this.viewTracker.logContentView(response._id).subscribe({
              next: (viewResponse) => {
                if (viewResponse.success) {
                  const currentContent = this.content();
                  if (currentContent) {
                    const updatedContent = {
                      ...currentContent,
                      viewCount: viewResponse.viewCount
                    };
                    this.content.set(updatedContent);
                  }
                }
              },
              error: (err) => {
                console.warn('Failed to log content view:', err);
              }
            });
          }
        } else {
          this.content.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading content:', err);
        this.content.set(null);
        this.loading.set(false);
      }
    });
  }

  private updatePageMeta(content: SimpleContent) {
    try {
      this.titleService.setTitle(`${content.title} - PoemsIndia`);
      this.metaService.updateTag({ name: 'description', content: this.getContentExcerpt(content.body) });
    } catch (e) {
      // safe no-op during SSR or if services are unavailable
      console.warn('updatePageMeta failed:', e);
    }
  }

  private getContentExcerpt(html: string): string {
    // Strip HTML and get first 150 characters
    const text = html ? String(html).replace(/<[^>]*>/g, '') : '';
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

}