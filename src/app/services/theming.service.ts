// theme.service.ts
import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  
  // Signal for reactive theme state
  private _theme = signal<ThemeMode>('light');
  
  theme() {
    return this._theme();
  }
  
  isLight() {
    return this._theme() === 'light';
  }
  
  isDark() {
    return this._theme() === 'dark';
  }

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme() {
    // Always use light theme - no user preference or system detection
    this.setTheme('light');
  }

  setTheme(theme: ThemeMode) {
    this._theme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme() {
    // Theme switching disabled - always stay in light mode
    this.setTheme('light');
  }

  private applyTheme(theme: ThemeMode) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}