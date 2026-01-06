import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type AlertTone = 'success' | 'info' | 'warning' | 'error';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-banner.component.html'
})
export class AlertBannerComponent {
  @Input() tone: AlertTone = 'info';
  @Input() title?: string;
  @Input() description?: string;
  @Input() ctaLabel?: string;
  @Input() ctaAction?: () => void;
  @Input() dismissible = true;

  isVisible = signal(true);

  close() {
    this.isVisible.set(false);
  }

  get containerClasses(): string {
    return {
      success: 'bg-green-50 border-green-200 text-green-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    }[this.tone];
  }

  get iconClasses(): string {
    return {
      success: 'text-green-600',
      info: 'text-blue-600',
      warning: 'text-yellow-600',
      error: 'text-red-600'
    }[this.tone];
  }
}
