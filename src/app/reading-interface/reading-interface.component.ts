import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { BackendService } from '../services/backend.service';
import { ThemeService } from '../services/theming.service';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';
import { BadgeLabelComponent } from '../utilities/badge-label/badge-label.component';
import { RelatedContentComponent } from '../utilities/related-content/related-content.component';

interface PublishedContent {
  _id: string;
  title: string;
  description: string;
  submissionType: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
  readingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  imageUrl?: string;
  excerpt: string;
  contents: ContentItem[];
  isLiked: boolean;
  isBookmarked: boolean;
}

interface ContentItem {
  title: string;
  body: string;
  wordCount: number;
  tags: string[];
}

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
}
@Component({
  selector: 'app-reading-interface',
  imports: [CommonModule, FormsModule, RouterLink, BadgeLabelComponent, RelatedContentComponent],
  templateUrl: './reading-interface.component.html',
  styleUrl: './reading-interface.component.css'
})
export class ReadingInterfaceComponent {
content = signal<PublishedContent | null>(null);
  comments = signal<Comment[]>([]);
  relatedContent = signal<PublishedContent[]>([]);
  
  // Reading settings
  fontSize = signal(16);
  lineHeight = signal(1.6);
  isReaderMode = signal(false);
  readingProgress = signal(0);
  
  // Enhanced reading controls
  isFocusMode = signal(false);
  layoutMode = signal<'compact' | 'spacious'>('compact');
  lineHeightPreset = signal<'normal' | 'relaxed'>('normal');
  
  // Theme toggle disabled - app uses light mode only
  
  // Comments
  newComment = signal('');
  commentsSort = signal<'newest' | 'oldest'>('newest');
  
  // Loading states
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Computed
  sortedComments = computed(() => {
    const comments = [...this.comments()];
    const sort = this.commentsSort();
    return comments.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === 'newest' ? bTime - aTime : aTime - bTime;
    });
  });

  themeService = inject(ThemeService);
  router = inject(Router); // Make router public for template access

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private titleService: Title,
    private metaService: Meta,
    private htmlSanitizer: HtmlSanitizerService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const contentId = params['id'];
      const slug = params['slug'];
      
      if (contentId) {
        this.loadContent(contentId);
      } else if (slug) {
        this.loadContentBySlug(slug);
      }
    });

    // Track reading progress
    window.addEventListener('scroll', () => this.updateReadingProgress());
    this.loadMockRelatedContent();
  }

  async loadContent(contentId: string) {
    this.loading.set(true);
    this.error.set(null);
    
    this.backendService.getSubmissionWithContents(contentId).subscribe({
      next: (data: any) => {
        console.log('Loaded content:', data);
        
        // Handle different possible content structures
        let contentItems: ContentItem[] = [];
        
        if (data.contents && data.contents.length > 0) {
          // Use existing contents array
          contentItems = data.contents;
        } else if (data.contentIds && data.contentIds.length > 0) {
          // Handle case where we have contentIds but need to fetch them separately
          // For now, show a message that content needs to be loaded separately
          contentItems = [{
            title: 'Content Loading',
            body: `This submission has ${data.contentIds.length} content item(s) that need to be loaded separately. The content system appears to be set up for modular content but the content IDs are: ${data.contentIds.join(', ')}.\n\nFor now, here's the available excerpt:\n\n${data.excerpt || data.description || 'No preview available.'}`,
            wordCount: data.excerpt ? data.excerpt.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.content) {
          // If there's a single 'content' field, convert it to contents array
          contentItems = [{
            title: data.title || 'Content',
            body: data.content,
            wordCount: data.content ? data.content.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.body) {
          // If there's a 'body' field, use that
          contentItems = [{
            title: data.title || 'Content',
            body: data.body,
            wordCount: data.body ? data.body.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.text) {
          // If there's a 'text' field, use that
          contentItems = [{
            title: data.title || 'Content',
            body: data.text,
            wordCount: data.text ? data.text.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.excerpt) {
          // Use excerpt as main content if nothing else is available
          contentItems = [{
            title: data.title || 'Content Preview',
            body: `${data.excerpt}\n\n[Note: This appears to be a preview/excerpt. The full content may not be available through the current API endpoint.]`,
            wordCount: data.excerpt ? data.excerpt.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else {
          // Fallback: create content from description if available
          contentItems = [{
            title: data.title || 'Content',
            body: data.description || 'Content is not available at this time.',
            wordCount: data.description ? data.description.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        }
        
        // Transform the API response to match our interface
        const transformedContent: PublishedContent = {
          _id: data._id,
          title: data.title,
          description: data.description,
          submissionType: data.submissionType,
          authorName: data.userId?.name || data.userId?.username || 'Unknown Author',
          authorId: data.userId?._id || data.author?._id || 'unknown',
          publishedAt: new Date(data.publishedAt || data.createdAt),
          readingTime: data.readingTime || Math.ceil(contentItems.reduce((acc, item) => acc + item.wordCount, 0) / 200),
          viewCount: data.viewCount || 0,
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          tags: data.tags || [],
          imageUrl: data.imageUrl || data.image,
          excerpt: data.excerpt || data.description || '',
          contents: contentItems,
          isLiked: false, // Default value
          isBookmarked: false // Default value
        };
        
        console.log('Transformed content:', transformedContent);
        this.content.set(transformedContent);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading content:', err);
        this.error.set('Failed to load content');
        this.loading.set(false);
      }
    });
  }

  async loadContentBySlug(slug: string) {
    this.loading.set(true);
    this.error.set(null);
    
    this.backendService.getSubmissionBySlug(slug).subscribe({
      next: (data: any) => {
        console.log('Loaded content by slug:', data);
        
        // Handle different possible content structures
        let contentItems: ContentItem[] = [];
        
        if (data.contents && data.contents.length > 0) {
          // Use existing contents array
          contentItems = data.contents;
        } else if (data.contentIds && data.contentIds.length > 0) {
          // Handle case where we have contentIds but need to fetch them separately
          contentItems = data.contentIds.map((id: string, index: number) => ({
            title: `Content ${index + 1}`,
            body: `Content with ID: ${id}`,
            wordCount: 0,
            tags: []
          }));
        } else {
          // Fallback: create content from description if available
          contentItems = [{
            title: data.title || 'Content',
            body: data.description || 'Content is not available at this time.',
            wordCount: data.description ? data.description.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        }
        
        // API now returns clean data, minimal transformation needed
        const transformedContent: PublishedContent = {
          _id: data._id,
          title: data.title,
          description: data.description,
          submissionType: data.submissionType,
          authorName: data.authorName || 'Unknown Author',
          authorId: data.authorId,
          publishedAt: new Date(data.publishedAt),
          readingTime: data.readingTime,
          viewCount: data.viewCount || 0,
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          tags: data.tags || [],
          imageUrl: data.imageUrl,
          excerpt: data.excerpt,
          contents: data.contents || [],
          isLiked: false, // TODO: Get from user preferences
          isBookmarked: false // TODO: Get from user preferences
        };
        
        this.content.set(transformedContent);
        this.loading.set(false);
        
        // Update page title and meta tags for SEO
        this.updatePageMeta(transformedContent);
      },
      error: (err: any) => {
        console.error('Error loading content by slug:', err);
        this.error.set('Failed to load content. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // ... keep all your existing methods (goBack, toggleLike, etc.) ...

  goBack() {
    this.router.navigate(['/explore']);
  }

  // Navigate to category page
  navigateToCategory(category: string) {
    if (category) {
      this.router.navigate(['/category', category]);
    }
  }

  toggleLike() {
    const current = this.content();
    if (current) {
      const updated = {
        ...current,
        isLiked: !current.isLiked,
        likeCount: current.isLiked ? current.likeCount - 1 : current.likeCount + 1
      };
      this.content.set(updated);
      // TODO: Make API call to update like status
    }
  }

  toggleBookmark() {
    const current = this.content();
    if (current) {
      this.content.set({
        ...current,
        isBookmarked: !current.isBookmarked
      });
      // TODO: Make API call to update bookmark status
    }
  }

  canShare() {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }

  shareContent() {
    if (navigator.share) {
      navigator.share({
        title: this.content()?.title,
        text: this.content()?.excerpt || this.content()?.description,
        url: window.location.href
      });
    }
  }

  // Social sharing methods
  shareOnFacebook() {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  }

  shareOnWhatsApp() {
    const content = this.content();
    if (!content) return;
    
    const text = `${content.title} by ${content.authorName} - ${window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }

  shareOnInstagram() {
    // Instagram doesn't support direct sharing via URL, so we'll show a message
    const content = this.content();
    if (!content) return;
    
    alert('To share on Instagram: Take a screenshot or copy this link manually and share it in your Instagram story or post!');
  }

  onTagClick(tag: string, event?: Event) {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // Navigate to tag page
    console.log('Tag clicked:', tag); // Debug log
    this.router.navigate(['/tag', tag]);
  }

  toggleReadingMode() {
    this.isReaderMode.update(mode => !mode);
  }

  increaseFontSize() {
    this.fontSize.update(size => Math.min(size + 2, 24));
  }

  decreaseFontSize() {
    this.fontSize.update(size => Math.max(size - 2, 12));
  }

  // Enhanced reading controls
  toggleFocusMode() {
    this.isFocusMode.update(mode => !mode);
    if (this.isFocusMode()) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }

  toggleLayoutMode() {
    this.layoutMode.update(mode => mode === 'compact' ? 'spacious' : 'compact');
  }

  toggleLineHeightPreset() {
    this.lineHeightPreset.update(preset => preset === 'normal' ? 'relaxed' : 'normal');
    this.lineHeight.set(this.lineHeightPreset() === 'normal' ? 1.6 : 1.8);
  }

  updateReadingProgress() {
    const scrolled = window.scrollY;
    const maxHeight = document.body.scrollHeight - window.innerHeight;
    const progress = Math.min((scrolled / maxHeight) * 100, 100);
    this.readingProgress.set(Math.round(progress));
  }

  submitComment() {
    const commentText = this.newComment().trim();
    if (!commentText) return;

    const newComment: Comment = {
      _id: Date.now().toString(),
      userId: 'current-user',
      userName: 'You',
      content: commentText,
      createdAt: new Date(),
      likesCount: 0,
      isLiked: false
    };

    this.comments.update(comments => [newComment, ...comments]);
    this.newComment.set('');

    // Update comment count
    const current = this.content();
    if (current) {
      this.content.set({
        ...current,
        commentCount: current.commentCount + 1
      });
    }

    // TODO: Make API call to save comment
  }

  toggleCommentsSort() {
    this.commentsSort.update(sort => sort === 'newest' ? 'oldest' : 'newest');
  }

  toggleCommentLike(comment: Comment) {
    this.comments.update(comments => 
      comments.map(c => 
        c._id === comment._id 
          ? {
              ...c,
              isLiked: !c.isLiked,
              likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1
            }
          : c
      )
    );
    // TODO: Make API call to update comment like
  }

  replyToComment(comment: Comment) {
    // TODO: Implement reply functionality
    console.log('Reply to comment:', comment._id);
  }

  loadMoreComments() {
    // TODO: Implement pagination
    console.log('Load more comments');
  }

  hasMoreComments(): boolean {
    return false; // TODO: Implement based on your pagination logic
  }

  retry() {
    const contentId = this.route.snapshot.params['id'];
    if (contentId) {
      this.error.set(null);
      this.loadContent(contentId);
    }
  }

  private loadMockRelatedContent() {
    // Mock related content for demo purposes
    const mockRelated: PublishedContent[] = [
      {
        _id: 'related-1',
        title: 'Understanding Modern Web Development',
        description: 'A comprehensive guide to current web technologies',
        submissionType: 'article',
        authorName: 'Jane Developer',
        authorId: 'author-2',
        publishedAt: new Date('2024-01-15'),
        readingTime: 8,
        viewCount: 1250,
        likeCount: 89,
        commentCount: 23,
        tags: ['web', 'development', 'javascript'],
        imageUrl: 'https://via.placeholder.com/400x200?text=Web+Dev',
        excerpt: 'Explore the latest trends and best practices in modern web development...',
        contents: [],
        isLiked: false,
        isBookmarked: false
      },
      {
        _id: 'related-2',
        title: 'The Future of AI in Software',
        description: 'How artificial intelligence is reshaping software development',
        submissionType: 'research',
        authorName: 'Dr. Tech Expert',
        authorId: 'author-3',
        publishedAt: new Date('2024-01-10'),
        readingTime: 12,
        viewCount: 2100,
        likeCount: 156,
        commentCount: 45,
        tags: ['ai', 'software', 'future'],
        imageUrl: 'https://via.placeholder.com/400x200?text=AI+Future',
        excerpt: 'An in-depth analysis of AI\'s impact on the software development industry...',
        contents: [],
        isLiked: false,
        isBookmarked: false
      }
    ];
    
    this.relatedContent.set(mockRelated);
  }

  private calculateReadingTime(contentItems: ContentItem[]): number {
    const totalWords = contentItems.reduce((total, item) => {
      return total + (item.wordCount || this.countWords(item.body));
    }, 0);
    
    // Average reading speed is 200 words per minute
    const readingTimeMinutes = Math.ceil(totalWords / 200);
    return Math.max(1, readingTimeMinutes); // Minimum 1 minute
  }

  private countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Clean content for display using global service
  cleanContent(content: string): string {
    return this.htmlSanitizer.cleanContentPreservingBreaks(content);
  }

  private updatePageMeta(content: PublishedContent) {
    // Update page title
    this.titleService.setTitle(`${content.title} - pi`);
    
    // Update meta description
    this.metaService.updateTag({ 
      name: 'description', 
      content: content.description || content.excerpt 
    });
    
    // Update meta keywords if available
    if (content.tags && content.tags.length > 0) {
      this.metaService.updateTag({ 
        name: 'keywords', 
        content: content.tags.join(', ') 
      });
    }
    
    // Update Open Graph tags for social media
    this.metaService.updateTag({ property: 'og:title', content: content.title });
    this.metaService.updateTag({ property: 'og:description', content: content.description || content.excerpt });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:url', content: window.location.href });
    
    if (content.imageUrl) {
      this.metaService.updateTag({ property: 'og:image', content: content.imageUrl });
    }
    
    // Update Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: content.title });
    this.metaService.updateTag({ name: 'twitter:description', content: content.description || content.excerpt });
    
    if (content.imageUrl) {
      this.metaService.updateTag({ name: 'twitter:image', content: content.imageUrl });
    }
  }
}
