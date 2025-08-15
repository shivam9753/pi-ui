import { Component, Input, Output, EventEmitter } from '@angular/core';

import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';

@Component({
  selector: 'app-badge-label',
  standalone: true,
  imports: [PrettyLabelPipe],
  template: `
    <button
      (click)="onClick()"
      [class]="getBadgeClasses()"
      [disabled]="!clickable"
      >
      @if (type === 'opinion') {
        <span class="mr-1">⚡</span>
        }{{ type | prettyLabel }}
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

  getBadgeClasses(): string {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors';
    const clickableClasses = this.clickable ? ' hover:bg-orange-600 cursor-pointer' : '';
    
    // Special styling for Opinion type (expedited)
    if (this.type === 'opinion') {
      return `${baseClasses} bg-orange-500 text-white${clickableClasses}`;
    }
    
    // Default styling for other types  
    return `${baseClasses} bg-orange-500 text-white${clickableClasses}`;
  }
}