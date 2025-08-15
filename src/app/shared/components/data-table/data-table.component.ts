import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'badge' | 'date' | 'image' | 'custom';
  mobileHidden?: boolean;
}

export interface TableAction {
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  condition?: (item: any) => boolean;
  handler: (item: any) => void;
}

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasMore?: boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, PrettyLabelPipe, StatusBadgeComponent],
  template: `
    <div class="w-full">
      <!-- Loading State -->
      @if (loading) {
        <div class="loading-container">
          <div class="text-center">
            <div class="spinner mx-auto"></div>
            <div class="loading-text text-gray-600 mt-3">{{ loadingText }}</div>
          </div>
        </div>
      }

      <!-- Table Content -->
      @if (!loading) {
        
        <!-- Desktop Table -->
        <div class="hidden md:block bg-themed-card border-themed rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-themed-secondary border-b border-themed">
              <tr>
                @if (selectable) {
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected()" 
                      (change)="toggleSelectAll($event)"
                      class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                  </th>
                }
                @for (column of columns; track column.key) {
                  <th 
                    class="px-6 py-3 text-xs font-medium text-themed-secondary uppercase tracking-wider"
                    [class.text-left]="column.align === 'left' || !column.align"
                    [class.text-center]="column.align === 'center'"
                    [class.text-right]="column.align === 'right'"
                    [style.width]="column.width">
                    @if (column.sortable) {
                      <button 
                        (click)="sort(column.key)"
                        class="flex items-center space-x-1 hover:text-gray-700">
                        <span>{{ column.label }}</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                        </svg>
                      </button>
                    } @else {
                      {{ column.label }}
                    }
                  </th>
                }
                @if (actions && actions.length > 0) {
                  <th class="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">Actions</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-themed">
              @for (item of data; track trackByFn ? trackByFn($index, item) : $index) {
                <tr class="hover:bg-themed-hover" [class.bg-themed-accent-light]="isItemSelected(item)">
                  @if (selectable) {
                    <td class="px-6 py-4">
                      <input 
                        type="checkbox" 
                        [checked]="isItemSelected(item)" 
                        (change)="toggleItemSelection(item)"
                        class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                    </td>
                  }
                  @for (column of columns; track column.key) {
                    <td 
                      class="px-6 py-4"
                      [class.text-left]="column.align === 'left' || !column.align"
                      [class.text-center]="column.align === 'center'"
                      [class.text-right]="column.align === 'right'">
                      @switch (column.type) {
                        @case ('image') {
                          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                            @if (getNestedValue(item, column.key)) {
                              <img
                                [src]="getNestedValue(item, column.key)"
                                alt="Image"
                                class="w-10 h-10 rounded-full object-cover" />
                            } @else {
                              <span class="text-white font-medium text-sm">
                                {{ getInitials(item) }}
                              </span>
                            }
                          </div>
                        }
                        @case ('badge') {
                          <app-status-badge [status]="getNestedValue(item, column.key)"></app-status-badge>

                        }
                        @case ('date') {
                          <span class="text-sm text-themed-secondary">
                            {{ getNestedValue(item, column.key) | date:'MMM d, y' }}
                          </span>
                        }
                        @case ('custom') {
                          <ng-container *ngTemplateOutlet="customCellTemplate; context: { $implicit: item, column: column }"></ng-container>
                        }
                        @default {
                          <div class="text-sm text-themed">
                            {{ getNestedValue(item, column.key) }}
                          </div>
                        }
                      }
                    </td>
                  }
                  @if (actions && actions.length > 0) {
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-2">
                        @for (action of getVisibleActions(item); track action.label) {
                          <button
                            (click)="action.handler(item)"
                            [class]="getActionButtonClass(action.color)"
                            [title]="action.label">
                            @if (action.icon) {
                              <svg class="w-4 h-4" [innerHTML]="action.icon"></svg>
                            } @else {
                              {{ action.label }}
                            }
                          </button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="md:hidden space-y-4 p-1">
          @for (item of data; track trackByFn ? trackByFn($index, item) : $index) {
            <div class="bg-themed-card border-themed rounded-lg p-5 shadow-sm mx-2">
              <ng-container *ngTemplateOutlet="mobileCardTemplate; context: { $implicit: item, actions: getVisibleActions(item) }"></ng-container>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && data.length === 0) {
        <div class="text-center py-12">
          <ng-container *ngTemplateOutlet="emptyStateTemplate"></ng-container>
        </div>
      }

      <!-- Pagination -->
      @if (!loading && pagination && data.length > 0) {
        <div class="mt-6 flex flex-col sm:flex-row items-center justify-between">
          <div class="text-sm text-themed-secondary mb-4 sm:mb-0">
            Showing {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} 
            to {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems) }} 
            of {{ pagination.totalItems }} {{ itemLabel }}
          </div>
          <div class="flex items-center space-x-2">
            <button
              (click)="onPageChange.emit(pagination.currentPage - 1)"
              [disabled]="pagination.currentPage === 1"
              class="px-4 py-2 text-sm border border-themed rounded-md bg-themed-card text-themed hover:bg-themed-hover disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <span class="px-3 py-2 text-sm text-themed-secondary">
              Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
            </span>
            <button
              (click)="onPageChange.emit(pagination.currentPage + 1)"
              [disabled]="pagination.currentPage === pagination.totalPages"
              class="px-4 py-2 text-sm border border-themed rounded-md bg-themed-card text-themed hover:bg-themed-hover disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .spinner {
      width: 2rem;
      height: 2rem;
      border: 4px solid rgba(251, 146, 60, 0.2);
      border-top: 4px solid rgb(251, 146, 60);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-container { text-align: center; padding: 3rem 0; }
    .loading-text { color: rgb(75, 85, 99); margin-top: 0.75rem; }
  `]
})
export class DataTableComponent<T = any> implements OnInit {
  @Input() columns: TableColumn[] = [];
  @Input() data: T[] = [];
  @Input() actions: TableAction[] = [];
  @Input() loading = false;
  @Input() loadingText = 'Loading...';
  @Input() selectable = false;
  @Input() selectedItems: T[] = [];
  @Input() pagination?: PaginationConfig;
  @Input() itemLabel = 'items';
  @Input() trackByFn?: (index: number, item: T) => any;
  @Input() badgeConfig: Record<string, string> = {};

  @Output() onSelectionChange = new EventEmitter<T[]>();
  @Output() onSort = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() onPageChange = new EventEmitter<number>();

  @ContentChild('customCell') customCellTemplate: TemplateRef<any> | null = null;
  @ContentChild('mobileCard') mobileCardTemplate: TemplateRef<any> | null = null;
  @ContentChild('emptyState') emptyStateTemplate: TemplateRef<any> | null = null;

  Math = Math;
  private sortColumn = '';
  private sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    if (Object.keys(this.badgeConfig).length === 0) {
      this.badgeConfig = {
        'published': 'px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700',
        'draft': 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-50 text-orange-700',
        'pending': 'px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700',
        'rejected': 'px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700',
        'admin': 'px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700',
        'reviewer': 'px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700',
        'user': 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700'
      };
    }
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getInitials(item: any): string {
    const name = item.name || item.username || item.title || '';
    return name.charAt(0).toUpperCase();
  }

  getBadgeClass(value: string): string {
    const defaultClass = 'px-2 py-1 text-xs font-medium rounded-full tag tag-gray';
    return this.badgeConfig[value?.toLowerCase()] || defaultClass;
  }

  getActionButtonClass(color?: string): string {
    const baseClass = 'inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 transition-all duration-150';
    switch (color) {
      case 'primary': return `${baseClass} text-white bg-themed-accent hover:bg-themed-accent-hover focus:ring-orange-500`;
      case 'danger': return `${baseClass} action-btn-danger`;
      case 'warning': return `${baseClass} action-btn-warning`;
      case 'success': return `${baseClass} action-btn-success`;
      default: return `${baseClass} text-themed-secondary bg-themed-tertiary hover:bg-themed-hover focus:ring-gray-500`;
    }
  }

  getVisibleActions(item: T): TableAction[] {
    return this.actions.filter(action => !action.condition || action.condition(item));
  }

  isAllSelected(): boolean {
    return this.data.length > 0 && this.selectedItems.length === this.data.length;
  }

  isItemSelected(item: T): boolean {
    return this.selectedItems.some(selected => this.compareItems(selected, item));
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedItems = [...this.data];
    } else {
      this.selectedItems = [];
    }
    this.onSelectionChange.emit(this.selectedItems);
  }

  toggleItemSelection(item: T): void {
    const index = this.selectedItems.findIndex(selected => this.compareItems(selected, item));
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(item);
    }
    this.onSelectionChange.emit(this.selectedItems);
  }

  private compareItems(item1: T, item2: T): boolean {
    if (this.trackByFn) {
      return this.trackByFn(0, item1) === this.trackByFn(0, item2);
    }
    return (item1 as any)._id === (item2 as any)._id || 
           (item1 as any).id === (item2 as any).id ||
           item1 === item2;
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.onSort.emit({ column, direction: this.sortDirection });
  }
}
