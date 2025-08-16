import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BadgeLabelComponent } from '../badge-label/badge-label.component';
import { StringUtils } from '../../shared/utils';

export interface PublishedContent {
  _id?: string;
  title: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string;
  submissionType: string;
  username?: string;
  author?: {
    username?: string;
    name: string;
  };
  createdAt: string;
  readingTime?: number;
  slug?: string;
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  isLiked?: boolean;
  isBookmarked?: boolean;
}

@Component({
  selector: 'app-published-content-card',
  imports: [CommonModule, DatePipe, BadgeLabelComponent],
  templateUrl: './published-content-card.component.html',
  styleUrl: './published-content-card.component.css'
})
export class PublishedContentCardComponent {
  @Input() content!: PublishedContent;
  @Input() showStats = false; // Show view count, likes, etc.
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showActions = false; // Show admin action buttons
  @Input() showHoverActions = true; // Show hover actions for regular users
  @Output() cardClick = new EventEmitter<PublishedContent>();
  @Output() editClick = new EventEmitter<PublishedContent>();
  @Output() unpublishClick = new EventEmitter<PublishedContent>();
  @Output() deleteClick = new EventEmitter<PublishedContent>();
  @Output() likeClick = new EventEmitter<PublishedContent>();
  @Output() bookmarkClick = new EventEmitter<PublishedContent>();
  @Output() shareClick = new EventEmitter<PublishedContent>();
  @Output() tagClick = new EventEmitter<string>();

  constructor(private router: Router) {}

  onCardClick() {
    this.cardClick.emit(this.content);
  }

  onEditClick(event: Event) {
    event.stopPropagation(); // Prevent card click
    this.editClick.emit(this.content);
  }

  onUnpublishClick(event: Event) {
    event.stopPropagation(); // Prevent card click
    this.unpublishClick.emit(this.content);
  }

  onDeleteClick(event: Event) {
    event.stopPropagation(); // Prevent card click
    this.deleteClick.emit(this.content);
  }

  onLikeClick(event: Event) {
    event.stopPropagation();
    this.likeClick.emit(this.content);
  }

  onBookmarkClick(event: Event) {
    event.stopPropagation();
    this.bookmarkClick.emit(this.content);
  }

  onShareClick(event: Event) {
    event.stopPropagation();
    this.shareClick.emit(this.content);
  }

  onTagClick(event: Event, tag: string) {
    event.stopPropagation();
    this.tagClick.emit(tag);
  }

  cleanContent(text: string): string {
    if (!text) return 'No preview available';
    // Remove HTML tags and clean up content for preview
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  getAuthorName(): string {
    return this.content.author?.name || this.content.username || 'Anonymous';
  }

  getAuthorInitials(): string {
    const name = this.getAuthorName();
    return StringUtils.getInitialsWithFallback(name);
  }

  getImageClass(): string {
    switch (this.size) {
      case 'small':
        return 'h-32';
      case 'large':
        return 'h-64';
      default:
        return 'h-48';
    }
  }

  getReadingTime(): number {
    return this.content.readingTime || 3;
  }

  // Navigate to category page
  onCategoryClick(category: string) {
    this.router.navigate(['/category', category]);
  }

  getDisplayTags(): string[] {
    // Return first 2 tags for display
    return this.content.tags?.slice(0, 2) || [];
  }
}