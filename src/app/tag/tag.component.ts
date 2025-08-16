import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { CommonUtils } from '../shared/utils';

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
    
    // Get all published submissions and filter by tag on the frontend
    // This ensures we catch tags in all locations (SEO keywords, content tags, submission tags)
    this.backendService.getPublishedContent('', { 
      limit: 100, // Get a larger set to filter from
      skip: 0,
      sortBy: 'reviewedAt', 
      order: 'desc' 
    }).subscribe({
      next: (data) => {
        const allSubmissions = data.submissions || [];
        
        // Filter submissions that have the tag in any location
        const matchingSubmissions = allSubmissions.filter((submission: any) => {
          const lowerTag = this.tag.toLowerCase();
          
          // Check SEO keywords
          if (submission.seo?.keywords) {
            const hasInKeywords = submission.seo.keywords.some((keyword: string) => 
              keyword.toLowerCase() === lowerTag
            );
            if (hasInKeywords) return true;
          }
          
          // Check content tags
          if (submission.contents) {
            const hasInContentTags = submission.contents.some((content: any) => 
              content.tags && content.tags.some((tag: string) => 
                tag.toLowerCase() === lowerTag
              )
            );
            if (hasInContentTags) return true;
          }
          
          // Check main submission tags
          if (submission.tags) {
            const hasInSubmissionTags = submission.tags.some((tag: string) => 
              tag.toLowerCase() === lowerTag
            );
            if (hasInSubmissionTags) return true;
          }
          
          return false;
        });
        
        // Transform to expected format
        this.submissions = matchingSubmissions.map((submission: any) => ({
          _id: submission._id,
          title: submission.title,
          description: submission?.description,
          excerpt: submission?.excerpt,
          submissionType: submission.submissionType,
          tags: this.getAllTagsFromSubmission(submission),
          createdAt: submission.reviewedAt || submission.createdAt,
          imageUrl: submission.imageUrl,
          readingTime: submission.readingTime || 5,
          author: submission.author || { name: 'Anonymous' },
          slug: submission.seo?.slug || submission.slug
        }));
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tagged content:', error);
        this.submissions = [];
        this.loading = false;
      }
    });
  }
  
  // Helper method to get all tags from a submission
  private getAllTagsFromSubmission(submission: any): string[] {
    const allTags = new Set<string>();
    
    // Add SEO keywords
    if (submission.seo?.keywords) {
      submission.seo.keywords.forEach((tag: string) => allTags.add(tag));
    }
    
    // Add content tags
    if (submission.contents) {
      submission.contents.forEach((content: any) => {
        if (content.tags) {
          content.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
    }
    
    // Add main submission tags
    if (submission.tags) {
      submission.tags.forEach((tag: string) => allTags.add(tag));
    }
    
    return Array.from(allTags);
  }

  getTagDisplayName(): string {
    return CommonUtils.capitalizeFirstOnly(this.tag);
  }

  openSubmission(submission: any) {
    // Navigate to the reading interface with SEO slug or fallback to ID
    if (submission.slug) {
      this.router.navigate(['/post', submission.slug]);
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