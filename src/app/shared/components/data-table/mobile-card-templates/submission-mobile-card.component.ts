import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction } from '../data-table.component';
import { SubmissionTagComponent } from '../../submission-tag/submission-tag.component';

@Component({
  selector: 'app-submission-mobile-card',
  standalone: true,
  imports: [CommonModule, SubmissionTagComponent],
  template: `
    <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3">
      <!-- Top: Author + ATS on left, Status on right -->
      <div class="flex items-start justify-between mb-2">
        <div class="min-w-0">
          <div class="text-xs text-gray-400">Author</div>
          <div class="text-sm font-medium text-gray-900 truncate">
            {{ getAuthorName(submission) }}
            <span class="ml-2 inline-block text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
              {{ submission.authorAts || submission.author?.ats || '-' }}
            </span>
          </div>
        </div>

        <div class="flex-shrink-0 ml-3">
          <app-submission-tag
            [value]="submission.status"
            tagType="status"
            [showIcon]="false"
            size="xs">
          </app-submission-tag>
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-lg font-semibold text-gray-900 mb-2 truncate">{{ submission.title }}</h3>

      <!-- Excerpt -->
      @if (submission?.description || submission?.excerpt) {
        <p class="text-sm text-gray-500 mb-3 line-clamp-2">{{ submission.description || submission.excerpt }}</p>
      }

      <div class="border-t border-gray-100 -mx-4 my-3"></div>

      <!-- Bottom: Date & Type (left) and Action (right) -->
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          <div class="text-xs text-gray-400">Submitted</div>
          <div class="text-sm text-gray-800">{{ submission.createdAt | date:'MMM d, y' }}</div>

          <div class="mt-2 text-xs text-gray-400">Type</div>
          <div class="text-sm text-gray-800">{{ submission.submissionType }}</div>
        </div>

        <div class="flex-shrink-0">
          @if (actions && actions.length > 0) {
            <button (click)="actions[0].handler(submission)" [class]="getActionButtonClass('primary')" class="px-4 py-2 rounded-md font-semibold">{{ actions[0].label }}</button>
          }
        </div>
      </div>
    </div>
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