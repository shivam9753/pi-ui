// src/app/services/theme.service.ts
import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  public isDark$ = this.isDarkSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Initialize theme from localStorage or default to light
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    
    this.setTheme(isDark);
  }

  toggleTheme(): void {
    const currentTheme = this.isDarkSubject.value;
    this.setTheme(!currentTheme);
  }

  setTheme(isDark: boolean): void {
    const htmlElement = this.document.documentElement;
    
    if (isDark) {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    this.isDarkSubject.next(isDark);
  }

  get isDark(): boolean {
    return this.isDarkSubject.value;
  }
}