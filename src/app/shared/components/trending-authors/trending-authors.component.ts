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
  trendingContent: {
    _id: string;
    title: string;
    viewCount: number;
    featuredAt: string;
  };
}

@Component({
  selector: 'app-trending-authors',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="py-8">
      <!-- Section Header -->
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900">Who people are reading</h2>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="ml-3 text-gray-500">Loading authors...</span>
        </div>
      }

      @if (!loading() && trendingAuthors().length === 0) {
        <div class="text-center py-8 text-gray-500">
          No featured authors available at the moment
        </div>
      }

      @if (!loading() && trendingAuthors().length > 0) {
        <!-- Desktop: Grid Layout -->
        <div class="hidden md:grid grid-cols-5 gap-6 max-w-6xl mx-auto">
          @for (authorData of trendingAuthors(); track authorData._id) {
            <div
              class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer group relative"
              [routerLink]="['/author', authorData.author._id]">

              <!-- Trending Icon - Top Right -->
              <div class="absolute top-4 right-4">
                <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>

              <!-- Author Avatar -->
              <div class="text-center mb-4">
                @if (authorData.author.profileImage) {
                  <img
                    [src]="authorData.author.profileImage"
                    [alt]="authorData.author.name"
                    class="w-20 h-20 rounded-full mx-auto object-cover group-hover:scale-105 transition-transform duration-300">
                } @else {
                  <div class="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <span class="text-white font-bold text-xl">{{ getInitials(authorData.author.name) }}</span>
                  </div>
                }
              </div>

              <!-- Author Name -->
              <div class="text-center mb-4">
                <h3 class="font-semibold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                  {{ authorData.author.name }}
                </h3>
              </div>

              <!-- Trending Content -->
              <div class="text-center">
                <p class="text-sm text-gray-600 font-normal leading-tight"
                   style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  {{ authorData.trendingContent.title }}
                </p>
              </div>
            </div>
          }
        </div>

        <!-- Mobile: Horizontal Scroll -->
        <div class="md:hidden">
          <div class="flex overflow-x-auto gap-4 pb-4 px-6 -mx-6" style="scrollbar-width: none; -ms-overflow-style: none;">
            @for (authorData of trendingAuthors(); track authorData._id) {
              <div
                class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer group flex-shrink-0 w-56 relative"
                [routerLink]="['/author', authorData.author._id]">

                <!-- Trending Icon - Top Right -->
                <div class="absolute top-4 right-4">
                  <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>

                <!-- Author Avatar -->
                <div class="text-center mb-4">
                  @if (authorData.author.profileImage) {
                    <img
                      [src]="authorData.author.profileImage"
                      [alt]="authorData.author.name"
                      class="w-16 h-16 rounded-full mx-auto object-cover group-hover:scale-105 transition-transform duration-300">
                  } @else {
                    <div class="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <span class="text-white font-bold text-lg">{{ getInitials(authorData.author.name) }}</span>
                    </div>
                  }
                </div>

                <!-- Author Name -->
                <div class="text-center mb-4">
                  <h3 class="font-semibold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                    {{ authorData.author.name }}
                  </h3>
                </div>

                <!-- Trending Content -->
                <div class="text-center">
                  <p class="text-xs text-gray-600 font-normal leading-tight"
                     style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    {{ authorData.trendingContent.title }}
                  </p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Hide scrollbar for webkit browsers */
    .overflow-x-auto::-webkit-scrollbar {
      display: none;
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

    this.backendService.getTrendingAuthors({ limit: 5 }).subscribe({
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