import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center py-8" [ngClass]="containerClass">
      <!-- Spinner Variants -->
      @if (type === 'spinner') {
        <div class="relative">
          <div class="animate-spin rounded-full border-4 border-gray-200"
            [ngClass]="getSpinnerSizeClass()">
            <div class="border-t-4 border-orange-600 rounded-full"
            [ngClass]="getSpinnerSizeClass()"></div>
          </div>
        </div>
      }
    
      <!-- Dots Variant -->
      @if (type === 'dots') {
        <div class="flex space-x-2">
          <div class="animate-bounce bg-orange-500 rounded-full"
            [ngClass]="getDotSizeClass()"
          style="animation-delay: 0ms;"></div>
          <div class="animate-bounce bg-orange-500 rounded-full"
            [ngClass]="getDotSizeClass()"
          style="animation-delay: 150ms;"></div>
          <div class="animate-bounce bg-orange-500 rounded-full"
            [ngClass]="getDotSizeClass()"
          style="animation-delay: 300ms;"></div>
        </div>
      }
    
      <!-- Pulse Variant -->
      @if (type === 'pulse') {
        <div class="flex flex-col items-center space-y-4">
          <div class="animate-pulse bg-orange-100 rounded-lg" [ngClass]="getPulseSizeClass()"></div>
          <div class="animate-pulse bg-orange-100 rounded-lg" [ngClass]="getPulseSizeClass()"
          style="animation-delay: 200ms; width: 80%;"></div>
          <div class="animate-pulse bg-orange-100 rounded-lg" [ngClass]="getPulseSizeClass()"
          style="animation-delay: 400ms; width: 60%;"></div>
        </div>
      }
    
      <!-- Loading Text -->
      @if (showText) {
        <span class="ml-3 text-gray-600 font-medium" [ngClass]="getTextSizeClass()">
          {{ loadingText }}
        </span>
      }
    </div>
    `
})
export class LoadingStateComponent {
  @Input() type: 'spinner' | 'dots' | 'pulse' = 'spinner';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showText = true;
  @Input() loadingText = 'Loading...';
  @Input() containerClass = '';

  getSpinnerSizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-8 h-8';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  }

  getDotSizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'w-2 h-2';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  }

  getPulseSizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'h-3 w-full';
      case 'md':
        return 'h-4 w-full';
      case 'lg':
        return 'h-6 w-full';
      default:
        return 'h-4 w-full';
    }
  }

  getTextSizeClass(): string {
    switch (this.size) {
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  }
}