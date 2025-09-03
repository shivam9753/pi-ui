import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SubmissionAction {
  label: string;
  color: 'primary' | 'warning' | 'success' | 'danger' | 'secondary';
  handler: (submission: any) => void;
  condition?: (submission: any) => boolean;
}

@Component({
  selector: 'app-submission-mobile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <!-- Selection checkbox (optional) -->
      @if (selectable) {
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <input 
              type="checkbox" 
              [checked]="selected" 
              (change)="onSelectionChange($event)"
              class="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
          </div>
        </div>
      }
      
      <!-- Title and Author Section -->
      <div class="mb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-2 leading-tight">{{ submission.title }}</h3>
        <p class="text-sm text-gray-600 mb-2">by {{ getAuthorName() }}</p>
        @if (getDescription()) {
          <p class="text-sm text-gray-500 leading-relaxed line-clamp-2">{{ getDescription() }}</p>
        }
      </div>
      
      <!-- Status and Meta Info -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <span [ngClass]="getTypeBadgeClass()" class="px-3 py-1 text-xs font-medium rounded-full">
          {{ getFormattedType() }}
        </span>
        <span [ngClass]="getStatusBadgeClass()" class="px-3 py-1 text-xs font-medium rounded-full">
          {{ getFormattedStatus() }}
        </span>
        <span class="text-xs text-gray-500 font-medium">
          {{ getFormattedDate() }}
        </span>
        @if (submission.readingTime) {
          <span class="text-xs text-gray-500 font-medium">
            {{ submission.readingTime }}m read
          </span>
        }
      </div>
      
      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-2 mt-4">
        @for (action of visibleActions; track action.label) {
          <button
            (click)="action.handler(submission)"
            [class]="getActionButtonClass(action.color)"
            class="flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-colors duration-200 min-w-0">
            {{ action.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class SubmissionMobileCardComponent {
  @Input() submission: any = {};
  @Input() actions: SubmissionAction[] = [];
  @Input() selectable: boolean = false;
  @Input() selected: boolean = false;
  @Input() badgeConfig: any = {};
  
  @Output() selectionChange = new EventEmitter<boolean>();

  get visibleActions(): SubmissionAction[] {
    return this.actions.filter(action => !action.condition || action.condition(this.submission));
  }

  onSelectionChange(event: any): void {
    this.selectionChange.emit(event.target.checked);
  }

  getAuthorName(): string {
    return this.submission.authorName || 
           (this.submission.author?.name) || 
           (this.submission.author?.email) || 
           'Unknown';
  }

  getDescription(): string {
    if (!this.submission.description && !this.submission.excerpt) return '';
    
    const text = this.submission.description || this.submission.excerpt || '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  }

  getFormattedType(): string {
    if (!this.submission.submissionType) return '';
    return this.submission.submissionType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  getFormattedStatus(): string {
    if (!this.submission.status) return '';
    const statusMap: { [key: string]: string } = {
      'pending_review': 'Pending Review',
      'in_review': 'In Review',
      'shortlisted': 'Shortlisted',
      'accepted': 'Ready to Publish',
      'published': 'Published',
      'rejected': 'Rejected',
      'needs_revision': 'Needs Revision'
    };
    return statusMap[this.submission.status] || this.submission.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  getFormattedDate(): string {
    const date = this.submission.reviewedAt || this.submission.publishedAt || this.submission.createdAt;
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getTypeBadgeClass(): string {
    const type = this.submission.submissionType;
    const baseClasses = 'inline-flex items-center text-xs font-medium rounded-full';
    
    const typeColors: { [key: string]: string } = {
      'poem': 'bg-purple-100 text-purple-800 border border-purple-200',
      'prose': 'bg-blue-100 text-blue-800 border border-blue-200',
      'article': 'bg-green-100 text-green-800 border border-green-200',
      'opinion': 'bg-orange-100 text-orange-800 border border-orange-200',
      'book_review': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      'cinema_essay': 'bg-pink-100 text-pink-800 border border-pink-200'
    };
    
    return `${baseClasses} ${typeColors[type] || 'bg-gray-100 text-gray-800 border border-gray-200'}`;
  }

  getStatusBadgeClass(): string {
    const status = this.submission.status;
    const baseClasses = 'inline-flex items-center text-xs font-medium rounded-full';
    
    const statusColors: { [key: string]: string } = {
      'pending_review': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'in_review': 'bg-blue-100 text-blue-800 border border-blue-200',
      'shortlisted': 'bg-orange-100 text-orange-800 border border-orange-200',
      'accepted': 'bg-green-100 text-green-800 border border-green-200',
      'published': 'bg-green-100 text-green-800 border border-green-200',
      'rejected': 'bg-red-100 text-red-800 border border-red-200',
      'needs_revision': 'bg-amber-100 text-amber-800 border border-amber-200'
    };
    
    return `${baseClasses} ${statusColors[status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`;
  }

  getActionButtonClass(color: string): string {
    const baseClasses = 'shadow-sm font-semibold';
    
    const colorClasses: { [key: string]: string } = {
      'primary': 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      'warning': 'text-white bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
      'success': 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500',
      'danger': 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
      'secondary': 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 focus:ring-gray-500'
    };
    
    return `${baseClasses} ${colorClasses[color] || colorClasses['secondary']}`;
  }
}