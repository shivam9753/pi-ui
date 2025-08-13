import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';
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
            'bg-gradient-to-br from-white/80 via-gray-50/90 to-orange-50/80': showLoader
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
            <div class="absolute w-24 h-24 border-2 border-orange-200 rounded-full breathing-ring"></div>
            
            <!-- Middle ring -->
            <div class="absolute w-16 h-16 border-2 border-orange-400 rounded-full breathing-ring" style="animation-delay: -0.5s;"></div>
            
            <!-- Inner circle -->
            <div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full breathing-circle shadow-lg"></div>
            
            <!-- Floating particles -->
            <div class="absolute w-2 h-2 bg-orange-300 rounded-full floating-particle" style="top: 10px; left: 50%; transform: translateX(-50%); animation-delay: 0s;"></div>
            <div class="absolute w-1.5 h-1.5 bg-orange-400 rounded-full floating-particle" style="top: 50%; right: 10px; transform: translateY(-50%); animation-delay: 1s;"></div>
            <div class="absolute w-2 h-2 bg-orange-300 rounded-full floating-particle" style="bottom: 10px; left: 50%; transform: translateX(-50%); animation-delay: 2s;"></div>
            <div class="absolute w-1.5 h-1.5 bg-orange-400 rounded-full floating-particle" style="top: 50%; left: 10px; transform: translateY(-50%); animation-delay: 1.5s;"></div>
          </div>
          
          <!-- Text with Typewriter Effect -->
          <div class="mt-8 text-center">
            <div class="text-gray-700 font-medium text-sm">
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
    }, 50);
  }

  private hide() {
    this.showLoader = false;
    setTimeout(() => {
      this.isVisible = false;
    }, 400);
  }
}