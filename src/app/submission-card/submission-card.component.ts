// reusable-card.component.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
import { TypeBadgePipe } from '../pipes/type-badge.pipe';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';
import { Author, AuthorUtils } from '../models';
import { SubmissionTagComponent } from '../shared/components/submission-tag/submission-tag.component';

export interface CardData {
  _id?: string;
  id?: string;
  title: string;
  submissionType: string;
  excerpt?: string;
  description?: string;
  author?: Author; // Standardized author info
  // Legacy fields for backward compatibility
  submitterName?: string;
  authorName?: string;
  reviewerName?: string;
  createdAt?: Date | string;
  reviewedAt?: Date | string;
  imageUrl?: string;
  readingTime?: number;
  tags?: string[];
  status?: 'pending' | 'accepted' | 'rejected' | 'draft';
  // Allow any additional properties for flexibility
  [key: string]: any;
}

export interface CardAction {
  label: string;
  icon?: string;
  variant?: 'primary' | 'outline' | 'secondary';
  loading?: boolean;
}

@Component({
  selector: 'app-submission-card',
  imports: [CommonModule, RouterModule, DatePipe, PrettyLabelPipe, TypeBadgePipe, SubmissionTagComponent],
  templateUrl: './submission-card.component.html',
  styleUrls: ['./submission-card.component.css']
})
export class SubmissionCardComponent {
  @Input() data!: CardData;
  @Input() action!: CardAction;
  @Input() showDescription: boolean = true;
  @Input() showReviewer: boolean = false;
  @Input() descriptionLines: number = 5;
  @Input() customBadgeColor?: string;
  @Output() actionClicked = new EventEmitter<string>();
  @Output() titleClicked = new EventEmitter<string>();
  @Output() badgeClicked = new EventEmitter<string>();

  constructor(private htmlSanitizer: HtmlSanitizerService) {}

  onActionClick() {
    const id = this.data._id || this.data.id || '';
    this.actionClicked.emit(id);
  }

  onTitleClick() {
    const id = this.data._id || this.data.id || '';
    this.titleClicked.emit(id);
  }

  onBadgeClick() {
    this.badgeClicked.emit(this.data.submissionType);
  }

  getAuthor(): Author {
    // If we have standardized author data, use it
    if (this.data.author) {
      return this.data.author;
    }
    // Otherwise, normalize from legacy fields
    return AuthorUtils.normalizeAuthor(this.data);
  }

  getAuthorInitial(): string {
    return AuthorUtils.getInitials(this.getAuthor());
  }

  getAuthorName(): string {
    return this.getAuthor().name;
  }

  getAuthorProfileUrl(): string {
    return AuthorUtils.getProfileUrl(this.getAuthor());
  }

  hasAuthorProfileImage(): boolean {
    return AuthorUtils.hasProfileImage(this.getAuthor());
  }


  getCardClasses(): string {
    // Keep cards neutral - only badge shows submission type color
    // Make cards wider on mobile for better readability
    return `p-5 rounded-2xl bg-white shadow-lg border border-gray-100 transition group w-full max-w-none md:max-w-xs mx-auto md:mx-0`;
  }

  getActionButtonClasses(): string {
    // Smaller button with hover effects and proper cursor
    return `flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-all duration-200 text-gray-700 hover:text-gray-900 rounded-lg font-medium text-sm min-h-[36px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer w-full hover:shadow-sm`;
  }

  getStatusText(): string {
    if (this.showReviewer && this.data.reviewerName) {
      return 'Reviewed by';
    }
    
    switch (this.data.status) {
      case 'pending': return 'Pending Review';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'draft': return 'Draft';
      default: return 'Submitted';
    }
  }

  getStatusValue(): string {
    if (this.showReviewer && this.data.reviewerName) {
      return this.data.reviewerName;
    }
    
    return this.data.createdAt ? 
      new Date(this.data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
      '';
  }

  // Clean HTML tags from description using global service
  getCleanDescription(): string {
    return this.htmlSanitizer.getCleanDescription(
      this.data.excerpt,
      this.data.description,
      'No preview available'
    );
  }

  // Check if submission type supports quick review/fast track
  isQuickReviewType(): boolean {
    const quickReviewTypes = ['opinion'];
    return quickReviewTypes.includes(this.data.submissionType?.toLowerCase());
  }
}