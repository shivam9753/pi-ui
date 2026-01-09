import { Component, Input, Output, EventEmitter } from '@angular/core';

import { getSubmissionTypeMapping } from '../../shared/constants/submission-mappings';

@Component({
  selector: 'app-badge-label',
  standalone: true,
  imports: [],
  template: `
    <button
      (click)="onClick()"
      [class]="getBadgeClasses()"
      [disabled]="!clickable"
      aria-pressed="false"
      >
      {{ getDisplayName() }}
    </button>
    `,
  styles: [`
    :host {
      display: inline-block;
      max-width: 100%;
    }

    span {
      word-break: break-word;
    }

    @media (max-width: 480px) {
      span {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
      }
    }

    /* Force serif font for the large badge variant across contexts */
    .badge-big-red {
      font-family: "Crimson Text", Georgia, serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
    }
  `]
})
export class BadgeLabelComponent {
  @Input() type = '';
  @Input() clickable = false;
  // New variant input: 'soft' (default, existing behavior), 'solid' (solid background for overlays), 'outline' (bordered)
  @Input() variant: 'soft' | 'solid' | 'outline' | 'big-red' = 'soft';
  @Output() badgeClick = new EventEmitter<string>();

  onClick() {
    if (this.clickable) {
      this.badgeClick.emit(this.type);
    }
  }

  getDisplayName(): string {
    const mapping = getSubmissionTypeMapping(this.type);
    return mapping.displayName;
  }


  getBadgeClasses(): string {
    const mapping = getSubmissionTypeMapping(this.type);
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors';
    const clickableClasses = this.clickable ? ' hover:opacity-80 cursor-pointer' : '';

    if (this.variant === 'solid') {
      // Solid styles (suitable for image overlay)
      const solidMap: Record<string, string> = {
        'tag-gray': 'bg-gray-500 text-white dark:bg-gray-600',
        'tag-blue': 'bg-blue-500 text-white dark:bg-blue-600',
        'tag-green': 'bg-green-500 text-white dark:bg-green-600',
        'tag-emerald': 'bg-emerald-500 text-white dark:bg-emerald-600',
        'tag-purple': 'bg-purple-600 text-white dark:bg-purple-600',
        'tag-orange': 'bg-primary text-white dark:bg-primary',
        'tag-yellow': 'bg-yellow-500 text-white dark:bg-yellow-600',
        'tag-red': 'bg-red-500 text-white dark:bg-red-600'
      };

      const colorClass = solidMap[mapping.color] || solidMap['tag-gray'];
      return `${baseClasses} ${colorClass}${clickableClasses}`;
    }

    if (this.variant === 'outline') {
      const outlineMap: Record<string, string> = {
        'tag-gray': 'border border-gray-300 text-gray-700 bg-transparent dark:border-gray-600 dark:text-gray-300',
        'tag-blue': 'border border-blue-300 text-blue-700 bg-transparent dark:border-blue-600 dark:text-blue-300',
        'tag-green': 'border border-green-300 text-green-700 bg-transparent dark:border-green-600 dark:text-green-300',
        'tag-emerald': 'border border-emerald-300 text-emerald-700 bg-transparent dark:border-emerald-600 dark:text-emerald-300',
        'tag-purple': 'border border-purple-300 text-purple-700 bg-transparent dark:border-purple-600 dark:text-purple-300',
        'tag-orange': 'border border-neutral-300 text-primary-dark bg-transparent dark:border-primary-light dark:text-primary-light-light',
        'tag-yellow': 'border border-yellow-300 text-yellow-700 bg-transparent dark:border-yellow-600 dark:text-yellow-300',
        'tag-red': 'border border-red-300 text-red-700 bg-transparent dark:border-red-600 dark:text-red-300'
      };

      const colorClass = outlineMap[mapping.color] || outlineMap['tag-gray'];
      return `${baseClasses} ${colorClass}${clickableClasses}`;
    }

    // Large prominent red label variant
    if (this.variant === 'big-red') {
      // Render a large, bold uppercase red label (no pill background)
      // Use themed accent color defined in global styles (text-themed-accent -> var(--text-accent))
      // Make the appearance explicit and force the serif family via .badge-big-red class.
      const bigRed = 'badge-big-red inline-flex items-center px-2 py-0.5 text-themed-accent uppercase tracking-widest text-sm md:text-base';
      return `${bigRed}${clickableClasses}`;
    }

    // Default 'soft' variant uses the existing mapping color class (soft background / subtle border)
    // Soft map: light background with matching text color (pill-like)
    const softMap: Record<string, string> = {
      'tag-gray': 'bg-gray-50 text-gray-700 border border-gray-100',
      'tag-blue': 'bg-blue-50 text-blue-700 border border-blue-100',
      'tag-green': 'bg-green-50 text-green-700 border border-green-100',
      'tag-emerald': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      'tag-purple': 'bg-purple-50 text-purple-700 border border-purple-100',
      'tag-orange': 'bg-primary-light text-primary border border-primary/10',
      'tag-yellow': 'bg-yellow-50 text-yellow-700 border border-yellow-100',
      'tag-red': 'bg-red-50 text-red-700 border border-red-100'
    };
    const colorClass = softMap[mapping.color] || softMap['tag-gray'];
    return `${baseClasses} ${colorClass}${clickableClasses}`;
  }
}