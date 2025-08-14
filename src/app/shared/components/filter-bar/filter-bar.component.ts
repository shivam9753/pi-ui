import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: any;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date-range' | 'multi-select';
  options?: FilterOption[];
  placeholder?: string;
}

export interface QuickFilterConfig {
  key: string;
  label: string;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}

export interface FilterState {
  [key: string]: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Main Filter Controls - Apple Style Clean Design -->
    <div class="flex flex-wrap gap-2 sm:gap-3 items-center mb-4">
      <!-- Dynamic Filter Controls -->
      @for (config of filterConfigs; track config) {
        <div class="relative flex-shrink-0">
          <!-- Select Filter -->
          @if (config.type === 'select') {
            <div class="relative">
              <div class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:border-gray-400 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all duration-150 min-w-0">
                <span class="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:block">{{ config.label }}</span>
                <select [(ngModel)]="filters[config.key]"
                  (ngModelChange)="onFilterChange()"
                  class="bg-transparent border-none outline-none text-xs sm:text-sm text-gray-900 cursor-pointer pr-4 sm:pr-6 appearance-none min-w-0 flex-1">
                  @for (option of config.options; track option) {
                    <option [value]="option.value">
                      {{ option.label }}
                    </option>
                  }
                </select>
                <svg class="w-4 h-4 text-gray-400 pointer-events-none absolute right-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          }
          <!-- Search Filter -->
          @if (config.type === 'search') {
            <div class="relative min-w-[120px] sm:min-w-[200px] flex-1 sm:flex-initial">
              <div class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:border-gray-400 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all duration-150">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input type="text"
                  [(ngModel)]="filters[config.key]"
                  (ngModelChange)="onSearchChange()"
                  [placeholder]="config.placeholder || 'Search...'"
                  class="bg-transparent border-none outline-none text-xs sm:text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-0">
              </div>
            </div>
          }
          <!-- Date Range Filter -->
          @if (config.type === 'date-range') {
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:border-gray-400 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all duration-150">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-sm font-medium text-gray-700">From</span>
                <input type="date"
                  [(ngModel)]="filters[config.key + '_from']"
                  (ngModelChange)="onFilterChange()"
                  class="bg-transparent border-none outline-none text-sm text-gray-900">
              </div>
              <span class="text-gray-500 text-sm">to</span>
              <div class="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:border-gray-400 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all duration-150">
                <input type="date"
                  [(ngModel)]="filters[config.key + '_to']"
                  (ngModelChange)="onFilterChange()"
                  class="bg-transparent border-none outline-none text-sm text-gray-900">
              </div>
            </div>
          }
        </div>
      }
    
      <!-- Clear All Button -->
      <button (click)="clearAllFilters()"
        class="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors duration-150">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        <span>Clear All</span>
      </button>
    </div>
    
    <!-- Quick Filters -->
    @if (quickFilters && quickFilters.length > 0) {
      <div class="mb-4">
        <div class="text-sm font-medium text-gray-700 mb-2">Quick Filters:</div>
        <div class="flex flex-wrap gap-2">
          @for (quickFilter of quickFilters; track quickFilter) {
            <button
              (click)="toggleQuickFilter(quickFilter.key)"
              [ngClass]="getQuickFilterClasses(quickFilter)"
              class="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border transition-colors duration-200">
              <span>{{ quickFilter.label }}</span>
            </button>
          }
        </div>
      </div>
    }
    `,
  styles: [`
    /* Custom styles to prevent input distortions */
    input[type="date"]::-webkit-calendar-picker-indicator {
      opacity: 0.6;
    }
    
    select {
      appearance: none;
      background-image: none;
    }
    
    .min-w-0 {
      min-width: 0;
    }
  `]
})
export class FilterBarComponent implements OnInit {
  @Input() filterConfigs: FilterConfig[] = [];
  @Input() quickFilters: QuickFilterConfig[] = [];
  @Input() initialFilters: FilterState = {};
  @Input() showApplyButton = true;
  @Input() debounceTime = 500;
  
  @Output() filtersChange = new EventEmitter<FilterState>();
  @Output() search = new EventEmitter<string>();
  @Output() quickFilterToggle = new EventEmitter<{key: string, active: boolean}>();

  filters: FilterState = {};
  activeQuickFilters: string[] = [];
  private searchTimeout: any;

  ngOnInit() {
    this.filters = { ...this.initialFilters };
  }

  onFilterChange() {
    this.filtersChange.emit({ ...this.filters });
  }

  onSearchChange() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      const searchKey = this.filterConfigs.find(c => c.type === 'search')?.key;
      if (searchKey) {
        this.search.emit(this.filters[searchKey] || '');
      }
      this.onFilterChange();
    }, this.debounceTime);
  }

  clearAllFilters() {
    this.filters = {};
    this.activeQuickFilters = [];
    this.onFilterChange();
  }

  toggleQuickFilter(key: string) {
    const isActive = this.activeQuickFilters.includes(key);
    
    if (isActive) {
      this.activeQuickFilters = this.activeQuickFilters.filter(f => f !== key);
    } else {
      this.activeQuickFilters.push(key);
    }
    
    this.quickFilterToggle.emit({ key, active: !isActive });
  }

  getQuickFilterClasses(quickFilter: QuickFilterConfig): string {
    const isActive = this.activeQuickFilters.includes(quickFilter.key);
    const color = quickFilter.color || 'blue';
    
    if (isActive) {
      const colorMap: {[key: string]: string} = {
        blue: 'border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200',
        green: 'border-green-300 bg-green-100 text-green-800 hover:bg-green-200',
        yellow: 'border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        red: 'border-red-300 bg-red-100 text-red-800 hover:bg-red-200',
        purple: 'border-purple-300 bg-purple-100 text-purple-800 hover:bg-purple-200',
        orange: 'border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-100'
      };
      return colorMap[color];
    }
    
    return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300';
  }


  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(value => value && value !== '') || this.activeQuickFilters.length > 0;
  }

  getActiveFilterLabels(): string[] {
    const labels: string[] = [];
    
    // Add regular filter labels
    this.filterConfigs.forEach(config => {
      const value = this.filters[config.key];
      if (value && value !== '') {
        const option = config.options?.find(opt => opt.value === value);
        labels.push(`${config.label}: ${option?.label || value}`);
      }
    });
    
    // Add quick filter labels
    this.quickFilters?.forEach(qf => {
      if (this.activeQuickFilters.includes(qf.key)) {
        labels.push(qf.label);
      }
    });
    
    return labels;
  }
}