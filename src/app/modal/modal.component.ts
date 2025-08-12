import { Component, Input, Output, EventEmitter } from '@angular/core';


export interface ModalButton {
  label: string;
  action: () => void;
  class?: string;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black bg-opacity-50"
        (click)="closeOnBackdrop && close()"></div>
        <div class="relative bg-white rounded-lg shadow-lg p-6 m-4 max-w-md w-full">
          @if (showCloseButton) {
            <div class="absolute top-4 right-4">
              <button (click)="close()" class="text-gray-400 hover:text-gray-600">
                <span class="sr-only">Close</span>
                ×
              </button>
            </div>
          }
          @if (title) {
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
            </div>
          }
          @if (message) {
            <div class="mb-6">
              <p class="text-sm text-gray-500">{{ message }}</p>
            </div>
          }
          @if (buttons && buttons.length) {
            <div class="flex justify-end space-x-3">
              @for (button of buttons; track button) {
                <button
                  (click)="button.action()"
                  [class]="button.class || 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'">
                  {{ button.label }}
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
    `
})
export class ModalComponent {
  @Input() title?: string;
  @Input() message?: string;
  @Input() buttons?: ModalButton[];
  @Input() showCloseButton = true;
  @Input() closeOnBackdrop = true;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();

  close() {
    this.isOpen = false;
    this.closed.emit();
  }
}