import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  getSubmissionTypeMapping, 
  getSubmissionStatusMapping,
  SubmissionTypeMapping,
  SubmissionStatusMapping
} from '../../constants/submission-mappings';

export type TagType = 'type' | 'status';

@Component({
  selector: 'app-submission-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded-full font-medium transition-colors"
      [ngClass]="getTagClasses()"
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
      {{ getDisplayText() }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class SubmissionTagComponent {
  @Input() value!: string;
  @Input() tagType: TagType = 'status';
  @Input() showIcon = true;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
  @Input() variant: 'solid' | 'outline' | 'soft' = 'soft';
  @Input() clickable = false;

  private mapping: SubmissionTypeMapping | SubmissionStatusMapping | null = null;

  private getMapping(): SubmissionTypeMapping | SubmissionStatusMapping {
    if (!this.mapping) {
      this.mapping = this.tagType === 'type' 
        ? getSubmissionTypeMapping(this.value)
        : getSubmissionStatusMapping(this.value);
    }
    return this.mapping;
  }

  getDisplayText(): string {
    return this.getMapping().displayName;
  }

  getIconPath(): string {
    return this.getMapping().icon;
  }

  getTagClasses(): string {
    const mapping = this.getMapping();
    const baseClasses = this.getBaseClasses();
    const colorClasses = this.getColorClasses(mapping.color);
    const clickableClasses = this.clickable ? ' cursor-pointer hover:opacity-80' : '';
    
    return `${baseClasses} ${colorClasses}${clickableClasses}`;
  }

  private getBaseClasses(): string {
    const sizeMap = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1 text-sm'
    };
    return sizeMap[this.size] || sizeMap.sm;
  }

  private getColorClasses(colorClass: string): string {
    if (this.variant === 'outline') {
      return this.getOutlineColorClasses(colorClass);
    } else if (this.variant === 'solid') {
      return this.getSolidColorClasses(colorClass);
    }
    
    // Default soft variant
    return colorClass;
  }

  private getOutlineColorClasses(colorClass: string): string {
    const outlineMap: Record<string, string> = {
      'tag-gray': 'border border-gray-300 text-gray-700 bg-transparent dark:border-gray-600 dark:text-gray-300',
      'tag-blue': 'border border-blue-300 text-blue-700 bg-transparent dark:border-blue-600 dark:text-blue-300',
      'tag-green': 'border border-green-300 text-green-700 bg-transparent dark:border-green-600 dark:text-green-300',
      'tag-emerald': 'border border-emerald-300 text-emerald-700 bg-transparent dark:border-emerald-600 dark:text-emerald-300',
      'tag-purple': 'border border-purple-300 text-purple-700 bg-transparent dark:border-purple-600 dark:text-purple-300',
      'tag-orange': 'border border-orange-300 text-orange-700 bg-transparent dark:border-orange-600 dark:text-orange-300',
      'tag-yellow': 'border border-yellow-300 text-yellow-700 bg-transparent dark:border-yellow-600 dark:text-yellow-300',
      'tag-red': 'border border-red-300 text-red-700 bg-transparent dark:border-red-600 dark:text-red-300'
    };
    
    return outlineMap[colorClass] || outlineMap['tag-gray'];
  }

  private getSolidColorClasses(colorClass: string): string {
    const solidMap: Record<string, string> = {
      'tag-gray': 'bg-gray-500 text-white dark:bg-gray-600',
      'tag-blue': 'bg-blue-500 text-white dark:bg-blue-600',
      'tag-green': 'bg-green-500 text-white dark:bg-green-600',
      'tag-emerald': 'bg-emerald-500 text-white dark:bg-emerald-600',
      'tag-purple': 'bg-purple-500 text-white dark:bg-purple-600',
      'tag-orange': 'bg-orange-500 text-white dark:bg-orange-600',
      'tag-yellow': 'bg-yellow-500 text-white dark:bg-yellow-600',
      'tag-red': 'bg-red-500 text-white dark:bg-red-600'
    };
    
    return solidMap[colorClass] || solidMap['tag-gray'];
  }
}