import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center py-12">
      <!-- Icon -->
      <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full"
        [ngClass]="getIconBgClass()">
        <svg class="h-6 w-6" [ngClass]="getIconTextClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getIconPath()"></path>
        </svg>
      </div>
    
      <!-- Title -->
      <h3 class="mt-4 text-lg font-medium text-gray-900">{{ title }}</h3>
    
      <!-- Message -->
      <p class="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{{ message }}</p>
    
      <!-- Action Button -->
      @if (actionText) {
        <div class="mt-6">
          <button (click)="onAction?.()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
            {{ actionText }}
          </button>
        </div>
      }
    </div>
    `
})
export class EmptyStateComponent {
  @Input() title = 'No items found';
  @Input() message = 'Get started by creating a new item.';
  @Input() actionText?: string;
  @Input() icon: 'document' | 'folder' | 'heart' | 'star' | 'user' | 'pencil' = 'document';
  @Input() onAction?: () => void;

  getIconPath(): string {
    switch (this.icon) {
      case 'document':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'folder':
        return 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z';
      case 'heart':
        return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
      case 'star':
        return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
      case 'user':
        return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
      case 'pencil':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }

  getIconBgClass(): string {
    switch (this.icon) {
      case 'document':
        return 'bg-gray-100';
      case 'folder':
        return 'bg-blue-100';
      case 'heart':
        return 'bg-red-100';
      case 'star':
        return 'bg-yellow-100';
      case 'user':
        return 'bg-purple-100';
      case 'pencil':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  }

  getIconTextClass(): string {
    switch (this.icon) {
      case 'document':
        return 'text-gray-600';
      case 'folder':
        return 'text-blue-600';
      case 'heart':
        return 'text-red-600';
      case 'star':
        return 'text-yellow-600';
      case 'user':
        return 'text-purple-600';
      case 'pencil':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }
}