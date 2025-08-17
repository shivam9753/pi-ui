import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction } from '../data-table.component';
import { SubmissionTagComponent } from '../../submission-tag/submission-tag.component';

@Component({
  selector: 'app-submission-mobile-card',
  standalone: true,
  imports: [CommonModule, SubmissionTagComponent],
  template: `
    <div class="mb-3">
      <h3 class="font-semibold text-gray-900 mb-1">{{ submission.title }}</h3>
      <p class="text-sm text-gray-600">by {{ getAuthorName(submission) }}</p>
      @if (submission?.description) {
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ submission?.description }}</p>
      }
    </div>
    
    <!-- Status and Meta Info -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <app-submission-tag 
        [value]="submission.submissionType" 
        tagType="type"
        [showIcon]="true"
        size="xs">
      </app-submission-tag>
      <app-submission-tag 
        [value]="submission.status" 
        tagType="status"
        [showIcon]="false"
        size="xs">
      </app-submission-tag>
      <span class="text-xs text-gray-500">
        {{ submission.createdAt | date:'MMM d, y' }}
      </span>
    </div>
    
    <!-- Action Buttons -->
    @if (actions.length > 0) {
      <div class="flex flex-wrap gap-2">
        @for (action of actions; track action.label) {
          <button
            (click)="action.handler(submission)"
            [class]="getActionButtonClass(action.color)"
            class="flex-1 px-3 py-2 text-xs font-medium rounded">
            {{ action.label }}
          </button>
        }
      </div>
    }
  `
})
export class SubmissionMobileCardComponent {
  @Input() submission: any;
  @Input() actions: TableAction[] = [];

  getAuthorName(submission: any): string {
    return submission.userId?.name || submission.userId?.username || 'Unknown';
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'pending': 'bg-yellow-50 text-amber-700',
      'under_review': 'bg-blue-50 text-blue-700',
      'ready_to_publish': 'bg-green-50 text-green-700',
      'published': 'bg-green-50 text-green-700',
      'rejected': 'bg-red-50 text-red-700',
      'draft': 'bg-gray-50 text-gray-700'
    };
    return statusClasses[status] || 'bg-gray-50 text-gray-700';
  }

  getActionButtonClass(color?: string): string {
    const colorClasses: Record<string, string> = {
      'primary': 'action-btn-primary',
      'warning': 'action-btn-warning', 
      'danger': 'action-btn-danger',
      'success': 'action-btn-success'
    };
    return colorClasses[color || 'primary'] || colorClasses['primary'];
  }
}