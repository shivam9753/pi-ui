import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  getSubmissionTypeMapping, 
  getSubmissionStatusMapping,
  SubmissionTypeMapping,
  SubmissionStatusMapping
} from '../../constants/submission-mappings';

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
  | 'featured'
  | 'poem'
  | 'prose'
  | 'story'
  | 'article'
  | 'opinion'
  | 'book_review'
  | 'cinema_essay'
  | 'interview'
  | 'other'
  | 'resubmitted'
  | 'shortlisted'
  | 'approved'
  | 'submitted'
  | 'archived';

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
  @Input() tagType: 'type' | 'status' = 'status';

  private isSubmissionType(status: string): boolean {
    return ['poem', 'prose', 'story', 'article', 'opinion', 'book_review', 'cinema_essay', 'interview', 'other'].includes(status);
  }

  private getMapping(): SubmissionTypeMapping | SubmissionStatusMapping {
    const actualTagType = this.tagType === 'type' || this.isSubmissionType(this.status) 
      ? 'type' 
      : 'status';
    
    return actualTagType === 'type' 
      ? getSubmissionTypeMapping(this.status)
      : getSubmissionStatusMapping(this.status);
  }

  getStatusLabel(): string {
    return this.getMapping().displayName;
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
    const mapping = this.getMapping();
    return mapping.color;
  }

  getIconPath(): string {
    const mapping = this.getMapping();
    return mapping.icon;
  }
}
