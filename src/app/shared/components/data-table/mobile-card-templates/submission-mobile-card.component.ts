import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction } from '../data-table.component';

@Component({
  selector: 'app-submission-mobile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-3">
      <h3 class="font-semibold text-gray-900 mb-1">{{ submission.title }}</h3>
      <p class="text-sm text-gray-600">by {{ getAuthorName(submission) }}</p>
      @if (submission.description) {
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ submission.description }}</p>
      }
    </div>
    
    <!-- Status and Meta Info -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
        {{ submission.submissionType }}
      </span>
      <span class="px-2 py-1 rounded text-xs font-medium"
        [ngClass]="getStatusClass(submission.status)">
        {{ submission.status }}
      </span>
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
      'pending': 'bg-yellow-50 text-yellow-700',
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
      'primary': 'text-blue-600 bg-blue-50 border border-blue-200',
      'warning': 'text-orange-600 bg-orange-50 border border-orange-200',
      'danger': 'text-red-600 bg-red-50 border border-red-200',
      'success': 'text-green-600 bg-green-50 border border-green-200'
    };
    return colorClasses[color || 'primary'] || colorClasses['primary'];
  }
}