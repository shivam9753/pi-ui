import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border-b border-gray-200 bg-white shadow-sm">
      <nav class="flex justify-center space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide px-4">
        <ng-content></ng-content>
      </nav>
    </div>
  `,
  styles: [`
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class TabsComponent {
  @Input() activeTab: string = '';
  @Output() activeTabChange = new EventEmitter<string>();
  @Output() tabChange = new EventEmitter<string>();

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.activeTabChange.emit(tabId); // For two-way binding [(activeTab)]
    this.tabChange.emit(tabId); // For custom event handling
  }

  isActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }
}
