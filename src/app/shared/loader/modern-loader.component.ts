import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-modern-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div 
        class="fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ease-out"
        [class.opacity-100]="showLoader"
        [class.opacity-0]="!showLoader"
        [class.backdrop-blur-sm]="showLoader"
        style="background-color: rgba(255, 255, 255, 0.8);">
        
        <div 
          class="flex flex-col items-center space-y-6 p-8 rounded-2xl bg-white/90 shadow-2xl border border-white/20 transition-all duration-500 ease-out transform"
          [class.scale-100]="showLoader"
          [class.scale-95]="!showLoader"
          [class.translate-y-0]="showLoader"
          [class.translate-y-4]="!showLoader">
          
          <!-- Modern Spinning Ring -->
          <div class="relative">
            <div class="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div class="absolute top-0 left-0 w-16 h-16 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
            <div class="absolute top-2 left-2 w-12 h-12 border-2 border-orange-300 rounded-full border-r-transparent animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
          </div>
          
          <!-- Loading Text with Pulse -->
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">Loading</h3>
            <div class="flex items-center justify-center space-x-1">
              <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style="animation-delay: 0ms;"></span>
              <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style="animation-delay: 200ms;"></span>
              <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style="animation-delay: 400ms;"></span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .animate-slide-in {
      animation: slideInScale 0.3s ease-out;
    }
  `]
})
export class ModernLoaderComponent implements OnInit, OnDestroy {
  isVisible = false;
  showLoader = false;
  private destroy$ = new Subject<void>();

  constructor(public loaderService: LoaderService) {}

  ngOnInit() {
    this.loaderService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        if (loading) {
          this.show();
        } else {
          this.hide();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private show() {
    this.isVisible = true;
    // Small delay to ensure DOM is updated before animation
    setTimeout(() => {
      this.showLoader = true;
    }, 10);
  }

  private hide() {
    this.showLoader = false;
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      this.isVisible = false;
    }, 300);
  }
}