import { Component, Input, OnInit, OnDestroy, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemingService } from '../../services/theming.service';
import { Subscription } from 'rxjs';

type AlertType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-simple-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simple-alert.component.html'
})
export class SimpleAlertComponent implements OnInit, OnDestroy, OnChanges {
  @Input() title = '';
  @Input() message?: string;
  @Input() type: AlertType = 'info';
  /** If set to true/false forces dark/light for this component. Null (default) follows global app theme */
  @Input() forceDark: boolean | null = null;

  isDark = false;
  private themeSub?: Subscription;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private themingService: ThemingService
  ) {}

  ngOnInit(): void {
    this.syncDark();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forceDark']) {
      this.syncDark();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }

  /**
   * Return a whitespace-separated class string for the alert container based on type and current theme.
   * We compute classes in TS and bind via [ngClass] in the template so we don't rely on Tailwind's
   * `.dark` parent selector (which wouldn't match if we only set a class on the current host).
   */
  containerClassFor(t: AlertType): string {
    const base = 'p-3 rounded-md';
    if (t === 'info') {
      return this.isDark
        ? base + ' border-[#0b2946] bg-[#071930] text-blue-100'
        : base + ' border border-blue-100 bg-blue-50 text-blue-900';
    }
    if (t === 'success') {
      return this.isDark
        ? base + ' border-[#08321f] bg-[#052014] text-green-100'
        : base + ' border border-green-100 bg-green-50 text-green-900';
    }
    if (t === 'warning') {
      return this.isDark
        ? base + ' border-[#513500] bg-[#2b2100] text-yellow-100'
        : base + ' border border-yellow-100 bg-yellow-50 text-yellow-900';
    }
    if (t === 'error') {
      return this.isDark
        ? base + ' border-[#5a0f0f] bg-[#3a0b0b] text-red-100'
        : base + ' border border-red-100 bg-red-50 text-red-900';
    }
    // default / neutral
    return this.isDark ? base + ' border bg-neutral-700 text-white' : base + ' border bg-neutral-secondary-medium text-heading';
  }

  /** Return classes for the inline icon (size + color) based on type and theme */
  iconClassFor(t: AlertType): string {
    const base = 'flex-shrink-0 w-5 h-5';
    if (t === 'info') return this.isDark ? base + ' text-blue-100' : base + ' text-blue-900';
    if (t === 'success') return this.isDark ? base + ' text-green-100' : base + ' text-green-900';
    if (t === 'warning') return this.isDark ? base + ' text-yellow-100' : base + ' text-yellow-900';
    if (t === 'error') return this.isDark ? base + ' text-red-100' : base + ' text-red-900';
    return this.isDark ? base + ' text-white' : base + ' text-heading';
  }

  private syncDark() {
    // If caller wants to force theme for this component, respect that and don't subscribe
    if (this.forceDark !== null && this.forceDark !== undefined) {
      this.unsubscribe();
      this.isDark = !!this.forceDark;
      this.cdr.markForCheck();
      return;
    }

    // Follow global theme via ThemingService
    this.unsubscribe();
    this.themeSub = this.themingService.isDark$.subscribe((val) => {
      // run inside Angular zone to ensure change detection
      this.ngZone.run(() => {
        this.isDark = val;
        this.cdr.markForCheck();
      });
    });
  }

  private unsubscribe() {
    if (this.themeSub) {
      this.themeSub.unsubscribe();
      this.themeSub = undefined;
    }
  }
}
