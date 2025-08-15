// theming.service.ts
import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemingService {
  private readonly THEME_KEY = 'app-theme';
  
  // Signal for reactive theme state
  private _theme = signal<ThemeMode>('light');
  
  // BehaviorSubject for compatibility with existing components
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  public isDark$ = this.isDarkSubject.asObservable();
  
  theme() {
    return this._theme();
  }
  
  isLight() {
    return this._theme() === 'light';
  }
  
  isDark() {
    return this._theme() === 'dark';
  }

  // Legacy compatibility getter
  get isDarkMode(): boolean {
    return this._theme() === 'dark';
  }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeTheme();
  }

  private initializeTheme() {
    // Only access localStorage and window in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      // Set default theme for server-side rendering
      this._theme.set('light');
      this.isDarkSubject.next(false);
      return;
    }
    
    // Check localStorage for saved theme, default to light
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode;
    
    // If no saved theme, check system preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.setTheme(savedTheme);
    }
  }

  setTheme(theme: ThemeMode) {
    this._theme.set(theme);
    
    // Only access localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    
    this.applyTheme(theme);
    
    // Update BehaviorSubject for compatibility
    this.isDarkSubject.next(theme === 'dark');
  }

  toggleTheme() {
    const currentTheme = this._theme();
    this.setTheme(currentTheme === 'light' ? 'dark' : 'light');
  }

  private applyTheme(theme: ThemeMode) {
    const root = this.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}