import { Component, Input, Host, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsComponent } from '../tabs/tabs.component';

@Component({
  selector: 'app-tab-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="onClick()"
      [disabled]="disabled"
      [class.border-primary]="isActive"
      [class.text-primary]="isActive"
      [class.border-transparent]="!isActive"
      [class.text-gray-600]="!isActive && !disabled"
      [class.text-gray-400]="disabled"
      [class.cursor-not-allowed]="disabled"
      class="inline-flex items-center justify-center py-3 px-3 sm:py-4 sm:px-6 border-b-2 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 gap-1 sm:gap-2 min-w-max whitespace-nowrap hover:text-primary hover:border-primary"
      [class.hover:text-primary]="!disabled && !isActive"
      [class.hover:border-primary]="!disabled && !isActive">
      <ng-content select="[icon]"></ng-content>
      <span>{{ label }}</span>
      <!-- allow additional projected content (e.g. a small count chip) -->
      <ng-content></ng-content>
    </button>
  `,
  styles: []
})
export class TabItemComponent {
  @Input() tabId: string = '';
  @Input() label: string = '';
  @Input() disabled: boolean = false;

  constructor(
    @Host() @Optional() private tabs: TabsComponent
  ) {}

  get isActive(): boolean {
    return this.tabs ? this.tabs.isActive(this.tabId) : false;
  }

  onClick(): void {
    if (!this.disabled && this.tabs) {
      this.tabs.setActiveTab(this.tabId);
    }
  }
}
