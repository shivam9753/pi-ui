import { Component, OnInit, signal, computed, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { BackendService } from '../services/backend.service';
import { ThemingService } from '../services/theming.service';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';
import { BadgeLabelComponent } from '../utilities/badge-label/badge-label.component';
import { RelatedContentComponent } from '../utilities/related-content/related-content.component';
import { Author } from '../models';
import { AuthorUtils } from '../models/author.model';
import { AuthorService } from '../services/author.service';
import { ViewTrackerService } from '../services/view-tracker.service';
import { SsrDataService, PostSSRData } from '../services/ssr-data.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

interface PublishedContent {
  _id: string;
  title: string;
  description: string;
  submissionType: string;
  author: Author;
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
  authorDetails = signal<User | null>(null);
  
  // Reading settings
  fontSize = signal(16);
  lineHeight = signal(1.6);
  isReaderMode = signal(false);
  readingProgress = signal(0);
  focusMode = signal(false);
  
  // Enhanced reading controls
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

  allTags = computed(() => {
    const current = this.content();
    if (!current) return [];
    
    const tags = new Set<string>();
    
    // Add main content tags
    if (current.tags) {
      current.tags.forEach(tag => tags.add(tag));
    }
    
    // Add individual content item tags
    if (current.contents) {
      current.contents.forEach(item => {
        if (item.tags) {
          item.tags.forEach(tag => tags.add(tag));
        }
      });
    }
    
    return Array.from(tags);
  });

  themeService = inject(ThemingService);
  router = inject(Router); // Make router public for template access

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private titleService: Title,
    private metaService: Meta,
    private htmlSanitizer: HtmlSanitizerService,
    private viewTracker: ViewTrackerService,
    private ssrDataService: SsrDataService,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Check for SSR resolved data first
    const ssrData = this.route.snapshot.data['postData'] as PostSSRData;
    
    if (ssrData && ssrData.post) {
      console.log('[SSR] Using pre-resolved data');
      this.handleSSRData(ssrData);
    } else {
      // Fallback to regular data fetching for client-side navigation
      this.route.params.subscribe(params => {
        const contentId = params['id'];
        const slug = params['slug'];
        
        if (contentId) {
          this.loadContent(contentId);
        } else if (slug) {
          this.loadContentBySlug(slug);
        }
      });
    }

    // Track reading progress (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('scroll', () => this.updateReadingProgress());
    }
  }

  private handleSSRData(ssrData: PostSSRData) {
    try {
      const data = ssrData.post;
      
      // Handle different possible content structures (same as loadContentBySlug)
      let contentItems: ContentItem[] = [];
      
      if (data.contents && data.contents.length > 0) {
        contentItems = data.contents;
      } else if (data.contentIds && data.contentIds.length > 0) {
        contentItems = data.contentIds.map((id: string, index: number) => ({
          title: `Content ${index + 1}`,
          body: `Content with ID: ${id}`,
          wordCount: 0,
          tags: []
        }));
      } else {
        // Handle single content structures
        if (data.content) {
          contentItems = [{
            title: data.title || 'Content',
            body: data.content,
            wordCount: data.content ? data.content.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.body) {
          contentItems = [{
            title: data.title || 'Content',
            body: data.body,
            wordCount: data.body ? data.body.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.text) {
          contentItems = [{
            title: data.title || 'Content',
            body: data.text,
            wordCount: data.text ? data.text.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else if (data.excerpt) {
          contentItems = [{
            title: data.title || 'Content Preview',
            body: `${data.excerpt}\n\n[Note: This appears to be a preview/excerpt. The full content may not be available through the current API endpoint.]`,
            wordCount: data.excerpt ? data.excerpt.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        } else {
          contentItems = [{
            title: data.title || 'Content',
            body: data.description || 'Content is not available at this time.',
            wordCount: data.description ? data.description.split(/\s+/).length : 0,
            tags: data.tags || []
          }];
        }
      }
      
      // Transform the API response to match our interface
      console.log('Raw content data for author normalization (handleSSRData):', {
        _id: data._id,
        userId: data.userId,
        author: data.author,
        submitterId: data.submitterId,
        submitterName: data.submitterName,
        authorId: data.authorId,
        authorName: data.authorName
      });
      
      const normalizedAuthor = AuthorUtils.normalizeAuthor(data);
      console.log('Normalized author result (handleSSRData):', normalizedAuthor);
      
      const transformedContent: PublishedContent = {
        _id: data._id,
        title: data.title,
        description: data.description,
        submissionType: data.submissionType,
        author: normalizedAuthor,
        publishedAt: new Date(data.publishedAt || data.createdAt),
        readingTime: data.readingTime || Math.ceil(contentItems.reduce((acc, item) => acc + item.wordCount, 0) / 200),
        viewCount: data.viewCount || 0,
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
        tags: data.tags || [],
        imageUrl: data.imageUrl,
        excerpt: data.excerpt,
        contents: contentItems,
        isLiked: false,
        isBookmarked: false
      };

      this.content.set(transformedContent);
      this.loading.set(false);
      this.updatePageMeta(transformedContent);

      // Load author details
      if (transformedContent.author?.id) {
        console.log('Loading author details from handleSSRData. Author:', transformedContent.author);
        this.loadAuthorDetails(transformedContent.author.id);
      }

      // Only track views in browser
      if (isPlatformBrowser(this.platformId)) {
        this.viewTracker.logView(data._id).subscribe({
          next: (viewResponse) => {
            if (viewResponse.success) {
              const currentContent = this.content();
              if (currentContent) {
                const updatedContent = {
                  ...currentContent,
                  viewCount: viewResponse.viewCount
                };
                this.content.set(updatedContent);
              }
            }
          },
          error: (err) => {
            console.warn('Failed to log view:', err);
          }
        });
      }
      
    } catch (error) {
      console.error('[SSR] Error processing SSR data:', error);
      this.error.set('Failed to load content');
      this.loading.set(false);
    }
  }

  async loadContent(contentId: string) {
    this.loading.set(true);
    this.error.set(null);
    
    this.backendService.getSubmissionWithContents(contentId).subscribe({
      next: (data: any) => {
        
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
        console.log('Raw content data for author normalization:', {
          _id: data._id,
          userId: data.userId,
          author: data.author,
          submitterId: data.submitterId,
          submitterName: data.submitterName,
          authorId: data.authorId,
          authorName: data.authorName
        });
        
        const normalizedAuthor = AuthorUtils.normalizeAuthor(data);
        console.log('Normalized author result:', normalizedAuthor);
        
        const transformedContent: PublishedContent = {
          _id: data._id,
          title: data.title,
          description: data.description,
          submissionType: data.submissionType,
          author: normalizedAuthor,
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
        
        this.content.set(transformedContent);
        this.loading.set(false);
        
        // Load author details
        if (transformedContent.author?.id) {
          console.log('Loading author details from loadContent. Author:', transformedContent.author);
          this.loadAuthorDetails(transformedContent.author.id);
        }
        
        // Track view for this content
        this.viewTracker.logView(data._id).subscribe({
          next: (viewResponse) => {
            if (viewResponse.success) {
              // Update the content with latest view counts
              const currentContent = this.content();
              if (currentContent) {
                const updatedContent = {
                  ...currentContent,
                  viewCount: viewResponse.viewCount
                };
                this.content.set(updatedContent);
              }
            }
          },
          error: (err) => {
            console.warn('Failed to log view:', err);
          }
        });
      },
      error: (err: any) => {
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
        console.log('Raw content data for author normalization (loadContentBySlug):', {
          _id: data._id,
          userId: data.userId,
          author: data.author,
          submitterId: data.submitterId,
          submitterName: data.submitterName,
          authorId: data.authorId,
          authorName: data.authorName
        });
        
        const normalizedAuthor = AuthorUtils.normalizeAuthor(data);
        console.log('Normalized author result (loadContentBySlug):', normalizedAuthor);
        
        const transformedContent: PublishedContent = {
          _id: data._id,
          title: data.title,
          description: data.description,
          submissionType: data.submissionType,
          author: normalizedAuthor,
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
        
        // Load author details
        if (transformedContent.author?.id) {
          console.log('Loading author details from loadContentBySlug. Author:', transformedContent.author);
          this.loadAuthorDetails(transformedContent.author.id);
        }
        
        // Update page title and meta tags for SEO
        this.updatePageMeta(transformedContent);
        
        // Track view for this content
        this.viewTracker.logView(data._id).subscribe({
          next: (viewResponse) => {
            if (viewResponse.success) {
              // Update the content with latest view counts
              const currentContent = this.content();
              if (currentContent) {
                const updatedContent = {
                  ...currentContent,
                  viewCount: viewResponse.viewCount
                };
                this.content.set(updatedContent);
              }
            }
          },
          error: (err) => {
            console.warn('Failed to log view:', err);
          }
        });
      },
      error: (err: any) => {
        this.error.set('Failed to load content. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // ... keep all your existing methods (goBack, toggleLike, etc.) ...


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
    
    // Debug meta tags before sharing
    this.debugMetaTags();
    
    const text = `${content.title} by ${content.author?.name || 'Anonymous'} - ${window.location.href}`;
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
    this.router.navigate(['/tag', tag]);
  }

  // Helper method to clean tag display
  getTagDisplayName(tag: string): string {
    // If tag looks like a hash (starts with # and contains numbers/letters), 
    // extract meaningful part or return a cleaned version
    if (tag.startsWith('#') && tag.length > 20) {
      // This looks like a hash ID, so we'll try to make it more readable
      // For now, we'll just return 'Tag' or check if there's a pattern
      return 'Topic'; // Generic fallback
    }
    
    // If tag looks like a hash ID (long string of numbers/letters), clean it
    if (tag.match(/^[a-f0-9]{24}$/)) {
      return 'Topic'; // Generic fallback for ObjectId-like strings
    }
    
    // If tag contains hash characters, clean them
    return tag.replace(/^#+/, '').trim() || 'Topic';
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
  toggleLayoutMode() {
    this.layoutMode.update(mode => mode === 'compact' ? 'spacious' : 'compact');
  }

  goBack() {
    // Check if we can go back in browser history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to explore page if no history
      this.router.navigate(['/explore']);
    }
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
  }

  loadMoreComments() {
    // TODO: Implement pagination
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
    this.titleService.setTitle(`${content.title} — Poems by ${content.author?.name || 'Anonymous'} - pi`);
    
    // Create a proper description
    const metaDescription = content.description || content.excerpt || `Read "${content.title}" by ${content.author?.name || 'Anonymous'} on Poems in India - a curated collection of poetry and literature.`;
    
    // Update meta description
    this.metaService.updateTag({ 
      name: 'description', 
      content: metaDescription 
    });
    
    // Update meta keywords if available
    if (content.tags && content.tags.length > 0) {
      this.metaService.updateTag({ 
        name: 'keywords', 
        content: `${content.tags.join(', ')}, poetry, literature, ${content.author?.name || 'Anonymous'}, Poems in India` 
      });
    } else {
      this.metaService.updateTag({ 
        name: 'keywords', 
        content: `poetry, literature, ${content.author?.name || 'Anonymous'}, Poems in India, ${content.submissionType}` 
      });
    }
    
    // Construct canonical URL safely for SSR
    let canonicalUrl = '';
    if (isPlatformBrowser(this.platformId)) {
      canonicalUrl = window.location.href;
    } else {
      // During SSR, construct URL from route params
      const currentRoute = this.route.snapshot;
      const slug = currentRoute.params['slug'];
      canonicalUrl = `https://poemsindia.in/post/${slug}`;
    }
    
    // Update Open Graph tags for social media
    this.metaService.updateTag({ property: 'og:title', content: content.title });
    this.metaService.updateTag({ property: 'og:description', content: metaDescription });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Poems in India' });
    this.metaService.updateTag({ property: 'og:locale', content: 'en_US' });
    
    // WhatsApp-specific meta tags
    this.metaService.updateTag({ name: 'title', content: content.title });
    this.metaService.updateTag({ property: 'og:determiner', content: 'the' });
    
    // Additional meta tags for better social sharing
    this.metaService.updateTag({ name: 'robots', content: 'index,follow' });
    this.metaService.updateTag({ name: 'author', content: content.author?.name || 'Anonymous' });
    this.metaService.updateTag({ property: 'article:section', content: content.submissionType });
    this.metaService.updateTag({ property: 'article:published_time', content: content.publishedAt.toISOString() });
    
    // Canonical URL
    this.metaService.updateTag({ rel: 'canonical', href: canonicalUrl } as any);
    if (content.tags && content.tags.length > 0) {
      content.tags.forEach(tag => {
        this.metaService.addTag({ property: 'article:tag', content: tag });
      });
    }
    
    // Set Open Graph image with fallback
    const imageUrl = this.getAbsoluteImageUrl(content.imageUrl) || this.getDefaultSocialImage();
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:image:secure_url', content: imageUrl });
    this.metaService.updateTag({ property: 'og:image:alt', content: content.imageUrl ? `Cover image for ${content.title}` : 'Poems in India - Poetry & Literature' });
    this.metaService.updateTag({ property: 'og:image:width', content: '1200' });
    this.metaService.updateTag({ property: 'og:image:height', content: '630' });
    this.metaService.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    
    // Debug logging for development
    if (!isPlatformBrowser(this.platformId) || window.location.hostname === 'localhost') {
      console.log('🔍 Meta Tags Debug Info:', {
        title: content.title,
        description: metaDescription,
        imageUrl: imageUrl,
        canonicalUrl: canonicalUrl,
        slug: this.route.snapshot.params['slug']
      });
    }
    
    // Update Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: content.title });
    this.metaService.updateTag({ name: 'twitter:description', content: metaDescription });
    this.metaService.updateTag({ name: 'twitter:site', content: '@poemsindia' });
    this.metaService.updateTag({ name: 'twitter:creator', content: `@${content.author?.name || 'Anonymous'}` });
    
    // Set Twitter image (same as og:image)
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
    this.metaService.updateTag({ name: 'twitter:image:alt', content: content.imageUrl ? `Cover image for ${content.title}` : 'Poems in India - Poetry & Literature' });
    
    // Add structured data for search engines
    this.addStructuredData(content, canonicalUrl);
  }

  private addStructuredData(content: PublishedContent, canonicalUrl: string) {
    // Add structured data during SSR and browser
    const structuredData: any = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": content.title,
      "description": content.description || content.excerpt,
      "author": {
        "@type": "Person",
        "name": content.author?.name || 'Anonymous'
      },
      "publisher": {
        "@type": "Organization",
        "name": "Poems in India",
        "url": "https://poemsindia.in"
      },
      "url": canonicalUrl,
      "datePublished": content.publishedAt.toISOString(),
      "articleSection": content.submissionType,
      "keywords": content.tags ? content.tags.join(', ') : content.submissionType,
      "wordCount": content.contents.reduce((acc, item) => acc + item.wordCount, 0)
    };

    // Always include an image in structured data
    const imageUrl = this.getAbsoluteImageUrl(content.imageUrl) || this.getDefaultSocialImage();
    structuredData.image = {
      "@type": "ImageObject",
      "url": imageUrl,
      "width": 1200,
      "height": 630
    };

    // Remove existing structured data script if it exists
    const existingScript = document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data script
    const script = document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  private getAbsoluteImageUrl(imageUrl?: string): string | null {
    if (!imageUrl) return null;
    
    // If already absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If relative URL, make it absolute
    if (imageUrl.startsWith('/')) {
      return `https://poemsindia.in${imageUrl}`;
    }
    
    // If no leading slash, assume it's relative to root
    return `https://poemsindia.in/${imageUrl}`;
  }

  private getDefaultSocialImage(): string {
    // Return a default social sharing image for posts without custom images
    // Use the existing login image as a temporary fallback
    return 'https://poemsindia.in/assets/loginimage.jpeg';
  }

  // Method to test meta tags - call this in development
  debugMetaTags() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const metaTags = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]');
    console.log('🔍 Current Meta Tags:');
    metaTags.forEach(tag => {
      const attr = tag.getAttribute('property') || tag.getAttribute('name');
      const content = tag.getAttribute('content');
      console.log(`  ${attr}: ${content}`);
    });
    
    // Test URLs for debugging
    console.log('🔗 Debug URLs:');
    console.log('Facebook Debugger: https://developers.facebook.com/tools/debug/?q=' + encodeURIComponent(window.location.href));
    console.log('LinkedIn Inspector: https://www.linkedin.com/post-inspector/inspect/' + encodeURIComponent(window.location.href));
  }

  loadAuthorDetails(authorId: string) {
    if (!authorId || authorId === 'unknown') {
      return;
    }

    console.log('Loading author details for ID:', authorId);
    console.log('Current content author object:', this.content()?.author);

    // Try getUserProfile first, then fallback to getUserById
    this.userService.getUserProfile(authorId).subscribe({
      next: (response: any) => {
        // Handle different response structures - API returns profile instead of user
        const user = response.user || (response as any).profile || response;
        this.authorDetails.set(user);
        console.log('Successfully loaded author profile:', user);
      },
      error: (error) => {
        console.warn('Failed to load author profile, trying getUserById:', error);
        
        // Fallback to getUserById
        this.userService.getUserById(authorId).subscribe({
          next: (response) => {
            this.authorDetails.set(response.user);
            console.log('Successfully loaded author via getUserById:', response.user);
          },
          error: (fallbackError) => {
            console.warn('Failed to load author details with both methods:', fallbackError);
            // Don't set error state, just silently fail since author details are optional
          }
        });
      }
    });
  }
}
