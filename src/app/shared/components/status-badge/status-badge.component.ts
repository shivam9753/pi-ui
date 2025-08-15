import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusType =
  | 'pending_review'
  | 'in_progress'
  | 'accepted'
  | 'rejected'
  | 'needs_revision'
  | 'published'
  | 'draft'
  | 'active'
  | 'inactive'
  | 'featured';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded-full font-medium"
      [ngClass]="getBadgeClasses()"
    >
      @if (showIcon) {
        <svg
          class="w-3 h-3 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path [attr.d]="getIconPath()"></path>
        </svg>
      }
      {{ getStatusLabel() }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() status!: StatusType | string;
  @Input() showIcon = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'solid' | 'outline' | 'soft' = 'soft';

  getStatusLabel(): string {
    switch (this.status) {
      case 'pending_review':
        return 'Pending Review';
      case 'in_progress':
        return 'In Progress';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'needs_revision':
        return 'Needs Revision';
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'featured':
        return 'Featured';
      default:
        return typeof this.status === 'string' ? this.status : '';
    }
  }

  getBadgeClasses(): string {
    return `${this.getBaseClasses()} ${this.getColorClasses()}`;
  }

  private getBaseClasses(): string {
    const sizeMap = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm'
    };
    return sizeMap[this.size] || sizeMap.md;
  }

  private getColorClasses(): string {
    const colorMap: Record<StatusType, { light: string; dark: string }> = {
      pending_review: { light: 'bg-yellow-100 text-yellow-800', dark: 'dark:bg-yellow-500/20 dark:text-yellow-300' },
      in_progress: { light: 'bg-blue-100 text-blue-800', dark: 'dark:bg-blue-500/20 dark:text-blue-300' },
      accepted: { light: 'bg-green-100 text-green-800', dark: 'dark:bg-green-500/20 dark:text-green-300' },
      rejected: { light: 'bg-red-100 text-red-800', dark: 'dark:bg-red-500/20 dark:text-red-300' },
      needs_revision: { light: 'bg-orange-100 text-orange-800', dark: 'dark:bg-orange-500/20 dark:text-orange-300' },
      published: { light: 'bg-emerald-100 text-emerald-800', dark: 'dark:bg-emerald-500/20 dark:text-emerald-300' },
      draft: { light: 'bg-gray-100 text-gray-800', dark: 'dark:bg-gray-500/20 dark:text-gray-300' },
      active: { light: 'bg-green-100 text-green-800', dark: 'dark:bg-green-500/20 dark:text-green-300' },
      inactive: { light: 'bg-gray-100 text-gray-800', dark: 'dark:bg-gray-500/20 dark:text-gray-300' },
      featured: { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-500/20 dark:text-purple-300' }
    };

    const colors =
      colorMap[this.status as StatusType] ||
      { light: 'bg-gray-100 text-gray-800', dark: 'dark:bg-gray-500/20 dark:text-gray-300' };

    return `${colors.light} ${colors.dark}`;
  }

  getIconPath(): string {
    switch (this.status) {
      case 'pending_review':
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'in_progress':
        return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
      case 'accepted':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'rejected':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'needs_revision':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'published':
        return 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z';
      case 'draft':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'featured':
        return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
      case 'active':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'inactive':
        return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}
