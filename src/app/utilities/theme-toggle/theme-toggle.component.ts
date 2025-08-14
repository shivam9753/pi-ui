// src/app/components/theme-toggle/theme-toggle.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="toggleTheme()"
      class="relative inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 
             hover:bg-gray-100 dark:hover:bg-gray-800/50 
             focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-gray-100 dark:focus:bg-gray-800/50
             group"
      [attr.aria-label]="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      [attr.title]="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <!-- Sun icon -->
      <svg 
        class="absolute w-4 h-4 text-orange-500 transition-all duration-300 transform"
        [class.opacity-100]="!isDark"
        [class.opacity-0]="isDark"
        [class.scale-100]="!isDark"
        [class.scale-0]="isDark"
        [class.rotate-0]="!isDark"
        [class.rotate-180]="isDark"
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      
      <!-- Moon icon -->
      <svg 
        class="absolute w-4 h-4 text-slate-600 dark:text-slate-300 transition-all duration-300 transform"
        [class.opacity-0]="!isDark"
        [class.opacity-100]="isDark"
        [class.scale-0]="!isDark"
        [class.scale-100]="isDark"
        [class.rotate-180]="!isDark"
        [class.rotate-0]="isDark"
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
      
      <!-- Subtle glow effect on hover -->
      <div class="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-700/20 dark:to-gray-800/20"></div>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    button:active {
      transform: scale(0.95);
    }
    
    @media (max-width: 640px) {
      button {
        width: 2.25rem;
        height: 2.25rem;
      }
      
      svg {
        width: 1rem;
        height: 1rem;
      }
    }
  `]
})
export class ThemeToggleComponent {
  isDark = false;

  constructor(private themeService: ThemeService) {
    // Subscribe to theme changes
    this.themeService.isDark$.subscribe(isDark => {
      this.isDark = isDark;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}