import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

export interface AdvancedFilterOptions {
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface QuickFilterEvent {
  key: string;
  active: boolean;
}

@Component({
  selector: 'app-advanced-submission-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Search -->
      <mat-form-field appearance="outline" class="flex-1 min-w-[180px]" subscriptSizing="dynamic">
        <input matInput [(ngModel)]="currentFilters.search" (ngModelChange)="onFilterChange()" placeholder="Search submissions...">
      </mat-form-field>

      <!-- Type -->
      <mat-form-field appearance="outline" class="min-w-[140px]" subscriptSizing="dynamic">
        <mat-select [(ngModel)]="currentFilters.type" (ngModelChange)="onFilterChange()" placeholder="All Types">
          <mat-option *ngFor="let option of filterOptions.types" [value]="option.value">{{ option.label }}</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Sort -->
      <mat-form-field appearance="outline" class="min-w-[140px]" subscriptSizing="dynamic">
        <mat-select [(ngModel)]="currentSort" (ngModelChange)="onSortChange()" placeholder="Newest First">
          <mat-option *ngFor="let option of filterOptions.sortOptions" [value]="option.value">{{ option.label }}</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Quick filters -->
      <button
        *ngFor="let filter of quickFilters"
        (click)="toggleQuickFilter(filter)"
        mat-stroked-button
        [color]="activeQuickFilters.has(filter.key) ? 'primary' : undefined"
        class="!text-xs !rounded-full whitespace-nowrap">
        {{ filter.label }}
      </button>

      <!-- Clear All -->
      <button *ngIf="hasActiveQuickFilters() || hasActiveFilters()"
              mat-button
              (click)="clearAllFilters()"
              class="!text-sm !text-gray-500">
        Clear All
      </button>
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