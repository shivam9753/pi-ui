import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SimpleFilterOptions {
  type?: string;
  status?: string;
  featured?: boolean;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

@Component({
  selector: 'app-simple-submission-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <style>
      input, select {
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        background: white !important;
        border-radius: 6px !important;
      }
      select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") !important;
        background-position: right 0.5rem center !important;
        background-repeat: no-repeat !important;
        background-size: 1.5em 1.5em !important;
        padding-right: 2.5rem !important;
      }
    </style>
    <div class="bg-gray-50 border border-gray-200 rounded-lg mb-4 p-3">
      <!-- Mobile: Horizontal scroll for filters -->
      <div class="lg:hidden">
        <!-- Search Input -->
        <div class="mb-3">
          <input 
            type="text"
            [(ngModel)]="currentFilters.search" 
            (ngModelChange)="onFilterChange()"
[placeholder]="placeholder"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
        </div>
        
        <!-- Mobile: Stacked vertical layout for better space usage -->
        <div class="space-y-3">
          <div class="flex gap-2">
            <!-- Type Filter -->
            <div *ngIf="!hideTypes" class="flex-1">
              <select 
                [(ngModel)]="currentFilters.type" 
                (ngModelChange)="onFilterChange()"
                class="w-full text-xs border border-gray-300 rounded-md px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
                <option *ngFor="let option of availableTypeOptions" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <!-- Status Filter (if status options available) -->
            <div *ngIf="availableStatusOptions.length > 1" class="flex-1">
              <select 
                [(ngModel)]="currentFilters.status" 
                (ngModelChange)="onFilterChange()"
                class="w-full text-xs border border-gray-300 rounded-md px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
                <option *ngFor="let option of availableStatusOptions" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex gap-2 items-center">
            <!-- Sort Filter -->
            <div *ngIf="showSortOptions" class="flex-1">
              <select 
                [(ngModel)]="currentFilters.order" 
                (ngModelChange)="onSortChange()"
                class="w-full text-xs border border-gray-300 rounded-md px-2 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
                <option *ngFor="let option of sortOptions" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Clear Button -->
            <div *ngIf="hasActiveFilters()" class="flex-shrink-0">
              <button 
                (click)="clearFilters()"
                class="px-2 py-2 text-xs text-gray-600 hover:text-gray-800 underline whitespace-nowrap bg-gray-50 rounded border">
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop: Inline layout -->
      <div class="hidden lg:block">
        <!-- Search Input -->
        <div class="mb-3">
          <input 
            type="text"
            [(ngModel)]="currentFilters.search" 
            (ngModelChange)="onFilterChange()"
[placeholder]="placeholder"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Type Filter -->
          <div *ngIf="!hideTypes" class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">{{ typeLabel }}:</label>
            <select 
              [(ngModel)]="currentFilters.type" 
              (ngModelChange)="onFilterChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
              <option *ngFor="let option of availableTypeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Status Filter (if status options available) -->
          <div *ngIf="availableStatusOptions.length > 1" class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">{{ statusLabel }}:</label>
            <select 
              [(ngModel)]="currentFilters.status" 
              (ngModelChange)="onFilterChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
              <option *ngFor="let option of availableStatusOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Sort Filter -->
          <div *ngIf="showSortOptions" class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">Sort:</label>
            <select 
              [(ngModel)]="currentFilters.order" 
              (ngModelChange)="onSortChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
              <option *ngFor="let option of sortOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Clear Filters -->
          <button
            *ngIf="hasActiveFilters()"
            (click)="clearFilters()"
            class="text-sm text-gray-600 hover:text-gray-800 underline">
            Clear Filters
          </button>

          <!-- Active Filter Count -->
          <div *ngIf="getActiveFilterCount() > 0" class="text-xs text-blue-600 font-medium">
            {{ getActiveFilterCount() }} filter{{ getActiveFilterCount() > 1 ? 's' : '' }} active
          </div>
        </div>
      </div>
    </div>
  `
})
export class SimpleSubmissionFilterComponent implements OnInit {
  @Input() availableStatuses: string[] = [];
  @Input() availableTypes: string[] = ['opinion', 'poem', 'prose', 'article', 'book_review', 'cinema_essay'];
  @Input() initialFilters: SimpleFilterOptions = {};
  @Input() showSortOptions: boolean = false;
  @Input() sortField: string = 'publishedAt';
  @Input() statusLabel: string = 'Status'; // Allow customization of status field label
  @Input() typeLabel: string = 'Type'; // Allow customization of type field label
  @Input() hideTypes: boolean = false; // Option to hide type filter
  @Input() placeholder: string = 'Search submissions...'; // Customizable search placeholder
  @Output() filterChange = new EventEmitter<SimpleFilterOptions>();

  currentFilters: SimpleFilterOptions = {};

  typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'opinion', label: 'Opinion' },
    { value: 'poem', label: 'Poem' },
    { value: 'prose', label: 'Prose' },
    { value: 'article', label: 'Article' },
    { value: 'book_review', label: 'Book Review' },
    { value: 'cinema_essay', label: 'Cinema Essay' }
  ];

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'needs_revision', label: 'Needs Revision' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'published', label: 'Published' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'draft', label: 'Draft' },
    // User roles
    { value: 'user', label: 'User' },
    { value: 'writer', label: 'Writer' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'admin', label: 'Admin' }
  ];

  sortOptions = [
    { value: 'desc', label: 'Newest First' },
    { value: 'asc', label: 'Oldest First' }
  ];

  ngOnInit() {
    this.currentFilters = { ...this.initialFilters };
    // Set default sort if showSortOptions is true and no sort is set
    if (this.showSortOptions && !this.currentFilters.order) {
      this.currentFilters.sortBy = this.sortField;
      this.currentFilters.order = 'desc';
    }
  }

  get availableTypeOptions() {
    return this.typeOptions.filter(option => 
      !option.value || this.availableTypes.includes(option.value)
    );
  }

  get availableStatusOptions() {
    if (this.availableStatuses.length === 0) {
      return [{ value: '', label: 'All Statuses' }];
    }
    
    return this.statusOptions.filter(option => 
      !option.value || this.availableStatuses.includes(option.value)
    );
  }

  onFilterChange() {
    this.filterChange.emit({ ...this.currentFilters });
  }

  clearFilters() {
    const preserveSorting = this.showSortOptions;
    const currentSort = preserveSorting ? {
      sortBy: this.currentFilters.sortBy,
      order: this.currentFilters.order
    } : {};
    
    this.currentFilters = { ...currentSort };
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    const filtersToCheck = { ...this.currentFilters };
    // Don't consider sort options as "active filters" for clear button display
    delete filtersToCheck.sortBy;
    delete filtersToCheck.order;
    return Object.values(filtersToCheck).some(value => value && value !== '');
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.currentFilters.type) count++;
    if (this.currentFilters.status) count++;
    if (this.currentFilters.search && this.currentFilters.search.trim()) count++;
    // Don't count sort as an "active filter" for the display
    return count;
  }

  onSortChange() {
    this.currentFilters.sortBy = this.sortField;
    this.onFilterChange();
  }
}