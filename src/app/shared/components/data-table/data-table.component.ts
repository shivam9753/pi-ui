import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StringUtils, CommonUtils } from '../../utils';
import { ButtonComponent } from '../../../ui-components/button/button.component';
import { CardComponent } from '../../../ui-components/card/card.component';

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
  imports: [CommonModule, PrettyLabelPipe, StatusBadgeComponent, ButtonComponent, CardComponent],
  template: `
    <div class="w-full">

      <!-- Reusable cell renderer used for both desktop cells and mobile metadata -->
      <ng-template #cellRenderer let-item let-column="column">
        <ng-container [ngSwitch]="column.type">
          <ng-container *ngSwitchCase="'image'">
            <div class="flex items-center">
              @if (getNestedValue(item, column.key)) {
                <img [src]="getNestedValue(item, column.key)" alt="Image" class="w-10 h-10 rounded-full object-cover" />
              } @else {
                <div class="w-10 h-10 rounded-full bg-themed-accent flex items-center justify-center text-white font-medium">{{ getInitials(item) }}</div>
              }
            </div>
          </ng-container>

          <ng-container *ngSwitchCase="'badge'">
            <app-status-badge [status]="getNestedValue(item, column.key)" size="sm"></app-status-badge>
          </ng-container>

          <ng-container *ngSwitchCase="'date'">
            <span class="text-sm text-themed-secondary">{{ getNestedValue(item, column.key) | date:'MMM d, y' }}</span>
          </ng-container>

          <ng-container *ngSwitchCase="'custom'">
            <ng-container *ngTemplateOutlet="customCellTemplate; context: { $implicit: item, column: column }"></ng-container>
          </ng-container>

          <ng-container *ngSwitchDefault>
            <div class="text-sm text-themed leading-normal">{{ getNestedValue(item, column.key) }}</div>
          </ng-container>
        </ng-container>
      </ng-template>

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
                      class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
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
                        class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
                    </td>
                  }
                  @for (column of columns; track column.key) {
                    <td 
                      class="px-6 py-4"
                      [class.text-left]="column.align === 'left' || !column.align"
                      [class.text-center]="column.align === 'center'"
                      [class.text-right]="column.align === 'right'">

                      <ng-container *ngTemplateOutlet="cellRenderer; context: { $implicit: item, column: column }"></ng-container>

                    </td>
                  }
                  @if (actions && actions.length > 0) {
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-2">
                        @for (action of getVisibleActions(item); track action.label) {
                          <app-button
                            (click)="action.handler(item); $event.stopPropagation()"
                            [variant]="mapActionVariant(action.color)"
                            size="sm"
                            [attr.title]="action.label">
                            @if (action.icon) {
                              <span [innerHTML]="action.icon"></span>
                            } @else {
                              {{ action.label }}
                            }
                          </app-button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards: use shared Card component and the same cell renderer to avoid duplicated rendering logic -->
        <div class="md:hidden space-y-4 px-4">
          <!-- Mobile Select All -->
          @if (selectable && data.length > 0) {
            <div class="data-table-select-all compact-inline mx-2 mb-4">
              <label class="flex items-center gap-3 text-sm text-gray-700">
                <input 
                  type="checkbox" 
                  [checked]="isAllSelected()" 
                  (change)="toggleSelectAll($event)"
                  aria-label="Select all submissions"
                  class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
                <span class="text-sm">Select all</span>
                <button *ngIf="selectedItems && selectedItems.length > 0" (click)="clearSelection(); $event.stopPropagation()" class="ml-2 text-xs text-gray-500 underline">Clear</button>
              </label>
            </div>
          }

          @for (item of data; track trackByFn ? trackByFn($index, item) : $index) {
            <!-- Inline mobile card (does not use app-card) -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mx-2" [class.bg-themed-accent-light]="isItemSelected(item)" (click)="onRowClickHandler(item, $event)">

              <!-- header: avatar + title + badges -->
              <ng-container *ngIf="getPrimary() as primary">
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    @if (primary.type === 'image' && getNestedValue(item, primary.key)) {
                      <img [src]="getNestedValue(item, primary.key)" class="w-12 h-12 rounded-full object-cover" alt="avatar" />
                    } @else {
                      <div class="w-12 h-12 rounded-full bg-themed-accent flex items-center justify-center text-white font-medium">{{ getInitials(item) }}</div>
                    }
                  </div>

                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <div class="text-lg font-semibold text-themed">{{ getPrimaryTitle(item) }}</div>
                      <ng-container *ngFor="let tag of getPrimaryTags(item)">
                        <app-status-badge [status]="tag" size="sm" tagType="type"></app-status-badge>
                      </ng-container>
                    </div>

                    <div class="text-sm text-themed-secondary mt-1" *ngIf="getAuthorName(item)">By {{ getAuthorName(item) }}</div>

                    <p class="mt-4 text-base text-gray-700 line-clamp-3">{{ getPrimarySubtitle(item) }}</p>
                  </div>
                </div>
              </ng-container>

              <!-- Secondary metadata rows (re-used renderer) -->
              <div class="mt-4">
                <ng-container *ngFor="let column of getSecondaryColumns()">
                  <div *ngIf="!column.mobileHidden" class="mb-2 flex justify-between items-start border-t border-transparent pt-2">
                    <div class="text-xs font-semibold text-themed-secondary uppercase">{{ column.label }}</div>
                    <div class="ml-4 text-sm text-gray-800">
                      <ng-container *ngTemplateOutlet="cellRenderer; context: { $implicit: item, column: column }"></ng-container>
                    </div>
                  </div>
                </ng-container>
              </div>

              <!-- Actions footer -->
              <div class="mt-5 flex items-center gap-3">
                <ng-container *ngIf="getMainAction(item) as primaryAction">
                  <app-button
                    (click)="primaryAction.handler(item); $event.stopPropagation()"
                    [variant]="mapActionVariant(primaryAction.color)"
                    size="md">
                    {{ primaryAction.label }}
                  </app-button>
                </ng-container>

                <div class="flex-1"></div>

                <ng-container *ngFor="let action of getSecondaryActions(item)">
                  <app-button
                    (click)="action.handler(item); $event.stopPropagation()"
                    [variant]="mapActionVariant(action.color)"
                    size="sm">
                    {{ action.label }}
                  </app-button>
                </ng-container>
              </div>

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
    .data-table-select-all.compact-inline { padding: 0; background: transparent; border: 0; }
    .data-table-select-all.compact-inline label { align-items: center; }
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

  // Clear all selections (used by mobile inline control)
  clearSelection(): void {
    this.selectedItems = [];
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

  // Map action color to the app-button variant so buttons follow design system
  mapActionVariant(color?: string): 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'destructive' {
    switch (color) {
      case 'primary': return 'primary';
      case 'danger': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'secondary';
      default: return 'tertiary';
    }
  }

  // Mobile helpers: determine primary and secondary columns for card layout
  getPrimaryColumn(): TableColumn | null {
    if (!this.columns || this.columns.length === 0) return null;
    // prefer a column named 'title' or 'name' or first visible
    const titleCandidate = this.columns.find(c => ['title', 'name'].includes(c.key));
    if (titleCandidate) return titleCandidate;
    return this.columns.find(c => !c.mobileHidden) || this.columns[0] || null;
  }

  getPrimaryTitle(item: any): string {
    const primary = this.getPrimaryColumn();
    if (!primary) return '';
    const value = this.getNestedValue(item, primary.key);
    if (primary.type === 'image') {
      return this.getInitials(item);
    }
    return value || this.getInitials(item) || '';
  }

  getPrimarySubtitle(item: any): string {
    const primary = this.getPrimaryColumn();
    if (!primary) return '';
    // show a short subtitle composed of another column if available (date or badge)
    const subtitleCandidate = this.columns.find(c => c !== primary && !c.mobileHidden && (c.type === 'date' || c.type === 'badge' || c.key === 'subtitle'));
    if (subtitleCandidate) {
      const val = this.getNestedValue(item, subtitleCandidate.key);
      return val ? String(val) : '';
    }
    return '';
  }

  getPrimaryTags(item: any): string[] {
    // expose type/status as tags for the card if available
    const typeCol = this.columns.find(c => c.type === 'badge');
    if (typeCol) {
      const val = this.getNestedValue(item, typeCol.key);
      return val ? [val] : [];
    }
    return [];
  }

  getSecondaryColumns(): TableColumn[] {
    const primary = this.getPrimaryColumn();
    return this.columns.filter(c => c !== primary && !c.mobileHidden);
  }

  // Return visible actions except the main action. Kept as a method so template bindings remain valid.
  getSecondaryActions(item: T): TableAction[] {
    const visible = this.getVisibleActions(item);
    // Determine the main action (prefer explicit isMainAction, otherwise first visible)
    const main = visible.find(a => a.isMainAction) || (visible.length ? visible[0] : null);
    // Exclude the main action from the secondary list to avoid duplicate rendering
    return visible.filter(a => a !== main);
  }

  // Extract author name from common nested fields used across the app
  getAuthorName(item: any): string {
    return this.getNestedValue(item, 'author.name') || this.getNestedValue(item, 'author') || this.getNestedValue(item, 'user.name') || this.getNestedValue(item, 'createdBy.name') || this.getNestedValue(item, 'by') || '';
  }

  getPrimaryImage(item: any): string | undefined {
    const primary = this.getPrimaryColumn();
    if (!primary) return undefined;
    if (primary.type === 'image') {
      return this.getNestedValue(item, primary.key) as string | undefined;
    }
    return undefined;
  }

  onCardPrimaryClick(item: T) {
    const main = this.getMainAction(item);
    if (main) main.handler(item);
  }

  onCardSecondaryClick(item: T) {
    const first = this.getFirstSecondaryAction(item);
    if (first) first.handler(item);
  }

  getFirstSecondaryAction(item: T): TableAction | null {
    const secs = this.getSecondaryActions(item);
    return secs.length ? secs[0] : null;
  }

  getRemainingSecondaryActions(item: T): TableAction[] {
    const secs = this.getSecondaryActions(item);
    return secs.length > 1 ? secs.slice(1) : [];
  }

  // Return the primary column object for template use (avoids optional chaining when key is passed to helpers)
  getPrimary(): TableColumn | null {
    return this.getPrimaryColumn();
  }

}
