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
        <div class="max-w-4xl mx-auto px-6 py-12">
          <!-- Back Navigation -->
          <div class="mb-8">
            <button 
              (click)="goBack()" 
              class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          <!-- Content Card -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <!-- Header -->
            <div class="p-8 pb-6 border-b border-gray-100">
              <!-- Content Type Badge -->
              @if (content()!.type) {
                <div class="mb-4">
                  <span class="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full uppercase tracking-wide">
                    {{ content()!.type }}
                  </span>
                </div>
              }
              
              <!-- Title -->
              <h1 class="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-6">
                {{ content()!.title }}
              </h1>

              <!-- Author and Metadata -->
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <a 
                    [routerLink]="['/profile', content()!.author._id]" 
                    class="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                    BY {{ content()!.author.name || content()!.author.username }}
                  </a>
                  <span class="text-gray-400">•</span>
                  <span class="text-gray-500 text-sm">
                    {{ content()!.publishedAt | date:'MMMM d, yyyy' }}
                  </span>
                </div>
                
                @if (content()!.isFeatured) {
                  <div class="flex items-center text-yellow-600">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="text-sm font-medium">Featured</span>
                  </div>
                }
              </div>
            </div>

            <!-- Content Body -->
            <div class="p-8">
              <div 
                class="prose prose-lg prose-gray max-w-none font-serif leading-relaxed"
                [innerHTML]="sanitizedContent()">
              </div>
              
              <!-- Tags -->
              @if (content()!.tags && content()!.tags.length > 0) {
                <div class="mt-12 pt-6 border-t border-gray-100">
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

            <!-- Footer -->
            <div class="p-6 bg-gray-50 border-t border-gray-100">
              <div class="flex items-center justify-between text-sm text-gray-600">
                <div class="flex items-center space-x-4">
                  <span>{{ content()!.viewCount || 0 }} views</span>
                  <span>{{ calculateReadingTime() }} min read</span>
                </div>
                
                <div class="flex items-center space-x-4">
                  <button 
                    (click)="shareContent()" 
                    class="hover:text-gray-900 transition-colors">
                    Share
                  </button>
                  <button 
                    (click)="printContent()" 
                    class="hover:text-gray-900 transition-colors">
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Content Not Found</h2>
            <p class="text-gray-600 mb-4">The requested content could not be found.</p>
            <button 
              (click)="goBack()" 
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go Back
            </button>
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

  calculateReadingTime(): number {
    if (!this.content()) return 0;
    const wordCount = this.content()!.body.split(/\s+/).length;
    return Math.ceil(wordCount / 200); // Assuming 200 words per minute
  }

  goBack() {
    window.history.back();
  }

  shareContent() {
    if (navigator.share && this.content()) {
      navigator.share({
        title: this.content()!.title,
        url: window.location.href
      });
    } else {
      // Fallback to copying URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }

  printContent() {
    window.print();
  }
}