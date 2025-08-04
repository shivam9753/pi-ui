import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BadgeLabelComponent } from '../badge-label/badge-label.component';

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
  };
  createdAt: string;
  readingTime?: number;
  slug?: string;
  viewCount?: number;
  likeCount?: number;
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
  @Output() cardClick = new EventEmitter<PublishedContent>();

  onCardClick() {
    this.cardClick.emit(this.content);
  }

  cleanContent(text: string): string {
    if (!text) return 'No preview available';
    // Remove HTML tags and clean up content for preview
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  getAuthorName(): string {
    return this.content.author?.username || this.content.username || 'Anonymous';
  }

  getAuthorInitials(): string {
    const name = this.getAuthorName();
    return name.charAt(0).toUpperCase();
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
}