import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loaderService.loading$ | async) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center">
        <div class="flex flex-col items-center space-y-4">
          <!-- Three Bouncing Dots -->
          <div class="flex space-x-3">
            <div class="w-5 h-5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
            <div class="w-5 h-5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
            <div class="w-5 h-5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
          </div>
          <span class="text-gray-700 font-medium text-sm">Loading...</span>
        </div>
      </div>
    }
    `,
  styles: []
})
export class LoaderComponent {
  constructor(public loaderService: LoaderService) {}
}