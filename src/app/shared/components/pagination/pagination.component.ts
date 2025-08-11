import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="totalPages > 1" class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <!-- Mobile Pagination -->
      <div class="flex flex-1 justify-between sm:hidden">
        <button (click)="previousPage()" 
                [disabled]="!hasPrev"
                class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
          Previous
        </button>
        <button (click)="nextPage()" 
                [disabled]="!hasNext"
                class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
          Next
        </button>
      </div>

      <!-- Desktop Pagination -->
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <!-- Results Info -->
        <div>
          <p class="text-sm text-gray-700">
            Showing
            <span class="font-medium">{{ getStartItem() }}</span>
            to
            <span class="font-medium">{{ getEndItem() }}</span>
            of
            <span class="font-medium">{{ totalItems }}</span>
            results
          </p>
        </div>

        <!-- Pagination Controls -->
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <!-- Previous Button -->
            <button (click)="previousPage()" 
                    [disabled]="!hasPrev"
                    class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>

            <!-- Page Numbers -->
            <ng-container *ngFor="let page of getVisiblePages()">
              <!-- Regular Page Number -->
              <button *ngIf="page !== '...'" 
                      (click)="goToPage(page as number)"
                      [class]="getPageButtonClass(page as number)"
                      class="relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0">
                {{ page }}
              </button>
              
              <!-- Ellipsis -->
              <span *ngIf="page === '...'" 
                    class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                ...
              </span>
            </ng-container>

            <!-- Next Button -->
            <button (click)="nextPage()" 
                    [disabled]="!hasNext"
                    class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>

      <!-- Items Per Page Selector (optional) -->
      <div *ngIf="showItemsPerPage" class="mt-4 sm:mt-0 sm:ml-6">
        <label for="items-per-page" class="block text-sm font-medium text-gray-700 sm:inline">
          Items per page:
        </label>
        <select id="items-per-page"
                [ngModel]="itemsPerPage"
                (ngModelChange)="changeItemsPerPage($event)"
                class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:mt-0 sm:ml-2 sm:w-auto sm:text-sm">
          <option *ngFor="let size of itemsPerPageOptions" [value]="size">{{ size }}</option>
        </select>
      </div>
    </div>
  `
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Input() totalItems = 0;
  @Input() itemsPerPage = 10;
  @Input() showItemsPerPage = false;
  @Input() itemsPerPageOptions = [10, 25, 50, 100];
  @Input() maxVisiblePages = 7;

  @Output() pageChange = new EventEmitter<number>();
  @Output() itemsPerPageChange = new EventEmitter<number>();

  hasPrev = false;
  hasNext = false;

  ngOnChanges(changes: SimpleChanges) {
    this.updatePaginationState();
  }

  private updatePaginationState() {
    this.hasPrev = this.currentPage > 1;
    this.hasNext = this.currentPage < this.totalPages;
  }

  previousPage() {
    if (this.hasPrev) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  changeItemsPerPage(newItemsPerPage: number) {
    if (newItemsPerPage !== this.itemsPerPage) {
      this.itemsPerPageChange.emit(newItemsPerPage);
    }
  }

  getStartItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    
    if (this.totalPages <= this.maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      const startPage = Math.max(2, this.currentPage - 2);
      const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add pages around current page
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page (if it's not already included)
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  getPageButtonClass(page: number): string {
    const baseClasses = 'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0';
    
    if (page === this.currentPage) {
      return `${baseClasses} bg-orange-600 text-white ring-orange-600 focus:ring-orange-600`;
    } else {
      return `${baseClasses} text-gray-900 ring-gray-300 hover:bg-gray-50 focus:ring-gray-300`;
    }
  }
}