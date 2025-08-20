import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StringUtils, CommonUtils } from '../../utils';

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
  isMainAction?: boolean;
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
        <!-- Desktop Skeleton Loading -->
        <div class="hidden md:block border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="border-b border-gray-200">
              <tr>
                @if (selectable) {
                  <th class="px-6 py-3 text-left">
                    <div class="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                }
                @for (column of columns; track column.key) {
                  <th class="px-6 py-3">
                    <div class="h-4 bg-gray-200 rounded animate-pulse" [style.width]="getSkeletonWidth()"></div>
                  </th>
                }
                @if (actions && actions.length > 0) {
                  <th class="px-6 py-3">
                    <div class="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (i of [1,2,3,4,5]; track i) {
                <tr>
                  @if (selectable) {
                    <td class="px-6 py-4">
                      <div class="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  }
                  @for (column of columns; track column.key) {
                    <td class="px-6 py-4">
                      <div class="h-4 bg-gray-200 rounded animate-pulse" [style.width]="getSkeletonWidth()"></div>
                    </td>
                  }
                  @if (actions && actions.length > 0) {
                    <td class="px-6 py-4">
                      <div class="flex space-x-2">
                        <div class="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div class="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Skeleton Loading -->
        <div class="md:hidden space-y-4 p-1">
          @for (i of [1,2,3]; track i) {
            <div class="border-gray-200 rounded-lg p-5 shadow-sm mx-2">
              <div class="space-y-3 animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                <div class="flex gap-2 mt-4">
                  <div class="h-8 bg-gray-200 rounded flex-1"></div>
                  <div class="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Table Content -->
      @if (!loading) {
        
        <!-- Desktop Table -->
        <div class="hidden md:block border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="border-b border-gray-200">
              <tr>
                @if (selectable) {
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected()" 
                      (change)="toggleSelectAll($event)"
                      (click)="$event.stopPropagation()"
                      class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                  </th>
                }
                @for (column of columns; track column.key) {
                  <th 
                    class="px-6 py-3 text-xs font-semibold text-themed-secondary uppercase tracking-wider"
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
                  <th class="px-6 py-3 text-left text-xs font-semibold text-themed-secondary uppercase tracking-wider">Actions</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (item of data; track trackByFn ? trackByFn($index, item) : $index) {
                <tr 
                  class="hover:bg-themed-hover" 
                  [class.bg-themed-accent-light]="isItemSelected(item)"
                  [class.cursor-pointer]="rowClickable"
                  (click)="onRowClickHandler(item, $event)">
                  @if (selectable) {
                    <td class="px-6 py-4">
                      <input 
                        type="checkbox" 
                        [checked]="isItemSelected(item)" 
                        (change)="toggleItemSelection(item)"
                        (click)="$event.stopPropagation()"
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
                          <div class="text-sm text-themed leading-normal">
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
                            (click)="action.handler(item); $event.stopPropagation()"
                            [class]="getActionButtonClass(action.color) + ' table-action-btn btn-feedback'"
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
            <div 
              class="border-gray-200 rounded-lg p-5 shadow-sm mx-2"
              [class.cursor-pointer]="rowClickable"
              (click)="onRowClickHandler(item, $event)">
              @if (mobileCardTemplate) {
                <ng-container *ngTemplateOutlet="mobileCardTemplate; context: { $implicit: item, actions: getVisibleActions(item) }"></ng-container>
              } @else {
                <!-- Default Mobile Card Template -->
                <div class="mb-3">
                  @for (column of columns; track column.key) {
                    @if (!column.mobileHidden) {
                      <div class="mb-2">
                        <span class="text-xs font-semibold text-themed-secondary uppercase tracking-wide">{{ column.label }}:</span>
                        <div class="mt-1">
                          @switch (column.type) {
                            @case ('image') {
                              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                @if (getNestedValue(item, column.key)) {
                                  <img [src]="getNestedValue(item, column.key)" alt="Image" class="w-8 h-8 rounded-full object-cover" />
                                } @else {
                                  <span class="text-white font-medium text-xs">{{ getInitials(item) }}</span>
                                }
                              </div>
                            }
                            @case ('badge') {
                              <span [class]="getBadgeClass(getNestedValue(item, column.key))">
                                {{ getNestedValue(item, column.key) | prettyLabel }}
                              </span>
                            }
                            @case ('date') {
                              <span class="text-sm text-gray-700">{{ getNestedValue(item, column.key) | date:'MMM d, y' }}</span>
                            }
                            @case ('custom') {
                              <ng-container *ngTemplateOutlet="customCellTemplate; context: { $implicit: item, column: column }"></ng-container>
                            }
                            @default {
                              <div class="text-sm text-themed leading-normal">{{ getNestedValue(item, column.key) }}</div>
                            }
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
                
                <!-- Mobile Action Buttons -->
                @if (actions && actions.length > 0) {
                  <div class="flex flex-wrap gap-2">
                    @for (action of getVisibleActions(item); track action.label) {
                      <button
                        (click)="action.handler(item); $event.stopPropagation()"
                        [class]="'flex-1 px-3 py-2 text-xs font-medium rounded btn-feedback ' + getActionButtonClass(action.color)"
                        style="min-height: 36px;">
                        {{ action.label }}
                      </button>
                    }
                  </div>
                }
              }
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
        <div class="mt-6 mb-8 flex flex-col sm:flex-row items-center justify-between">
          <div class="text-sm text-themed-secondary mb-4 sm:mb-0">
            Showing {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} 
            to {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems) }} 
            of {{ pagination.totalItems }} {{ itemLabel }}
          </div>
          <div class="flex items-center space-x-2">
            <button
              (click)="onPageChange.emit(pagination.currentPage - 1)"
              [disabled]="pagination.currentPage === 1"
              class="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed btn-feedback touch-target">
              Previous
            </button>
            <span class="px-3 py-2 text-sm text-themed-secondary">
              Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
            </span>
            <button
              (click)="onPageChange.emit(pagination.currentPage + 1)"
              [disabled]="pagination.currentPage === pagination.totalPages"
              class="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed btn-feedback touch-target">
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
  @Input() rowClickable = false;

  @Output() onSelectionChange = new EventEmitter<T[]>();
  @Output() onSort = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onRowClick = new EventEmitter<T>();

  @ContentChild('customCell') customCellTemplate: TemplateRef<any> | null = null;
  @ContentChild('mobileCard') mobileCardTemplate: TemplateRef<any> | null = null;
  @ContentChild('emptyState') emptyStateTemplate: TemplateRef<any> | null = null;

  Math = Math;
  private sortColumn = '';
  private sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    if (Object.keys(this.badgeConfig).length === 0) {
      this.badgeConfig = {
        'published': 'tag tag-green',
        'draft': 'tag tag-yellow',
        'pending': 'tag tag-blue',
        'rejected': 'tag tag-red',
        'admin': 'tag tag-red',
        'reviewer': 'tag tag-blue',
        'user': 'tag tag-gray'
      };
    }
  }

  getNestedValue(obj: any, path: string): any {
    return CommonUtils.getNestedProperty(obj, path);
  }

  getInitials(item: any): string {
    const name = item.name || item.username || item.title || '';
    return StringUtils.getInitialsWithFallback(name);
  }

  getBadgeClass(value: string): string {
    const defaultClass = 'tag tag-gray';
    return this.badgeConfig[value?.toLowerCase()] || defaultClass;
  }

  getActionButtonClass(color?: string): string {
    const baseClass = 'inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 transition-all duration-150';
    switch (color) {
      case 'primary': return `${baseClass} text-white bg-themed-accent hover:bg-themed-accent-hover shadow-sm font-semibold focus:ring-orange-500`;
      case 'danger': return `${baseClass} action-btn-danger`;
      case 'warning': return `${baseClass} action-btn-warning`;
      case 'success': return `${baseClass} action-btn-success`;
      default: return `${baseClass} text-themed-secondary bg-themed-tertiary hover:bg-themed-hover font-medium focus:ring-gray-500`;
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

  onRowClickHandler(item: T, event: Event): void {
    if (!this.rowClickable) return;
    
    const mainAction = this.getMainAction(item);
    if (mainAction) {
      mainAction.handler(item);
    } else {
      this.onRowClick.emit(item);
    }
  }

  getMainAction(item: T): TableAction | null {
    const visibleActions = this.getVisibleActions(item);
    return visibleActions.find(action => action.isMainAction) || 
           (visibleActions.length > 0 ? visibleActions[0] : null);
  }

  getSkeletonWidth(): string {
    const widths = ['60%', '80%', '70%', '90%', '75%'];
    return widths[Math.floor(Math.random() * widths.length)];
  }
}
