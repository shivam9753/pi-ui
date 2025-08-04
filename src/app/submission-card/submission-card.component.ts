// reusable-card.component.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
import { HtmlSanitizerService } from '../services/html-sanitizer.service';

export interface CardData {
  _id?: string;
  id?: string;
  title: string;
  submissionType: string;
  excerpt?: string;
  description?: string;
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
  imports: [CommonModule, RouterModule, DatePipe, PrettyLabelPipe],
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

  getAuthorInitial(): string {
    const authorName = this.data.submitterName || this.data.authorName || 'Unknown';
    return authorName.charAt(0)?.toUpperCase() || 'U';
  }

  getAuthorName(): string {
    return this.data.submitterName || this.data.authorName || 'Anonymous';
  }

  getBadgeClasses(): string {
    if (this.customBadgeColor) {
      return `px-3 py-1 text-xs font-medium rounded-full text-white ${this.customBadgeColor}`;
    }
    
    // Default badge colors based on submission type
    const typeColors: { [key: string]: string } = {
      'article': 'bg-blue-500',
      'cinema essay': 'bg-purple-500',
      'review': 'bg-green-500',
      'interview': 'bg-orange-500',
      'feature': 'bg-red-500'
    };
    
    const colorClass = typeColors[this.data.submissionType.toLowerCase()] || 'bg-themed-accent';
    return `px-3 py-1 text-xs font-medium rounded-full text-white ${colorClass}`;
  }

  getActionButtonClasses(): string {
    const baseClasses = 'w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 group';
    
    switch (this.action.variant) {
      case 'primary':
        return `${baseClasses} bg-themed-accent text-white hover:bg-themed-accent/90`;
      case 'secondary':
        return `${baseClasses} bg-themed-secondary text-themed hover:bg-themed-secondary/80`;
      case 'outline':
      default:
        return `${baseClasses} border border-themed-accent text-themed-accent hover:bg-themed-accent hover:text-white`;
    }
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
}