import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';

@Component({
  selector: 'app-tag',
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.css'
})
export class TagComponent implements OnInit {
  tag: string = '';
  submissions: any[] = [];
  loading: boolean = true;
  visibleItemsCount: number = 12;
  loadMoreIncrement: number = 12;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.tag = params['tag'];
      this.loadTagContent();
    });
  }

  loadTagContent() {
    this.loading = true;
    this.backendService.getPublishedContentByTag(this.tag, {
      limit: 50, // Load more initially
      sortBy: 'createdAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        // Transform content-based response to match submissions format
        this.submissions = (data.contents || []).map((content: any) => ({
          _id: content._id,
          title: content.title,
          description: content.body,
          excerpt: content.body ? content.body.substring(0, 160) + '...' : '',
          submissionType: content.submission?.type || content.type,
          tags: content.tags,
          createdAt: content.publishedAt || content.createdAt,
          imageUrl: '', // Content doesn't have direct imageUrl, use submission's if available
          readingTime: Math.ceil((content.body || '').split(' ').length / 200), // Estimate reading time
          author: content.author
        }));
        this.loading = false;
      },
      error: (error) => {
        this.submissions = [];
        this.loading = false;
      }
    });
  }

  getTagDisplayName(): string {
    return this.tag.charAt(0).toUpperCase() + this.tag.slice(1);
  }

  openSubmission(submission: any) {
    // Navigate to the reading interface with SEO slug or fallback to ID
    if (submission.slug) {
      this.router.navigate(['/post', submission.slug]);
    } else if (submission.seo?.slug) {
      this.router.navigate(['/post', submission.seo.slug]);
    } else {
      // Fallback to ID if no slug available
      this.router.navigate(['/read', submission._id]);
    }
  }

  // Get submissions for display with pagination
  getDisplaySubmissions() {
    return this.submissions.slice(0, this.visibleItemsCount);
  }

  // Load more submissions
  loadMore() {
    this.visibleItemsCount += this.loadMoreIncrement;
  }

  // Check if there are more items to load
  hasMoreItems(): boolean {
    return this.visibleItemsCount < this.submissions.length;
  }

  // Clean content for display (same as explore component)
  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div>/g, '')           // Remove opening div tags
      .replace(/<\/div>/g, '<br>')     // Convert closing div tags to line breaks
      .replace(/<br\s*\/?>/g, '<br>')  // Normalize br tags
      .replace(/&nbsp;/g, ' ')         // Convert non-breaking spaces
      .replace(/&amp;/g, '&')          // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();                         // Remove leading/trailing whitespace
  }

  // Navigate back to explore
  goBackToExplore() {
    this.router.navigate(['/explore']);
  }
}