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
      .compact-input {
        font-size: 0.78rem !important; /* ~12.5px */
        padding: 6px 8px !important;
      }
      .compact-select { padding: 6px 8px !important; font-size: 0.78rem !important; }
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
      <!-- Mobile: Compact inline filters -->
      <div class="lg:hidden">
        <div class="flex items-center gap-2">
          <input 
            type="text"
            [(ngModel)]="currentFilters.search" 
            (ngModelChange)="onFilterChange()"
            [placeholder]="placeholder"
            [ngClass]="{'flex-1 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-input': compact}">

          <div *ngIf="!hideTypes" class="w-36">
            <select 
              [(ngModel)]="currentFilters.type" 
              (ngModelChange)="onFilterChange()"
              [ngClass]="{'w-full text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-select': compact}">
              <option *ngFor="let option of availableTypeOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div *ngIf="showSortOptions" class="w-36">
            <select 
              [(ngModel)]="currentFilters.order" 
              (ngModelChange)="onSortChange()"
              [ngClass]="{'w-full text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-select': compact}">
              <option *ngFor="let option of sortOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button *ngIf="hasActiveFilters()" (click)="clearFilters()" class="text-xs text-gray-600 hover:text-gray-800 underline">Clear</button>
            <div *ngIf="getActiveFilterCount() > 0" class="text-xs text-blue-600 font-medium">{{ getActiveFilterCount() }} active</div>
          </div>
        </div>
      </div>

      <!-- Desktop: Single-line inline layout -->
      <div class="hidden lg:flex items-center gap-4">
        <input 
          type="text"
          [(ngModel)]="currentFilters.search" 
          (ngModelChange)="onFilterChange()"
          [placeholder]="placeholder"
          [ngClass]="{'flex-1 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-input': compact}">

        <div *ngIf="!hideTypes" class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">{{ typeLabel }}:</label>
          <select 
            [(ngModel)]="currentFilters.type" 
            (ngModelChange)="onFilterChange()"
            [ngClass]="{'text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-select': compact}">
            <option *ngFor="let option of availableTypeOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </div>

        <!-- Status intentionally omitted here; parent can pass availableStatuses to control visibility -->

        <div *ngIf="showSortOptions" class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">Sort:</label>
          <select 
            [(ngModel)]="currentFilters.order" 
            (ngModelChange)="onSortChange()"
            [ngClass]="{'text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none': true, 'compact-select': compact}">
            <option *ngFor="let option of sortOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="ml-auto flex items-center gap-4">
          <button *ngIf="hasActiveFilters()" (click)="clearFilters()" class="text-sm text-gray-600 hover:text-gray-800 underline">Clear Filters</button>
          <div *ngIf="getActiveFilterCount() > 0" class="text-xs text-blue-600 font-medium">{{ getActiveFilterCount() }} active</div>
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
  @Input() compact: boolean = false; // compact mode reduces padding/font sizes for dense layouts
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