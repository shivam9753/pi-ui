import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div
        [@slideIn]="isVisible ? 'in' : 'out'"
        [ngClass]="getContainerClasses()"
        class="fixed z-50 transition-all duration-300 ease-out transform">
        <div [ngClass]="getToastClasses()" [class]="getToastSizeClasses()">
          <div class="flex items-start space-x-3 sm:space-x-4">
            <!-- Icon -->
            <div [ngClass]="getIconClasses()" [class]="getIconSizeClasses()">
              <svg [class]="getSvgSizeClasses()" fill="currentColor" viewBox="0 0 24 24">
                <path [attr.d]="getIconPath()"></path>
              </svg>
            </div>
            <!-- Message Content -->
            <div class="flex-1 min-w-0">
              <p [class]="getMessageClasses()">{{ message }}</p>
              @if (isMobile && details) {
                <p class="text-xs text-gray-600 mt-1">{{ details }}</p>
              }
            </div>
            <!-- Close Button -->
            <button (click)="close()"
              [class]="getCloseButtonClasses()">
              <svg [class]="getCloseSvgClasses()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
    `,
  animations: [
    trigger('slideIn', [
      state('in', style({
        opacity: 1,
        transform: 'translateX(0)'
      })),
      state('out', style({
        opacity: 0,
        transform: 'translateX(100%)'
      })),
      transition('out => in', [
        animate('300ms ease-out')
      ]),
      transition('in => out', [
        animate('200ms ease-in')
      ])
    ])
  ]
})
export class ToastNotificationComponent implements OnInit, OnDestroy, OnChanges {
  @Input() message = '';
  @Input() details = ''; // Additional details for mobile
  @Input() type: 'success' | 'error' | 'info' | 'warning' = 'info';
  @Input() isVisible = false;
  @Input() autoClose = true;
  @Input() duration = 5000;
  @Output() closed = new EventEmitter<void>();

  private autoCloseTimer?: number;
  isMobile = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.checkIfMobile();
    if (this.autoClose && this.isVisible) {
      this.startAutoCloseTimer();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkIfMobile();
  }

  private checkIfMobile() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth < 640; // Tailwind sm breakpoint
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible'] && this.isVisible && this.autoClose) {
      this.startAutoCloseTimer();
    }
  }

  ngOnDestroy() {
    this.clearAutoCloseTimer();
  }

  close() {
    this.isVisible = false;
    this.closed.emit();
    this.clearAutoCloseTimer();
  }

  private startAutoCloseTimer() {
    this.clearAutoCloseTimer();
    this.autoCloseTimer = window.setTimeout(() => {
      this.close();
    }, this.duration);
  }

  private clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  getToastClasses(): string {
    const baseClasses = 'border-l-4';
    switch (this.type) {
      case 'success':
        return `${baseClasses} border-green-400 bg-green-50`;
      case 'error':
        return `${baseClasses} border-red-400 bg-red-50`;
      case 'warning':
        return `${baseClasses} border-yellow-400 bg-yellow-50`;
      case 'info':
      default:
        return `${baseClasses} border-blue-400 bg-blue-50`;
    }
  }

  getIconClasses(): string {
    switch (this.type) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-primary bg-amber-100';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-100';
    }
  }

  getIconPath(): string {
    switch (this.type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z';
      case 'info':
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getContainerClasses(): string {
    if (this.isMobile) {
      return 'top-4 left-4 right-4 max-w-none';
    } else {
      return 'top-6 right-6 max-w-sm w-full';
    }
  }

  getToastSizeClasses(): string {
    const baseClasses = 'bg-white border shadow-xl';
    if (this.isMobile) {
      return `${baseClasses} rounded-lg p-4`;
    } else {
      return `${baseClasses} rounded-2xl p-6`;
    }
  }

  getIconSizeClasses(): string {
    const baseClasses = 'flex-shrink-0 flex items-center justify-center rounded-full';
    if (this.isMobile) {
      return `${baseClasses} w-5 h-5`;
    } else {
      return `${baseClasses} w-6 h-6`;
    }
  }

  getSvgSizeClasses(): string {
    return this.isMobile ? 'w-3 h-3' : 'w-4 h-4';
  }

  getMessageClasses(): string {
    const baseClasses = 'font-medium text-gray-900 leading-5';
    return this.isMobile ? `${baseClasses} text-sm` : `${baseClasses} text-sm`;
  }

  getCloseButtonClasses(): string {
    const baseClasses = 'flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200';
    if (this.isMobile) {
      return `${baseClasses} p-1 -m-1`;
    } else {
      return baseClasses;
    }
  }

  getCloseSvgClasses(): string {
    return this.isMobile ? 'w-4 h-4' : 'w-5 h-5';
  }
}