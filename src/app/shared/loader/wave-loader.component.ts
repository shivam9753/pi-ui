import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-wave-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div 
        class="fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ease-in-out"
        [class.opacity-100]="showLoader"
        [class.opacity-0]="!showLoader">
        
        <!-- Subtle Backdrop -->
        <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px]"></div>
        
        <!-- Loader Content -->
        <div 
          class="relative flex flex-col items-center space-y-8 transition-all duration-700 ease-out transform"
          [class.scale-100]="showLoader"
          [class.scale-110]="!showLoader"
          [class.opacity-100]="showLoader"
          [class.opacity-0]="!showLoader">
          
          <!-- Wave Animation -->
          <div class="flex items-end space-x-2">
            <div class="w-3 h-12 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full wave-bar" style="animation-delay: 0ms;"></div>
            <div class="w-3 h-16 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full wave-bar" style="animation-delay: 100ms;"></div>
            <div class="w-3 h-10 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full wave-bar" style="animation-delay: 200ms;"></div>
            <div class="w-3 h-14 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full wave-bar" style="animation-delay: 300ms;"></div>
            <div class="w-3 h-8 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full wave-bar" style="animation-delay: 400ms;"></div>
          </div>
          
          <!-- Minimal Text -->
          <p class="text-gray-600 font-medium tracking-wide text-sm">
            <span class="inline-block animate-pulse">Please wait</span>
          </p>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes wave {
      0%, 40%, 100% {
        transform: scaleY(0.4);
        opacity: 0.7;
      }
      20% {
        transform: scaleY(1);
        opacity: 1;
      }
    }
    
    .wave-bar {
      animation: wave 1.5s ease-in-out infinite;
      transform-origin: bottom;
    }
  `]
})
export class WaveLoaderComponent implements OnInit, OnDestroy {
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
    setTimeout(() => {
      this.showLoader = true;
    }, 10);
  }

  private hide() {
    this.showLoader = false;
    setTimeout(() => {
      this.isVisible = false;
    }, 500);
  }
}