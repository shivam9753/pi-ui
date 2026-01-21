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
    <div class="card-container">
      <!-- Top row: avatar + title/author on left, status on right -->
      <div class="top-row">
        <div class="left-col">
          <div class="avatar">
            @if (submission.author && submission.author.avatarUrl) {
              <img src="{{ submission.author.avatarUrl }}" alt="avatar" />
            } @else {
              <span class="avatar-initial">{{ (submission.authorName || submission.submitterName || submission.username || 'S').charAt(0) }}</span>
            }
          </div>

          <div class="title-block">
            <h3 class="title">{{ submission.title }}</h3>
            <p class="author">{{ getAuthorName() }} <span class="ats">{{ submission.authorAts || submission.author?.ats || '-' }}</span></p>
          </div>
        </div>

        <div class="right-col">
          <span [ngClass]="getStatusBadgeClass()" class="status-badge">{{ getFormattedStatus() }}</span>
        </div>
      </div>

      <!-- Excerpt / description -->
      @if (getDescription()) {
        <p class="excerpt">{{ getDescription() }}</p>
      }

      <!-- Divider + bottom row with meta on left and action on right -->
      <div class="divider"></div>

      <div class="bottom-row">
        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Submitted</div>
            <div class="meta-value">{{ getFormattedDate() }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Type</div>
            <div class="meta-value">{{ getFormattedType() }}</div>
          </div>
        </div>

        <div class="actions">
          <button (click)="visibleActions[0]?.handler(submission)" class="action-btn">Review</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      box-sizing: border-box;
    }

    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .left-col {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex: 1 1 auto;
      min-width: 0; /* allow truncation */
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 9999px;
      overflow: hidden;
      flex: 0 0 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f97316; /* placeholder color — colors can be ignored */
      color: #fff;
      font-weight: 700;
      font-size: 18px;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-initial {
      display: inline-block;
    }

    .title-block {
      overflow: hidden;
    }

    .title {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.1;
      color: #111827;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .author {
      margin: 0;
      font-size: 13px;
      color: #6b7280;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .author .ats {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 12px;
      color: #111827;
    }

    .right-col {
      flex: 0 0 auto;
      margin-left: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }

    .excerpt {
      margin: 12px 0 8px 0;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.4;
    }

    .divider {
      height: 1px;
      background: #f3f4f6;
      margin: 8px -16px 8px -16px; /* stretch divider to card edges */
    }

    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .meta {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .meta-item .meta-label {
      font-size: 11px;
      color: #9ca3af;
    }

    .meta-item .meta-value {
      font-size: 14px;
      color: #374151;
    }

    .actions {
      flex: 0 0 auto;
    }

    .action-btn {
      background: #ff6a00; /* placeholder */
      color: #fff;
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      font-weight: 700;
      font-size: 14px;
    }

    /* Responsive tweaks for small screens */
    @media (max-width: 420px) {
      .card-container { padding: 12px; }
      .avatar { width: 40px; height: 40px; flex: 0 0 40px; }
      .title { font-size: 15px; }
      .action-btn { padding: 8px 12px; }
      .divider { margin-left: -12px; margin-right: -12px; }
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
    const baseClasses = 'inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border theme-aware-tag';
    
    const typeColors: { [key: string]: string } = {
      'poem': 'tag-purple',
      'prose': 'tag-blue',
      'article': 'tag-green',
      'opinion': 'tag-orange',
      'book_review': 'tag-indigo',
      'cinema_essay': 'tag-pink'
    };
    
    return `${baseClasses} ${typeColors[type] || 'tag-gray'}`;
  }

  getStatusBadgeClass(): string {
    const status = this.submission.status;
    const baseClasses = 'inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border theme-aware-tag';
    
    const statusColors: { [key: string]: string } = {
      'pending_review': 'tag-yellow',
      'in_review': 'tag-blue',
      'shortlisted': 'tag-orange',
      'accepted': 'tag-green',
      'published': 'tag-green',
      'rejected': 'tag-red',
      'needs_revision': 'tag-amber'
    };
    
    return `${baseClasses} ${statusColors[status] || 'tag-gray'}`;
  }

  getActionButtonClass(color: string): string {
    const baseClasses = 'shadow-sm font-semibold';
    
    const colorClasses: { [key: string]: string } = {
      'primary': 'text-white bg-primary hover:bg-primary-hover focus:ring-primary',
      'warning': 'text-white bg-primary hover:bg-primary-hover focus:ring-primary',
      'success': 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500',
      'danger': 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
      'secondary': 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 focus:ring-gray-500'
    };
    
    return `${baseClasses} ${colorClasses[color] || colorClasses['secondary']}`;
  }
}