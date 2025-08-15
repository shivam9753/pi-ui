import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewTrackerService } from '../../../services/view-tracker.service';
import { PublishedContent } from '../../../models/submission.model';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-trending-posts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🔥 Trending Now
          </h3>
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400">Last 7 days</span>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="animate-pulse">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="flex-1">
                  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Trending Posts List -->
      @if (!loading && trendingPosts.length > 0) {
        <div class="space-y-4">
          @for (post of trendingPosts; track post._id; let index = $index) {
            <div class="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
              <!-- Rank Number -->
              <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                   [class]="getRankClass(index)">
                {{ index + 1 }}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <!-- Title -->
                <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {{ post.title }}
                </h4>
                
                <!-- Author and Type -->
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    by {{ post.author?.name || 'Anonymous' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                        [class]="getTypeClass(post.type)">
                    {{ getTypeLabel(post.type) }}
                  </span>
                </div>
              </div>

              <!-- Trending Stats -->
              <div class="flex-shrink-0 text-right">
                <div class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  {{ post.recentViews }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ post.viewCount }} total
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && trendingPosts.length === 0) {
        <div class="text-center py-8">
          <div class="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No trending posts yet</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">Check back soon for popular content!</p>
        </div>
      }

      <!-- View All Link -->
      @if (!loading && trendingPosts.length > 0 && showViewAll) {
        <div class="mt-6 text-center">
          <button class="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-amber-700 dark:hover:text-orange-300 transition-colors">
            View All Trending →
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class TrendingPostsComponent implements OnInit {
  @Input() limit = 5;
  @Input() showViewAll = true;
  
  trendingPosts: any[] = [];
  loading = true;

  constructor(private viewTracker: ViewTrackerService) {}

  ngOnInit() {
    this.loadTrendingPosts();
  }

  private loadTrendingPosts() {
    this.loading = true;
    this.viewTracker.getTrendingPosts(this.limit).subscribe({
      next: (posts) => {
        this.trendingPosts = posts;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.trendingPosts = [];
      }
    });
  }

  getRankClass(index: number): string {
    switch (index) {
      case 0: return 'bg-yellow-500 text-white'; // Gold
      case 1: return 'bg-gray-400 text-white';   // Silver  
      case 2: return 'bg-orange-600 text-white'; // Bronze
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'poem': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'article': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'story': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'poem': return 'Poetry';
      case 'article': return 'Article';
      case 'story': return 'Story';
      case 'cinema_essay': return 'Cinema';
      default: return type;
    }
  }

  refresh() {
    this.loadTrendingPosts();
  }
}