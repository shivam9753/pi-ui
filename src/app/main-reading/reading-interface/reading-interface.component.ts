import { Component, OnInit, AfterViewInit, signal, computed, inject, PLATFORM_ID, Inject, ElementRef, HostBinding } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta, SafeHtml } from '@angular/platform-browser';
import { Author, AuthorUtils, User } from '../../models';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';
import { RelatedContentComponent } from '../../utilities/related-content/related-content.component';
import { ThemingService } from '../../services/theming.service';
import { BackendService } from '../../services/backend.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';
import { ViewTrackerService } from '../../services/view-tracker.service';
import { PostSSRData, SsrDataService } from '../../services/ssr-data.service';
import { UserService } from '../../services/user.service';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { ButtonComponent } from '../../ui-components/button/button.component';

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
  footnotes?: string;
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
  imports: [CommonModule, FormsModule, RouterLink, BadgeLabelComponent, RelatedContentComponent, ContentRendererComponent, ButtonComponent],
  templateUrl: './reading-interface.component.html',
  styleUrl: './reading-interface.component.css'
})
export class ReadingInterfaceComponent implements AfterViewInit {
content = signal<PublishedContent | null>(null);
  comments = signal<Comment[]>([]);
  relatedContent = signal<PublishedContent[]>([]);
  authorDetails = signal<User | null>(null);
  
  // Reading settings
  fontSize = signal(20); // Match CSS default font-size for consistent typography
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
    if (!current) return [] as any[];

    const tagMap = new Map<string, { _id?: string; name?: string; slug?: string }>();

    // Helper to normalize incoming tag value to object
    const slugify = (s: string) => {
      if (!s || typeof s !== 'string') return '';
      return s.trim().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
    };

    const normalizeTag = (t: any) => {
      if (!t) return null;
      if (typeof t === 'string') {
        // Plain string - treat as name only and create slug
        const name = t.trim();
        return { name, slug: slugify(name) };
      }
      if (typeof t === 'object') {
        const name = t.name || t.label || t.tag || '';
        const slug = t.slug || (name ? slugify(name) : null);
        return {
          _id: t._id || t.id || (t._id ? String(t._id) : undefined),
          name: name || null,
          slug: slug || null
        };
      }
      return null;
    };

    // Add main content tags (top-level submission tags)
    if (current.tags && Array.isArray(current.tags)) {
      current.tags.forEach((t: any) => {
        const obj = normalizeTag(t);
        if (!obj) return;
        const key = obj.slug || obj.name || obj._id;
        if (key) tagMap.set(key, obj);
      });
    }

    // Add individual content item tags
    if (current.contents && Array.isArray(current.contents)) {
      current.contents.forEach((item: any) => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((t: any) => {
            const obj = normalizeTag(t);
            if (!obj) return;
            // Prefer keyed by slug if available, otherwise name, then id
            const key = obj.slug || obj.name || obj._id;
            if (key) tagMap.set(key, obj);
          });
        }
      });
    }

    return Array.from(tagMap.values());
  });

  themeService = inject(ThemingService);
  router = inject(Router); // Make router public for template access

  // Expose a small config for the renderer
  rendererWidthCh = 60;

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private titleService: Title,
    private metaService: Meta,
    private htmlSanitizer: HtmlSanitizerService,
    private viewTracker: ViewTrackerService,
    private ssrDataService: SsrDataService,
    private userService: UserService,
    private elementRef: ElementRef,
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
          // During SSR, immediately try to set basic meta tags based on slug
          if (!isPlatformBrowser(this.platformId) && slug) {
            this.setBasicMetaTagsFromSlug(slug);
          }
          this.loadContentBySlug(slug);
        }
      });
    }

    // Track reading progress (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('scroll', () => this.updateReadingProgress());
    }
  }

  ngAfterViewInit() {
    // Note: Text alignment and formatting styles are now handled via CSS attribute selectors
    // in reading-interface.component.css, which works seamlessly with SSR
    // No client-side restoration needed!
  }

  private handleSSRData(ssrData: PostSSRData) {
    try {
      const data = ssrData.post;

      // Ensure contents exist (fallback to excerpt/description/body)
      data.contents = this.ensureContents(data);

      // Normalize incoming shape so downstream transform code can assume strings for tags and a contents array
      const normalized = this.normalizeApiSubmission(data);
      let contentItems: ContentItem[] = normalized.contents || [];

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
      
      // Only update meta tags on client-side (SSR already handled it)
      if (isPlatformBrowser(this.platformId)) {
        this.updatePageMeta(transformedContent);
      }

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

        // Enhanced analytics tracking for detailed content analytics
        this.backendService.trackContentView({
          contentId: data._id,
          source: 'reading-interface-ssr',
          contentType: data.submissionType,
          sessionId: this.generateSessionId()
        }).subscribe({
          next: () => {
            // Enhanced tracking successful (silent)
          },
          error: (error) => {
            console.warn('Enhanced content tracking failed:', error);
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
        
        // Ensure fallback contents if API returned none
        data.contents = this.ensureContents(data);

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

        // Normalize contents and tags so template always receives string bodies and tag strings
        try {
          data.contents = contentItems;
          const normalized = this.normalizeApiSubmission(data);
          contentItems = normalized.contents || contentItems;
          data.tags = normalized.tags || data.tags || [];
        } catch (e) {
          console.warn('Failed to normalize content items:', e);
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
        
        // Update meta tags for client-side navigation
        this.updatePageMeta(transformedContent);
        
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

        // Enhanced analytics tracking for detailed content analytics
        this.backendService.trackContentView({
          contentId: data._id,
          source: 'reading-interface-direct',
          contentType: data.submissionType,
          sessionId: this.generateSessionId()
        }).subscribe({
          next: () => {
            // Enhanced tracking successful (silent)
          },
          error: (error) => {
            console.warn('Enhanced content tracking failed:', error);
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
        // Ensure fallback contents if API returned none
        data.contents = this.ensureContents(data);

        // Normalize incoming API shape (tags as strings, contents with body & tags)
        const normalized = this.normalizeApiSubmission(data);
        
        // Continue with existing transform path (reuse handleSSRData logic where appropriate)
        try {
          const normalizedAuthor = AuthorUtils.normalizeAuthor(normalized);
          const transformed: PublishedContent = {
            _id: normalized._id,
            title: normalized.title,
            description: normalized.description,
            submissionType: normalized.submissionType,
            author: normalizedAuthor,
            publishedAt: new Date(normalized.publishedAt || normalized.createdAt),
            readingTime: normalized.readingTime || this.calculateReadingTime(normalized.contents || []),
            viewCount: normalized.viewCount || 0,
            likeCount: normalized.likeCount || 0,
            commentCount: normalized.commentCount || 0,
            tags: normalized.tags || [],
            imageUrl: normalized.imageUrl,
            excerpt: normalized.excerpt,
            contents: normalized.contents || [],
            isLiked: false,
            isBookmarked: false
          };

          this.content.set(transformed);
          this.loading.set(false);

          // Update meta and tracking
          if (isPlatformBrowser(this.platformId)) {
            this.updatePageMeta(transformed);
            // track view etc.
          }
        } catch (err) {
          console.error('Error transforming submission by slug:', err);
          this.error.set('Failed to load content');
          this.loading.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error loading content by slug:', err);
        // If the post doesn't exist, redirect to 404 page
        if (err.status === 404) {
          this.router.navigate(['/not-found'], { replaceUrl: true });
        } else {
          this.error.set('Failed to load content. Please try again.');
          this.loading.set(false);
        }
      }
    });
  }

  // Always apply the poem serif font for the reading interface host
  @HostBinding('class.poem-font')
  get applyPoemFont(): boolean {
    return true;
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

  onTagClick(tag: any, event?: Event) {
    
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    let tagObj: any = tag;
  

    // Prefer slug, then id
    const routeValue = (tagObj && (tagObj.slug || tagObj._id)) ? (tagObj.slug || tagObj._id) : (typeof tag === 'string' ? tag : null);

    if (routeValue) {
      // Navigate to tag page using slug or id
      this.router.navigate(['/tag', routeValue]);
    } else {
      // As a final fallback navigate using the display name (not recommended)
      console.warn('Tag click: unable to resolve slug/id for tag, navigating with display name:', tag);
      this.router.navigate(['/tag', encodeURIComponent(typeof tag === 'string' ? tag : (tag.name || ''))]);
    }
  }

  // Helper method to clean tag display
  getTagDisplayName(tag: any): string {
    if (!tag) return 'Topic';
    if (typeof tag === 'string') return tag.replace(/^#+/, '').trim() || 'Topic';
    if (typeof tag === 'object') {
      if (tag.name && typeof tag.name === 'string' && tag.name.trim().length > 0) return tag.name;
      if (tag.slug && typeof tag.slug === 'string') return tag.slug.replace(/-/g, ' ');
      if (tag._id) return 'Topic';
    }
    return 'Topic';
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
  cleanContent(content: string): SafeHtml {
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
        imageUrl,
        canonicalUrl,
        slug: this.route.snapshot.params['slug']
      });
    }

    // Twitter Card tags
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

  private generateSessionId(): string {
    // Generate a session ID for analytics tracking
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
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
          next: (response:any) => {
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

  private setBasicMetaTagsFromSlug(slug: string) {
    // During SSR, immediately fetch and set meta tags
    console.log('[SSR] Setting basic meta tags for slug:', slug);
    
    this.backendService.getSubmissionBySlug(slug).subscribe({
      next: (data: any) => {
        console.log('[SSR] Got data for meta tags:', data.title);
        
        // Set basic meta tags immediately during SSR
        this.titleService.setTitle(`${data.title} — Poems by ${data.authorName || 'Anonymous'} - pi`);
        
        const description = data.description || data.excerpt || `Read "${data.title}" by ${data.authorName || 'Anonymous'} on Poems in India - a curated collection of poetry and literature.`;
        
        // Update meta description
        this.metaService.updateTag({ name: 'description', content: description });
        
        // Open Graph tags
        this.metaService.updateTag({ property: 'og:title', content: data.title });
        this.metaService.updateTag({ property: 'og:description', content: description });
        this.metaService.updateTag({ property: 'og:type', content: 'article' });
        this.metaService.updateTag({ property: 'og:url', content: `https://poemsindia.in/post/${slug}` });
        this.metaService.updateTag({ property: 'og:site_name', content: 'Poems in India' });
        
        // Set OG image
        const imageUrl = this.getAbsoluteImageUrl(data.imageUrl) || this.getDefaultSocialImage();
        this.metaService.updateTag({ property: 'og:image', content: imageUrl });
        this.metaService.updateTag({ property: 'og:image:secure_url', content: imageUrl });
        this.metaService.updateTag({ property: 'og:image:width', content: '1200' });
        this.metaService.updateTag({ property: 'og:image:height', content: '630' });
        
        // Twitter Card tags
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.metaService.updateTag({ name: 'twitter:title', content: data.title });
        this.metaService.updateTag({ name: 'twitter:description', content: description });
        this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
        
        console.log('[SSR] Meta tags set for:', data.title, 'Image URL:', imageUrl);
      },
      error: (error) => {
        console.error('[SSR] Failed to load content for meta tags:', error);
      }
    });
  }

  // Helper: convert a tag (string or object) to a readable string
  private tagToString(tag: any): string {
    if (!tag) return '';
    if (typeof tag === 'string') return tag;
    if (typeof tag === 'object') {
      if (tag.name && typeof tag.name === 'string') return tag.name;
      if (tag.tag && typeof tag.tag === 'string') return tag.tag;
      if (tag.slug && typeof tag.slug === 'string') return tag.slug;
      if (tag._id) return String(tag._id);
    }
    return '';
  }

  // Helper: normalize an API submission object into the component's PublishedContent shape (partial)
  private normalizeApiSubmission(data: any): any {
    if (!data) return data;

    // Normalize top-level tags to array of strings
    if (!Array.isArray(data.tags)) data.tags = [];
    data.tags = data.tags.map((t: any) => this.tagToString(t)).filter(Boolean);

    // Determine the incoming contents source supporting many possible shapes
    let incomingContentsRaw: any[] = [];
    if (Array.isArray(data.contents) && data.contents.length > 0) {
      incomingContentsRaw = data.contents;
    } else if (Array.isArray(data.contentItems) && data.contentItems.length > 0) {
      // some endpoints return contentItems
      incomingContentsRaw = data.contentItems;
    } else if (Array.isArray(data.contentObjects) && data.contentObjects.length > 0) {
      // defensive: some responses include contentObjects
      incomingContentsRaw = data.contentObjects;
    } else if (Array.isArray(data.contentIds) && data.contentIds.length > 0) {
      // When only contentIds are present, provide a helpful placeholder so the reader shows a preview
      const body = `This submission has ${data.contentIds.length} content item(s) that need to be loaded separately. The content IDs are: ${data.contentIds.join(', ')}.\n\nFor now, here's the available excerpt:\n\n${data.excerpt || data.description || 'No preview available.'}`;
      incomingContentsRaw = [{ title: data.title || 'Content', body, tags: data.tags || [] }];
    } else if (data.content) {
      incomingContentsRaw = Array.isArray(data.content) ? data.content : [data.content];
    } else if (data.body || data.text) {
      incomingContentsRaw = [{ title: data.title || '', body: data.body || data.text || '', tags: data.tags || [] }];
    } else if (data.excerpt || data.description) {
      incomingContentsRaw = [{ title: data.title || 'Content Preview', body: `${data.excerpt || data.description}\n\n[Note: This appears to be a preview/excerpt. The full content may not be available through the current API endpoint.]`, tags: data.tags || [] }];
    } else {
      // Final fallback to avoid empty contents array
      incomingContentsRaw = [{ title: data.title || 'Content', body: data.description || 'Content is not available at this time.', tags: data.tags || [] }];
    }

    data.contents = incomingContentsRaw.map((c: any) => {
      // If the incoming item is a simple string, treat it as the body
      if (typeof c === 'string') {
        const bodyStr = c;
        return {
          _id: '',
          title: data.title || '',
          body: bodyStr,
          wordCount: this.countWords(bodyStr),
          tags: data.tags || [],
          footnotes: ''
        } as any;
      }

      // Try multiple candidate fields for the main body text
      const bodyCandidates = [
        c.body,
        c.text,
        c.html,
        c.raw,
        c.markdown
      ];

      // If c.content is an object, try nested fields
      if (c.content && typeof c.content === 'object') {
        bodyCandidates.push(c.content.body, c.content.text, c.content.html);
      } else if (typeof c.content === 'string') {
        bodyCandidates.push(c.content);
      }

      let body = '';
      for (const candidate of bodyCandidates) {
        if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
          body = candidate;
          break;
        }
      }

      // Fallbacks: use excerpt/description if body still empty
      if (!body && (c.excerpt || data.excerpt || data.description)) {
        body = c.excerpt || data.excerpt || data.description || '';
      }

      const title = c.title || data.title || '';

      // Normalize tags for this content item
      let tagsArray: any[] = [];
      if (Array.isArray(c.tags)) tagsArray = c.tags;
      else if (Array.isArray(c.tagList)) tagsArray = c.tagList;
      else if (Array.isArray(c.contentTags)) tagsArray = c.contentTags;
      else tagsArray = data.tags || [];

      const tags = (tagsArray || []).map((t: any) => this.tagToString(t)).filter(Boolean);

      const wordCount = this.countWords(body || title);
      const footnotes = c.footnotes || c.footnote || '';

      return {
        _id: c._id || c.id || '',
        title,
        body,
        wordCount,
        tags,
        footnotes
      } as any;
    });

    return data;
  }

  // Ensure we always have at least one content item for rendering (fallback to excerpt/description/body)
  private ensureContents(data: any): ContentItem[] {
    if (!data) return [];

    if (Array.isArray(data.contents) && data.contents.length > 0) {
      return data.contents;
    }

    // If contentIds are present, provide a placeholder explaining modular content
    if (Array.isArray(data.contentIds) && data.contentIds.length > 0) {
      const body = `This submission has ${data.contentIds.length} content item(s) that need to be loaded separately. The content IDs are: ${data.contentIds.join(', ')}.\n\nFor now, here's the available excerpt:\n\n${data.excerpt || data.description || 'No preview available.'}`;
      return [{ title: data.title || 'Content', body, wordCount: this.countWords(body), tags: (data.tags || []) }];
    }

    // Prefer any single content-like fields
    if (data.content && (typeof data.content === 'string' || (typeof data.content === 'object' && (data.content.body || data.content.text)))) {
      const c = typeof data.content === 'string' ? { body: data.content } : data.content;
      const body = c.body || c.text || '';
      return [{ title: c.title || data.title || 'Content', body, wordCount: this.countWords(body), tags: (c.tags || data.tags || []) }];
    }

    if (data.body || data.text) {
      const body = data.body || data.text || '';
      return [{ title: data.title || 'Content', body, wordCount: this.countWords(body), tags: (data.tags || []) }];
    }

    if (data.excerpt || data.description) {
      const body = data.excerpt || data.description || '';
      return [{ title: data.title || 'Content Preview', body: `${body}\n\n[Note: This appears to be a preview/excerpt. The full content may not be available through the current API endpoint.]`, wordCount: this.countWords(body), tags: (data.tags || []) }];
    }

    // Ultimate fallback: empty placeholder
    return [{ title: data.title || 'Content', body: data.description || 'Content is not available at this time.', wordCount: this.countWords(data.description || ''), tags: (data.tags || []) }];
  }
}
