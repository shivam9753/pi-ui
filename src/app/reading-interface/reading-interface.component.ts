import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { BackendService } from '../backend.service';

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
  imports: [CommonModule, FormsModule, RouterLink],
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService // Inject your service
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const contentId = params['id'];
      if (contentId) {
        this.loadContent(contentId);
      }
    });

    // Track reading progress
    window.addEventListener('scroll', () => this.updateReadingProgress());
  }

  async loadContent(contentId: string) {
    this.loading.set(true);
    this.error.set(null);
    
    this.backendService.getPublishedContentById(contentId).subscribe({
      next: (data: PublishedContent | null) => {
        console.log('Loaded content:', data);
        this.content.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading content:', err);
        this.error.set('Failed to load content');
        this.loading.set(false);
      }
    });
  }

  // ... keep all your existing methods (goBack, toggleLike, etc.) ...

  goBack() {
    this.router.navigate(['/explore']);
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

  shareContent() {
    if (navigator.share) {
      navigator.share({
        title: this.content()?.title,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
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
}
