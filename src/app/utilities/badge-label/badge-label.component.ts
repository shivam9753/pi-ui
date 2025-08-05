import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';

@Component({
  selector: 'app-badge-label',
  standalone: true,
  imports: [CommonModule, PrettyLabelPipe],
  template: `
    <span
      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white-accent text-white"
    >
      {{ type | prettyLabel }}
    </span>
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
}