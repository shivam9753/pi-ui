import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';
import { ContentCardComponent } from '../../shared/components';
import { Author } from '../../models';

interface RelatedPost {
  _id: string;
  title: string;
  excerpt: string;
  submissionType: string;
  imageUrl?: string;
  slug?: string;
  publishedAt: string;
  author: Author;
}

@Component({
  selector: 'app-related-content',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  templateUrl: './related-content.component.html',
  styleUrl: './related-content.component.css'
})
export class RelatedContentComponent implements OnInit {
  @Input() currentPostId: string = '';
  @Input() layout: 'sidebar' | 'bottom' | 'grid' = 'grid';

  //Need to implement this, currently showing random post
  relatedPosts: RelatedPost[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private readonly backendService: BackendService,
    private readonly router: Router,
    private readonly   htmlSanitizer: HtmlSanitizerService
  ) { }

  ngOnInit() {
      this.loadRelatedContent();
  }

  loadRelatedContent() {
    if (!this.currentPostId) return;

    this.loading = true;
    this.error = null;

    this.backendService.getRelatedSubmissions(this.currentPostId, this.layout === 'sidebar' ? 4 : 3).subscribe({
      next: (data) => {
        const posts = data.submissions || [];

        // Transform data to match our interface
        this.relatedPosts = posts.map((post: any) => ({
          _id: post._id,
          title: post.title,
          excerpt: post.excerpt || '',
          submissionType: post.submissionType,
          imageUrl: post.imageUrl,
          slug: post.slug,
          publishedAt: post.publishedAt,
          author: post.author
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