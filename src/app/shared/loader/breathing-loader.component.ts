import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
import { ThemeService } from '../../services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-breathing-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div 
        class="fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-400 ease-out"
        [class.opacity-100]="showLoader"
        [class.opacity-0]="!showLoader">
        
        <!-- Gradient Backdrop -->
        <div 
          class="absolute inset-0 transition-all duration-700"
          [ngClass]="{
            'bg-gradient-to-br from-white/80 via-gray-50/90 to-orange-50/80': showLoader && !isDark,
            'bg-gradient-to-br from-gray-900/80 via-gray-800/90 to-gray-700/80': showLoader && isDark
          }"
          style="backdrop-filter: blur(2px);"></div>
        
        <!-- Loader -->
        <div 
          class="relative transition-all duration-600 ease-out transform"
          [class.scale-100]="showLoader"
          [class.scale-75]="!showLoader"
          [class.opacity-100]="showLoader"
          [class.opacity-0]="!showLoader">
          
          <!-- Breathing Circles -->
          <div class="relative flex items-center justify-center">
            <!-- Outer ring -->
            <div 
              class="absolute w-24 h-24 border-2 rounded-full breathing-ring transition-colors duration-300"
              [ngClass]="{
                'border-orange-200': !isDark,
                'border-orange-300': isDark
              }"></div>
            
            <!-- Middle ring -->
            <div 
              class="absolute w-16 h-16 border-2 rounded-full breathing-ring transition-colors duration-300" 
              style="animation-delay: -0.5s;"
              [ngClass]="{
                'border-orange-400': !isDark,
                'border-orange-500': isDark
              }"></div>
            
            <!-- Inner circle -->
            <div 
              class="w-8 h-8 rounded-full breathing-circle shadow-lg transition-colors duration-300"
              [ngClass]="{
                'bg-gradient-to-br from-orange-400 to-orange-600': !isDark,
                'bg-gradient-to-br from-orange-500 to-orange-700': isDark
              }"></div>
            
            <!-- Floating particles -->
            <div 
              class="absolute w-2 h-2 rounded-full floating-particle transition-colors duration-300" 
              style="top: 10px; left: 50%; transform: translateX(-50%); animation-delay: 0s;"
              [ngClass]="{
                'bg-orange-300': !isDark,
                'bg-orange-400': isDark
              }"></div>
            <div 
              class="absolute w-1.5 h-1.5 rounded-full floating-particle transition-colors duration-300" 
              style="top: 50%; right: 10px; transform: translateY(-50%); animation-delay: 1s;"
              [ngClass]="{
                'bg-orange-400': !isDark,
                'bg-orange-500': isDark
              }"></div>
            <div 
              class="absolute w-2 h-2 rounded-full floating-particle transition-colors duration-300" 
              style="bottom: 10px; left: 50%; transform: translateX(-50%); animation-delay: 2s;"
              [ngClass]="{
                'bg-orange-300': !isDark,
                'bg-orange-400': isDark
              }"></div>
            <div 
              class="absolute w-1.5 h-1.5 rounded-full floating-particle transition-colors duration-300" 
              style="top: 50%; left: 10px; transform: translateY(-50%); animation-delay: 1.5s;"
              [ngClass]="{
                'bg-orange-400': !isDark,
                'bg-orange-500': isDark
              }"></div>
          </div>
          
          <!-- Text with Typewriter Effect -->
          <div class="mt-8 text-center">
            <div 
              class="font-medium text-sm transition-colors duration-300"
              [ngClass]="{
                'text-gray-700': !isDark,
                'text-gray-300': isDark
              }">
              <span class="typewriter">Loading your content...</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes breathe {
      0%, 100% {
        transform: scale(1);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.1);
        opacity: 1;
      }
    }
    
    @keyframes breathe-circle {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
    }
    
    @keyframes float {
      0%, 100% {
        transform: translate(var(--x, 0), var(--y, 0)) scale(1);
        opacity: 0.7;
      }
      50% {
        transform: translate(var(--x, 0), var(--y, 0)) scale(1.3);
        opacity: 1;
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .breathing-ring {
      animation: breathe 2s ease-in-out infinite;
    }
    
    .breathing-circle {
      animation: breathe-circle 2s ease-in-out infinite;
    }
    
    .floating-particle {
      animation: float 3s ease-in-out infinite;
    }
    
    .typewriter {
      animation: fadeInUp 0.8s ease-out;
    }
    
    /* Custom particles positioning */
    .floating-particle:nth-child(4) { --x: 5px; --y: -3px; }
    .floating-particle:nth-child(5) { --x: -5px; --y: 3px; }
    .floating-particle:nth-child(6) { --x: 3px; --y: 5px; }
    .floating-particle:nth-child(7) { --x: -3px; --y: -5px; }
  `]
})
export class BreathingLoaderComponent implements OnInit, OnDestroy {
  isVisible = false;
  showLoader = false;
  isDark = false;
  private destroy$ = new Subject<void>();

  constructor(
    public loaderService: LoaderService,
    private themeService: ThemeService
  ) {}

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

    this.themeService.isDark$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        this.isDark = isDark;
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
    }, 50);
  }

  private hide() {
    this.showLoader = false;
    setTimeout(() => {
      this.isVisible = false;
    }, 400);
  }
}