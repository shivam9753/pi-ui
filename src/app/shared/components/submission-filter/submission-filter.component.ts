import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterOptions {
  status?: string;
  type?: string;
}

@Component({
  selector: 'app-submission-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-wrap gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
      <!-- Status Filter -->
      <div class="flex items-center gap-2">
        <label for="status-filter" class="text-sm font-medium text-gray-700">Status:</label>
        <select 
          id="status-filter"
          [(ngModel)]="selectedStatus" 
          (ngModelChange)="onFilterChange()"
          class="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option *ngFor="let status of filteredStatusOptions" [value]="status.value">
            {{ status.label }}
          </option>
        </select>
      </div>

      <!-- Type Filter -->
      <div class="flex items-center gap-2">
        <label for="type-filter" class="text-sm font-medium text-gray-700">Type:</label>
        <select 
          id="type-filter"
          [(ngModel)]="selectedType" 
          (ngModelChange)="onFilterChange()"
          class="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option *ngFor="let type of filteredTypeOptions" [value]="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>

      <!-- Clear Filters -->
      <button 
        *ngIf="selectedStatus || selectedType"
        (click)="clearFilters()"
        class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline"
      >
        Clear Filters
      </button>

      <!-- Active Filter Count -->
      <div *ngIf="getActiveFilterCount() > 0" class="flex items-center">
        <span class="text-sm text-blue-600 font-medium">
          {{ getActiveFilterCount() }} filter{{ getActiveFilterCount() > 1 ? 's' : '' }} active
        </span>
      </div>
    </div>
  `
})
export class SubmissionFilterComponent {
  @Input() availableStatuses: string[] = ['pending_review', 'in_progress', 'needs_revision', 'accepted', 'published', 'rejected'];
  @Input() availableTypes: string[] = ['opinion', 'poem', 'prose', 'article', 'book_review', 'cinema_essay'];
  @Output() filterChange = new EventEmitter<FilterOptions>();

  selectedStatus = '';
  selectedType = '';

  statusOptions = [
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'needs_revision', label: 'Needs Revision' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'published', label: 'Published' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'draft', label: 'Draft' }
  ];

  typeOptions = [
    { value: 'opinion', label: 'Opinion' },
    { value: 'poem', label: 'Poem' },
    { value: 'prose', label: 'Prose' },
    { value: 'article', label: 'Article' },
    { value: 'book_review', label: 'Book Review' },
    { value: 'cinema_essay', label: 'Cinema Essay' }
  ];

  onFilterChange() {
    const filters: FilterOptions = {};
    
    if (this.selectedStatus) {
      filters.status = this.selectedStatus;
    }
    
    if (this.selectedType) {
      filters.type = this.selectedType;
    }
    
    this.filterChange.emit(filters);
  }

  clearFilters() {
    this.selectedStatus = '';
    this.selectedType = '';
    this.filterChange.emit({});
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.selectedStatus) count++;
    if (this.selectedType) count++;
    return count;
  }

  get filteredStatusOptions() {
    return this.statusOptions.filter(option => 
      this.availableStatuses.includes(option.value)
    );
  }

  get filteredTypeOptions() {
    return this.typeOptions.filter(option => 
      this.availableTypes.includes(option.value)
    );
  }
}