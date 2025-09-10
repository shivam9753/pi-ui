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
    <!-- Mobile: Always Visible Filters -->
    <div class="bg-white border border-gray-200 rounded-lg mb-4 lg:hidden">
      
      <!-- Mobile: Always Visible - Quick Filter Chips -->
      <div class="px-4 py-3 border-b border-gray-100">
        <div class="flex flex-wrap gap-2">
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
      </div>

      <!-- Mobile: Always Visible - Search Bar (Full Width) -->
      <div class="px-4 py-2 border-b border-gray-100">
        <input
          [(ngModel)]="currentFilters.search"
          (ngModelChange)="onFilterChange()"
          type="text"
          placeholder="Search..."
          style="-webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-image: none !important; box-shadow: none !important; -webkit-box-shadow: none !important;"
          class="block w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
      </div>

      <!-- Mobile: Always Visible - Type and Sort Row -->
      <div class="px-4 py-2 border-b border-gray-100">
        <div class="flex gap-2">
          <!-- Type Field (50% width) -->
          <div class="flex-1">
            <select [(ngModel)]="currentFilters.type" (ngModelChange)="onFilterChange()"
                    style="-webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-image: none !important; box-shadow: none !important; -webkit-box-shadow: none !important;"
                    class="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of filterOptions.types" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <!-- Sort Field (50% width) -->
          <div class="flex-1">
            <select [(ngModel)]="currentSort" (ngModelChange)="onSortChange()"
                    style="-webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; background-image: none !important; box-shadow: none !important; -webkit-box-shadow: none !important;"
                    class="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of filterOptions.sortOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Mobile: Collapsible Advanced Filters -->
      <div class="px-4 py-3 border-t border-gray-100">
        <button 
          (click)="showMobileAdvancedFilters = !showMobileAdvancedFilters"
          class="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          <span>More Filters</span>
          <div class="flex items-center gap-1">
            <span *ngIf="getMobileAdvancedFilterCount() > 0" 
                  class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full mr-2">
              {{ getMobileAdvancedFilterCount() }}
            </span>
            <svg class="w-4 h-4 transition-transform" 
                 [class.rotate-180]="showMobileAdvancedFilters"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </button>

        <!-- Collapsible Advanced Filter Content -->
        <div *ngIf="showMobileAdvancedFilters" class="mt-3 space-y-3 max-h-60 overflow-y-auto">
          <!-- Status -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select [(ngModel)]="currentFilters.status" (ngModelChange)="onFilterChange()"
                    class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of filterOptions.statuses" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Author Type -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Author</label>
            <select [(ngModel)]="currentFilters.authorType" (ngModelChange)="onFilterChange()"
                    class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of filterOptions.authorTypes" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Active Filter Count -->
          <div *ngIf="getActiveFilterCount() > 0" class="mt-3 mb-4">
            <span class="text-xs text-blue-600 font-medium">
              {{ getActiveFilterCount() }} filter{{ getActiveFilterCount() > 1 ? 's' : '' }} active
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop: Clean Single Row Layout (No Container) -->
    <div class="hidden lg:block mb-4">
      <!-- Main Row: Search + Quick Filters + Advanced Filters Dropdown -->
      <div class="flex items-center gap-4">
        <!-- Search Bar -->
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
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
        </div>

        <!-- Type Dropdown -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Type:</label>
          <select [(ngModel)]="currentFilters.type" (ngModelChange)="onFilterChange()"
                  class="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white relative z-10 min-w-[120px]">
            <option *ngFor="let option of filterOptions.types" [value]="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Quick Filter Chips -->
        <div class="flex items-center gap-2">
          <button
            *ngFor="let filter of quickFilters"
            (click)="toggleQuickFilter(filter)"
            [class]="getQuickFilterClass(filter)"
            class="px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap">
            {{ filter.label }}
          </button>
        </div>

        <!-- Sort Dropdown -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</label>
          <select [(ngModel)]="currentSort" (ngModelChange)="onSortChange()"
                  class="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white relative z-10 min-w-[140px]">
            <option *ngFor="let option of filterOptions.sortOptions" [value]="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- More Filters Dropdown -->
        <div class="relative">
          <button
            (click)="showAdvancedFilters = !showAdvancedFilters"
            class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            More Filters
            <svg class="w-4 h-4 transition-transform" 
                 [class.rotate-180]="showAdvancedFilters"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <span *ngIf="getAdvancedFilterCount() > 0" 
                  class="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
              {{ getAdvancedFilterCount() }}
            </span>
          </button>

          <!-- Dropdown Panel -->
          <div *ngIf="showAdvancedFilters" 
               class="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div class="p-4 space-y-4">
              <!-- Status -->
              <div class="flex items-center gap-3">
                <label class="text-sm font-medium text-gray-700 w-16">Status:</label>
                <select [(ngModel)]="currentFilters.status" (ngModelChange)="onFilterChange()"
                        class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option *ngFor="let option of filterOptions.statuses" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <!-- Author Type -->
              <div class="flex items-center gap-3">
                <label class="text-sm font-medium text-gray-700 w-16">Author:</label>
                <select [(ngModel)]="currentFilters.authorType" (ngModelChange)="onFilterChange()"
                        class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option *ngFor="let option of filterOptions.authorTypes" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <!-- Clear All Filters -->
              <div class="pt-3 border-t border-gray-200">
                <button
                  (click)="clearAllFilters()"
                  class="text-sm text-gray-600 hover:text-gray-800 underline">
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Clear Quick Filters -->
        <button
          *ngIf="hasActiveQuickFilters()"
          (click)="clearQuickFilters()"
          class="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap">
          Clear All
        </button>
      </div>

      <!-- Active Filter Count -->
      <div *ngIf="getActiveFilterCount() > 0" class="mt-2">
        <span class="text-xs text-blue-600 font-medium">
          {{ getActiveFilterCount() }} filter{{ getActiveFilterCount() > 1 ? 's' : '' }} active
        </span>
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
    { key: 'urgent', label: 'Urgent', color: 'red' },
    { key: 'newAuthors', label: 'New Authors', color: 'green' },
    { key: 'quickRead', label: 'Quick Read', color: 'yellow' }
  ];

  filterOptions = {
    statuses: [
      { label: 'All Statuses', value: '' },
      { label: 'Pending Review', value: 'pending_review' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Needs Revision', value: 'needs_revision' },
      { label: 'Resubmitted', value: 'resubmitted' }
    ],
    types: [
      { label: 'All Types', value: '' },
      { label: 'Opinion', value: 'opinion' },
      { label: 'Poem', value: 'poem' },
      { label: 'Prose', value: 'prose' },
      { label: 'Article', value: 'article' },
      { label: 'Book Review', value: 'book_review' },
      { label: 'Cinema Essay', value: 'cinema_essay' }
    ],
    authorTypes: [
      { label: 'All Authors', value: '' },
      { label: 'New Authors', value: 'new' },
      { label: 'Returning Authors', value: 'returning' }
    ],
    sortOptions: [
      { label: 'Newest First', value: 'createdAt-desc' },
      { label: 'Oldest First', value: 'createdAt-asc' },
      { label: 'Title A-Z', value: 'title-asc' },
      { label: 'Title Z-A', value: 'title-desc' }
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
    if (this.currentFilters.status) count++;
    if (this.currentFilters.type) count++;
    if (this.currentFilters.authorType) count++;
    
    return count;
  }

  getAdvancedFilterCount(): number {
    let count = 0;
    
    // Count only dropdown filters in the "More Filters" section (not search, type, sort, or quick filters)
    if (this.currentFilters.status) count++;
    if (this.currentFilters.authorType) count++;
    
    return count;
  }

  getMobileAdvancedFilterCount(): number {
    // Same as getAdvancedFilterCount but for mobile More Filters section
    return this.getAdvancedFilterCount();
  }

  clearQuickFilters() {
    this.activeQuickFilters.clear();
    
    // Emit deactivation for all quick filters
    this.quickFilters.forEach(filter => {
      this.quickFilterToggle.emit({
        key: filter.key,
        active: false
      });
    });
  }

  clearAllFilters() {
    this.currentFilters = {};
    this.currentSort = 'createdAt-desc';
    this.showAdvancedFilters = false;
    this.showMobileAdvancedFilters = false;
    this.clearQuickFilters();
    this.onFilterChange();
  }
}