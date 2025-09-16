import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { BackendService } from '../services/backend.service';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';

interface FeaturedPoem {
  _id: string;
  title: string;
  body?: string;
  type?: string;
  author: {
    _id: string;
    username: string;
    name: string;
    profileImage?: string;
  };
  publishedAt?: string;
  viewCount?: number;
  tags?: string[];
  isFeatured?: boolean;
  featuredAt?: string;
}

@Component({
  selector: 'app-featured-poems',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-6 py-12">
          <div class="text-center">
            <h1 class="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
              Featured Poems
            </h1>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-6xl mx-auto px-6 py-12">
        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="animate-pulse text-gray-600 text-lg">Loading featured poems...</div>
          </div>
        } @else if (featuredPoems().length === 0) {
          <div class="text-center py-20">
            <div class="mb-6">
              <svg class="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">No Featured Poems</h2>
            <p class="text-gray-600 mb-6">
              We're currently curating exceptional poetry for this collection. Check back soon!
            </p>
            <a 
              routerLink="/explore" 
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              Explore All Content
            </a>
          </div>
        } @else {
          <!-- Featured Poems Grid -->
          <div class="grid gap-4 md:gap-6">
            @for (poem of featuredPoems(); track poem._id) {
              <div 
                (click)="readPoem(poem._id)"
                class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                
                <!-- Title -->
                <h2 class="text-xl md:text-2xl font-serif font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors cursor-pointer">
                  {{ poem.title }}
                </h2>

                <!-- Author -->
                <div class="mb-4">
                  <a 
                    [routerLink]="['/author', poem.author._id]" 
                    (click)="$event.stopPropagation()"
                    class="text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer">
                    {{ poem.author.name || poem.author.username }}
                  </a>
                </div>

                <!-- Tags -->
                @if (poem.tags && poem.tags.length > 0) {
                  <div class="flex flex-wrap gap-2">
                    @for (tag of poem.tags.slice(0, 8); track tag) {
                      <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        #{{ tag }}
                      </span>
                    }
                    @if (poem.tags.length > 8) {
                      <span class="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded-full">
                        +{{ poem.tags.length - 8 }} more
                      </span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Load More Button -->
          @if (hasMore()) {
            <div class="text-center mt-12">
              <button 
                (click)="loadMorePoems()"
                [disabled]="loading()"
                class="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                @if (loading()) {
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                } @else {
                  Load More Poems
                }
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styleUrls: []
})
export class FeaturedPoemsComponent implements OnInit {
  private backendService = inject(BackendService);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private htmlSanitizer = inject(HtmlSanitizerService);

  featuredPoems = signal<FeaturedPoem[]>([]);
  loading = signal(false);
  hasMore = signal(false);
  currentPage = 1;
  itemsPerPage = 10;

  ngOnInit() {
    this.setupPageMeta();
    this.loadFeaturedPoems();
  }

  private setupPageMeta() {
    this.titleService.setTitle('Featured Poems - PoemsIndia');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Discover exceptional poetry handpicked by our editorial team. Featured poems showcase the finest voices and craftsmanship in contemporary poetry.' 
    });
    this.metaService.updateTag({ 
      property: 'og:title', 
      content: 'Featured Poems - PoemsIndia' 
    });
    this.metaService.updateTag({ 
      property: 'og:description', 
      content: 'Discover exceptional poetry handpicked by our editorial team.' 
    });
  }

  private loadFeaturedPoems(loadMore = false) {
    this.loading.set(true);

    const skip = loadMore ? (this.currentPage - 1) * this.itemsPerPage : 0;
    
    const params = {
      published: true,
      featured: true,
      type: 'poem',
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: 'featuredAt',
      order: 'desc' as const,
      fields: 'title,author,tags'
    };

    this.backendService.getContent(params).subscribe({
      next: (response) => {
        const newPoems = response.contents || [];
        
        if (loadMore) {
          this.featuredPoems.update(poems => [...poems, ...newPoems]);
        } else {
          this.featuredPoems.set(newPoems);
          this.currentPage = 1;
        }

        this.hasMore.set(response.pagination?.hasMore || false);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading featured poems:', err);
        this.loading.set(false);
      }
    });
  }

  loadMorePoems() {
    if (!this.loading() && this.hasMore()) {
      this.currentPage++;
      this.loadFeaturedPoems(true);
    }
  }

  readPoem(poemId: string) {
    this.router.navigate(['/content', poemId]);
  }

}