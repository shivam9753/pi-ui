import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';

@Component({
  selector: 'app-badge-label',
  standalone: true,
  imports: [CommonModule, PrettyLabelPipe],
  template: `
    <button
      (click)="onClick()"
      [class]="clickable ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white-accent text-white hover:bg-opacity-80 transition-colors cursor-pointer' : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white-accent text-white'"
      [disabled]="!clickable"
    >
      {{ type | prettyLabel }}
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
}