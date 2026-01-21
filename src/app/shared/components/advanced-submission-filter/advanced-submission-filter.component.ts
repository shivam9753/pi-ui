import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AdvancedFilterOptions {
  search?: string;
  status?: string;
  type?: string;
  authorType?: string;
  wordLength?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  isTopicSubmission?: boolean;
}

export interface QuickFilterEvent {
  key: string;
  active: boolean;
}

@Component({
  selector: 'app-advanced-submission-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Mobile: Compact filters -->
    <div class="bg-white border border-gray-200 rounded-lg mb-4 lg:hidden">
      <div class="px-4 py-3">
        <div class="flex items-center gap-2 mb-3">
          <button
            *ngFor="let filter of quickFilters"
            (click)="toggleQuickFilter(filter)"
            [class]="getQuickFilterClass(filter)"
            class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors">
            {{ filter.label }}
          </button>
          <button
            *ngIf="hasActiveQuickFilters()"
            (click)="clearQuickFilters()"
            class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 underline">
            Clear All
          </button>
        </div>

        <div class="mb-2">
          <input
            [(ngModel)]="currentFilters.search"
            (ngModelChange)="onFilterChange()"
            type="text"
            placeholder="Search submissions..."
            class="block w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
        </div>

        <div class="flex gap-2">
          <select [(ngModel)]="currentFilters.type" (ngModelChange)="onFilterChange()"
                  class="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option *ngFor="let option of filterOptions.types" [value]="option.value">{{ option.label }}</option>
          </select>

          <select [(ngModel)]="currentSort" (ngModelChange)="onSortChange()"
                  class="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option *ngFor="let option of filterOptions.sortOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Desktop: Single row compact layout -->
    <div class="hidden lg:block mb-4">
      <div class="flex items-center gap-4">
        <div class="flex-1 max-w-md relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            [(ngModel)]="currentFilters.search"
            (ngModelChange)="onFilterChange()"
            type="text"
            placeholder="Search submissions..."
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500">
        </div>

        <div class="flex items-center gap-2">
          <select [(ngModel)]="currentFilters.type" (ngModelChange)="onFilterChange()"
                  class="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[140px]">
            <option *ngFor="let option of filterOptions.types" [value]="option.value">{{ option.label }}</option>
          </select>

          <div class="flex items-center gap-2">
            <button
              *ngFor="let filter of quickFilters"
              (click)="toggleQuickFilter(filter)"
              [class]="getQuickFilterClass(filter)"
              class="px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap">
              {{ filter.label }}
            </button>
          </div>

          <select [(ngModel)]="currentSort" (ngModelChange)="onSortChange()"
                  class="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[140px]">
            <option *ngFor="let option of filterOptions.sortOptions" [value]="option.value">{{ option.label }}</option>
          </select>

          <button *ngIf="hasActiveQuickFilters() || hasActiveFilters()"
                  (click)="clearAllFilters()"
                  class="text-sm text-gray-500 hover:text-gray-700 underline">
            Clear All
          </button>
        </div>
      </div>
    </div>
  `
})
export class AdvancedSubmissionFilterComponent implements OnInit {
  @Input() initialFilters: AdvancedFilterOptions = {};
  @Output() filterChange = new EventEmitter<AdvancedFilterOptions>();
  @Output() quickFilterToggle = new EventEmitter<QuickFilterEvent>();

  showAdvancedFilters = false;
  showMobileAdvancedFilters = false;
  currentFilters: AdvancedFilterOptions = {};
  currentSort = 'createdAt-desc';
  activeQuickFilters: Set<string> = new Set();

  quickFilters = [
    { key: 'resubmitted', label: 'Resubmitted', color: 'blue' }
  ];

  filterOptions = {
    statuses: [
      { label: 'All Statuses', value: '' },
      { label: 'Resubmitted', value: 'resubmitted' }
    ],
    types: [
      { label: 'All Types', value: '' },
      { label: 'Opinion', value: 'opinion' },
      { label: 'Poem', value: 'poem' },
      { label: 'Prose', value: 'prose' },
      { label: 'Article', value: 'article' }
    ],
    authorTypes: [
      { label: 'All Authors', value: '' }
    ],
    sortOptions: [
      { label: 'Newest First', value: 'createdAt-desc' },
      { label: 'Oldest First', value: 'createdAt-asc' }
    ]
  };

  ngOnInit() {
    this.currentFilters = { ...this.initialFilters };
    // Set initial sort value
    if (this.currentFilters.sortBy && this.currentFilters.sortOrder) {
      this.currentSort = `${this.currentFilters.sortBy}-${this.currentFilters.sortOrder}`;
    }
  }


  onFilterChange() {
    this.filterChange.emit({ ...this.currentFilters });
  }

  onSortChange() {
    const [sortBy, sortOrder] = this.currentSort.split('-');
    this.currentFilters.sortBy = sortBy;
    this.currentFilters.sortOrder = sortOrder;
    this.onFilterChange();
  }

  toggleQuickFilter(filter: any) {
    const isActive = this.activeQuickFilters.has(filter.key);
    
    if (isActive) {
      this.activeQuickFilters.delete(filter.key);
    } else {
      this.activeQuickFilters.clear(); // ensure only one quick filter (resubmitted) is active
      this.activeQuickFilters.add(filter.key);
    }
    
    this.quickFilterToggle.emit({
      key: filter.key,
      active: !isActive
    });
  }

  getQuickFilterClass(filter: any): string {
    const isActive = this.activeQuickFilters.has(filter.key);
    const baseClasses = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300';
    
    if (isActive) {
      switch (filter.color) {
        case 'red':
          return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
        case 'blue':
          return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
        case 'purple':
          return 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100';
        case 'green':
          return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100';
        case 'yellow':
          return 'border-yellow-200 bg-yellow-50 text-amber-700 hover:bg-amber-100';
        case 'indigo':
          return 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100';
        default:
          return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
      }
    }
    
    return baseClasses;
  }

  hasActiveQuickFilters(): boolean {
    return this.activeQuickFilters.size > 0;
  }

  hasActiveFilters(): boolean {
    return Object.values(this.currentFilters).some(value => value && value !== '');
  }

  getActiveFilterCount(): number {
    let count = this.activeQuickFilters.size;
    
    // Count form filters
    if (this.currentFilters.search) count++;
    if (this.currentFilters.type) count++;
    return count;
  }

  getAdvancedFilterCount(): number {
    // No advanced filters besides status (kept minimal)
    return this.currentFilters.status ? 1 : 0;
  }

  getMobileAdvancedFilterCount(): number {
    return this.getAdvancedFilterCount();
  }

  clearQuickFilters() {
    this.activeQuickFilters.clear();
    // Emit deactivation for only the resubmitted quick filter
    this.quickFilterToggle.emit({ key: 'resubmitted', active: false });
  }

  clearAllFilters() {
    // Reset filters to minimal defaults
    this.currentFilters = {
      search: '',
      type: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.currentSort = 'createdAt-desc';
    this.activeQuickFilters.clear();
    this.filterChange.emit({ ...this.currentFilters });
    this.quickFilterToggle.emit({ key: 'resubmitted', active: false });
  }
}