import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';

interface RelatedPost {
  _id: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorId: string;
  publishedAt: string;
  readingTime: number;
  viewCount: number;
  tags: string[];
  imageUrl?: string;
  slug?: string;
  submissionType: string;
}

@Component({
  selector: 'app-related-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './related-content.component.html',
  styleUrl: './related-content.component.css'
})
export class RelatedContentComponent implements OnInit {
  @Input() currentPostId: string = '';
  @Input() contentType: string = '';
  @Input() currentTags: string[] = [];
  @Input() layout: 'sidebar' | 'bottom' = 'bottom';

  relatedPosts: RelatedPost[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private backendService: BackendService,
    private router: Router,
    private htmlSanitizer: HtmlSanitizerService
  ) {}

  ngOnInit() {
    if (this.contentType) {
      this.loadRelatedContent();
    }
  }

  loadRelatedContent() {
    this.loading = true;
    this.error = null;

    // Get posts of the same type, excluding current post
    this.backendService.getSubmissions({
      status: 'published',
      limit: 10, // Get more posts in case we need to filter out current post
      skip: 0,
      sortBy: 'reviewedAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        let posts = data.submissions || [];
        
        // Filter by content type
        if (this.contentType) {
          posts = posts.filter((post: any) => 
            post.submissionType === this.contentType
          );
        }
        
        // Exclude current post
        if (this.currentPostId) {
          posts = posts.filter((post: any) => post._id !== this.currentPostId);
        }
        
        // Transform data to match our interface
        this.relatedPosts = posts.slice(0, this.layout === 'sidebar' ? 4 : 3).map((post: any) => ({
          _id: post._id,
          title: post.title,
          excerpt: post.excerpt || '',
          authorName: post.author?.username || 'Unknown Author',
          authorId: post.author?._id || '',
          publishedAt: post.publishedAt,
          readingTime: post.readingTime || 1,
          viewCount: post.viewCount || 0,
          tags: post.tags || [],
          imageUrl: post.imageUrl,
          slug: post.slug,
          submissionType: post.submissionType
        }));
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load related content';
        this.loading = false;
      }
    });
  }

  navigateToPost(post: RelatedPost) {
    if (post.slug) {
      this.router.navigate(['/post', post.slug]);
    } else {
      this.router.navigate(['/read', post._id]);
    }
  }

  navigateToAuthor(authorId: string) {
    this.router.navigate(['/user-profile', authorId]);
  }

  getContentTypeLabel(type: string): string {
    switch (type) {
      case 'poem': return 'Poem';
      case 'story': return 'Story';
      case 'article': return 'Article';
      case 'cinema_essay': return 'Cinema Essay';
      case 'opinion': return 'Opinion';
      default: return 'Content';
    }
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  truncateExcerpt(excerpt: string, maxLength: number = 120): string {
    return this.htmlSanitizer.truncateText(excerpt, maxLength);
  }

  trackByPostId(index: number, post: RelatedPost): string {
    return post._id;
  }
}