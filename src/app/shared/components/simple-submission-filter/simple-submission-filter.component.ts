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
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        
        <div class="flex gap-3 overflow-x-auto pb-1">
          <!-- Type Filter -->
          <div *ngIf="!hideTypes" class="flex-shrink-0">
            <select 
              [(ngModel)]="currentFilters.type" 
              (ngModelChange)="onFilterChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of availableTypeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <!-- Status Filter (if status options available) -->
          <div *ngIf="availableStatusOptions.length > 1" class="flex-shrink-0">
            <select 
              [(ngModel)]="currentFilters.status" 
              (ngModelChange)="onFilterChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of availableStatusOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Sort Filter -->
          <div *ngIf="showSortOptions" class="flex-shrink-0">
            <select 
              [(ngModel)]="currentFilters.order" 
              (ngModelChange)="onSortChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let option of sortOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Clear Button -->
          <div *ngIf="hasActiveFilters()" class="flex-shrink-0">
            <button 
              (click)="clearFilters()"
              class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap">
              Clear
            </button>
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
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Type Filter -->
          <div *ngIf="!hideTypes" class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">{{ typeLabel }}:</label>
            <select 
              [(ngModel)]="currentFilters.type" 
              (ngModelChange)="onFilterChange()"
              class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
              class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
              class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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