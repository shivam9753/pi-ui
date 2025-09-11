import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'pi-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="onClick($event)"
      (focus)="onFocus($event)"
      (blur)="onBlur($event)">
      
      <!-- Loading State -->
      @if (loading) {
        <svg 
          class="pi-btn-spinner animate-spin -ml-1 mr-2 h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24">
          <circle 
            class="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="4">
          </circle>
          <path 
            class="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
      }
      
      <!-- Icon - Left -->
      @if (iconLeft && !loading) {
        <span class="pi-btn-icon-left" [innerHTML]="iconLeft"></span>
      }
      
      <!-- Content -->
      <span class="pi-btn-content">
        <ng-content></ng-content>
      </span>
      
      <!-- Icon - Right -->
      @if (iconRight && !loading) {
        <span class="pi-btn-icon-right" [innerHTML]="iconRight"></span>
      }
    </button>
  `,
  styles: [`
    .pi-btn-spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .pi-btn-icon-left {
      margin-right: var(--pi-space-2);
      display: flex;
      align-items: center;
    }
    
    .pi-btn-icon-right {
      margin-left: var(--pi-space-2);
      display: flex;
      align-items: center;
    }
    
    .pi-btn-content {
      display: flex;
      align-items: center;
    }
    
    /* Icon sizing */
    .pi-btn-icon-left :global(svg),
    .pi-btn-icon-right :global(svg) {
      width: 1em;
      height: 1em;
      flex-shrink: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() ariaLabel?: string;

  @Output() buttonClick = new EventEmitter<Event>();
  @Output() buttonFocus = new EventEmitter<FocusEvent>();
  @Output() buttonBlur = new EventEmitter<FocusEvent>();

  get buttonClasses(): string {
    const baseClasses = 'btn-feedback inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Variant classes - using existing working CSS classes
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost'
    };
    
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-4 py-2 text-sm min-h-[40px]', 
      lg: 'px-6 py-3 text-base min-h-[48px]'
    };
    
    const classes = [
      baseClasses,
      variantClasses[this.variant],
      sizeClasses[this.size]
    ];
    
    // Modifiers
    if (this.fullWidth) classes.push('w-full');
    if (this.loading) classes.push('opacity-75');
    
    return classes.filter(Boolean).join(' ');
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.buttonClick.emit(event);
    }
  }

  onFocus(event: FocusEvent): void {
    this.buttonFocus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.buttonBlur.emit(event);
  }
}