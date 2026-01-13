import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BackendService } from '../../../services/backend.service';
import { ContentCardComponent, ContentCardData } from '../content-card/content-card.component';

interface RandomPost {
  _id: string;
  title: string;
  submissionType?: string;
  excerpt?: string;
  imageUrl?: string;
  publishedAt?: string;
  viewCount?: number;
  readingTime?: number;
  slug?: string;
  author?: {
    _id?: string;
    name?: string;
    username?: string;
    profileImage?: string;
  };
}

@Component({
  selector: 'app-random-archive',
  standalone: true,
  imports: [CommonModule, RouterLink, ContentCardComponent],
  template: `
    <div class="py-8">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Discover from the archive</h2>
        <p class="text-sm text-gray-500">Hand-picked random posts to boost discoverability</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="ml-3 text-gray-500">Loading posts...</span>
        </div>
      }

      @if (!loading() && posts().length === 0) {
        <div class="text-center py-8 text-gray-500">No posts available right now</div>
      }

      @if (!loading() && posts().length > 0) {
        <div class="max-w-6xl mx-auto px-4">
          <div class="overflow-x-auto -mx-4 px-4">
            <div class="flex gap-4 snap-x snap-mandatory">
              @for (post of posts(); track post._id) {
                <div class="snap-start">
                  <app-content-card [content]="mapToContentCard(post)" [showMeta]="true" [clickable]="true" size="sm"></app-content-card>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [``]
})
export class RandomArchiveComponent implements OnInit {
  private readonly backendService = inject(BackendService);

  posts = signal<RandomPost[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadRandomPosts();
  }

  loadRandomPosts(limit = 4) {
    this.loading.set(true);

    this.backendService.getRandomSubmissions({ limit }).subscribe({
      next: (res: any) => {
        this.posts.set(res.submissions || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading random posts:', err);
        this.loading.set(false);
      }
    });
  }

  mapToContentCard(post: RandomPost): ContentCardData {
    return {
      id: post._id,
      title: post.title,
      description: undefined,
      excerpt: post.excerpt,
      authorName: post.author?.name || post.author?.username || 'Unknown',
      submissionType: post.submissionType || '',
      imageUrl: post.imageUrl,
      slug: post.slug,
      viewCount: post.viewCount || 0
    } as ContentCardData;
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatNumber(num: number): string {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
}
