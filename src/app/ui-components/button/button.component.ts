import { Component, Input, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass],
  template: `
    <button
  [attr.type]="type"
  class="btn"
  [ngClass]="[
    'btn--' + variant,
    'btn--' + size,
    (disabled || loading) ? 'btn--disabled' : ''
  ]"
  [disabled]="disabled || loading"
  (click)="handleClick($event)"
>
  @if (!loading) {
    <span class="btn__label">
      <ng-content></ng-content>
    </span>
  } @else {
    <span class="btn__spinner"></span>
  }
</button>

  `,
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() type: ButtonType = 'button';

  // New output to forward click events from the internal button
  @Output() buttonClick = new EventEmitter<Event>();

  handleClick(event: Event) {
    // Prevent emitting when disabled
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.buttonClick.emit(event);
  }
}
