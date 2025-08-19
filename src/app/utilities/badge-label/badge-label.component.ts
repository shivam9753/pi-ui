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
  `]
})
export class BadgeLabelComponent {
  @Input() type = '';
  @Input() clickable = false;
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
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors';
    const clickableClasses = this.clickable ? ' hover:opacity-80 cursor-pointer' : '';
    
    return `${baseClasses} ${mapping.color}${clickableClasses}`;
  }
}