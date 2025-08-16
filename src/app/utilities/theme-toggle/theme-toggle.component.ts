// src/app/components/theme-toggle/theme-toggle.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemingService } from '../../services/theming.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="toggleTheme()"
      class="flex items-center gap-1.5 px-2 py-1 text-sm text-themed-secondary hover:text-themed transition-colors duration-200 rounded"
      [attr.aria-label]="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <!-- Sun icon for light mode -->
      <svg 
        *ngIf="!isDark"
        class="w-4 h-4 text-orange-500" 
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
      
      <!-- Moon icon for dark mode -->
      <svg 
        *ngIf="isDark"
        class="w-4 h-4 text-slate-400" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
      
      <span>{{ isDark ? 'Dark' : 'Light' }}</span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ThemeToggleComponent {
  isDark = false;

  constructor(private themeService: ThemingService) {
    // Subscribe to theme changes
    this.themeService.isDark$.subscribe((isDark: boolean) => {
      this.isDark = isDark;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}