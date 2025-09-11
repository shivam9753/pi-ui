import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta, SafeHtml } from '@angular/platform-browser';
import { BackendService } from '../services/backend.service';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';

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
                  <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-3 sm:mb-4">
                    {{ content()!.title }}
                  </h1>

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
                      <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                        <span class="text-sm font-semibold text-orange-600">
                          {{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    }
                    
                    <div class="flex-1 min-w-0">
                      <h4 class="font-semibold text-gray-900">
                        {{ content()!.author.name || content()!.author.username }}
                      </h4>
                      
                      @if (content()!.author.name && content()!.author.username && content()!.author.name !== content()!.author.username) {
                        <p class="text-sm text-gray-500">{{ '@' + content()!.author.username }}</p>
                      }
                    </div>
                    
                    <a 
                      [routerLink]="['/profile', content()!.author._id]"
                      class="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 transition-colors flex-shrink-0">
                      View Profile
                    </a>
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

                <!-- Content Stats & Share - Mobile -->
                <div class="p-4">
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="text-center">
                      <div class="text-xs text-gray-500">Published</div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ content()!.publishedAt | date:'MMM d, y' }}
                      </div>
                    </div>
                    
                    @if (content()!.viewCount) {
                      <div class="text-center">
                        <div class="text-xs text-gray-500">Views</div>
                        <div class="text-sm font-medium text-gray-900">
                          {{ content()!.viewCount | number }}
                        </div>
                      </div>
                    }
                  </div>
                  
                  <!-- Share Buttons - Mobile -->
                  <div class="flex gap-2">
                    <button 
                      (click)="shareContent('link')"
                      class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors text-center">
                      Copy Link
                    </button>
                    <button 
                      (click)="shareContent('whatsapp')"
                      class="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors text-center">
                      WhatsApp
                    </button>
                  </div>
                </div>
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
                      <div class="w-20 h-20 rounded-full mx-auto mb-3 bg-orange-100 flex items-center justify-center border-2 border-gray-200">
                        <span class="text-xl font-semibold text-orange-600">
                          {{ (content()!.author.name || content()!.author.username).charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    }
                    
                    <h4 class="font-semibold text-gray-900 mb-1">
                      {{ content()!.author.name || content()!.author.username }}
                    </h4>
                    
                    @if (content()!.author.name && content()!.author.username && content()!.author.name !== content()!.author.username) {
                      <p class="text-sm text-gray-500 mb-3">{{ '@' + content()!.author.username }}</p>
                    }
                    
                    <a 
                      [routerLink]="['/profile', content()!.author._id]"
                      class="inline-block px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors">
                      View Profile
                    </a>
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

                <!-- Content Stats -->
                <div class="p-6">
                  <div class="space-y-3">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Published</span>
                      <span class="text-sm font-medium text-gray-900">
                        {{ content()!.publishedAt | date:'MMM d, y' }}
                      </span>
                    </div>
                    
                    @if (content()!.viewCount) {
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Views</span>
                        <span class="text-sm font-medium text-gray-900">
                          {{ content()!.viewCount | number }}
                        </span>
                      </div>
                    }
                    
                    @if (content()!.tags && content()!.tags.length > 0) {
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Tags</span>
                        <span class="text-sm font-medium text-gray-900">
                          {{ content()!.tags.length }}
                        </span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Share Section -->
                <div class="p-6 border-t border-gray-100">
                  <h4 class="text-sm font-semibold text-gray-900 mb-3">Share this content</h4>
                  <div class="flex gap-2">
                    <button 
                      (click)="shareContent('link')"
                      class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors text-center">
                      Copy Link
                    </button>
                    <button 
                      (click)="shareContent('whatsapp')"
                      class="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors text-center">
                      WhatsApp
                    </button>
                  </div>
                </div>
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

  content = signal<SimpleContent | null>(null);
  loading = signal(true);
  sanitizedContent = signal<SafeHtml>('');

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
    this.titleService.setTitle(`${content.title} - PoemsIndia`);
    this.metaService.updateTag({ 
      name: 'description', 
      content: this.getContentExcerpt(content.body) 
    });
  }

  private getContentExcerpt(html: string): string {
    // Strip HTML and get first 150 characters
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

  shareContent(type: 'link' | 'whatsapp') {
    const content = this.content();
    if (!content) return;

    const url = window.location.href;
    const title = content.title;
    const text = `Check out "${title}" by ${content.author.name || content.author.username}`;

    if (type === 'link') {
      // Copy link to clipboard
      navigator.clipboard.writeText(url).then(() => {
        // You could add a toast notification here
      });
    } else if (type === 'whatsapp') {
      // Share on WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} - ${url}`)}`;
      window.open(whatsappUrl, '_blank');
    }
  }

}