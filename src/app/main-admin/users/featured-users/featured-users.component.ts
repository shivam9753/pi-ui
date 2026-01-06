import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  USER_BADGE_CONFIG,
  ConsistentUserMobileCardComponent,
  UserAction
} from '../../../shared/components';

@Component({
  selector: 'app-featured-users',
  imports: [CommonModule, DatePipe, FormsModule, AdminPageHeaderComponent, DataTableComponent, ConsistentUserMobileCardComponent],
  templateUrl: './featured-users.component.html',
  styleUrl: './featured-users.component.css'
})
export class FeaturedUsersComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = [
    {
      key: 'user',
      label: 'User & Profile',
      type: 'custom',
      width: '40%',
      sortable: false
    },
    {
      key: 'role',
      label: 'Role',
      type: 'custom',
      width: '15%',
      sortable: true
    },
    {
      key: 'publishedSubmissions',
      label: 'Published Works',
      type: 'custom',
      width: '15%',
      align: 'center',
      sortable: true
    },
    {
      key: 'featuredAt',
      label: 'Featured Date',
      type: 'custom',
      width: '20%',
      sortable: true
    }
  ];
  actions: TableAction[] = [];
  consistentActions: UserAction[] = [];
  badgeConfig = USER_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  featuredUsers: any[] = [];
  loading = true;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;
  totalCount = 0;
  totalPages = 0;
  hasMore = false;

  // Page stats
  pageStats: AdminPageStat[] = [];

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check for returnPage parameter in query params
    this.route.queryParams.subscribe(params => {
      if (params['returnPage']) {
        const returnPage = parseInt(params['returnPage'], 10);
        if (returnPage > 0) {
          this.currentPage = returnPage;
          this.paginationConfig.currentPage = returnPage;
          // Clear the query parameter to avoid persisting it
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
        }
      }
    });

    this.setupTableActions();
    this.loadFeaturedUsers();
  }

  setupTableActions() {
    this.actions = [
      {
        label: 'View Profile',
        color: 'primary',
        handler: (user) => this.viewUserProfile(user)
      }
    ];

    // Setup consistent actions for mobile cards
    this.consistentActions = [
      {
        label: 'View Profile',
        color: 'primary',
        handler: (user) => this.viewUserProfile(user)
      }
    ];
  }

  loadFeaturedUsers() {
    this.loading = true;

    const skip = (this.currentPage - 1) * this.itemsPerPage;

    // Build parameters
    const params = {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: 'featuredAt',
      order: 'desc'
    };

    this.userService.getFeaturedUsers(params).subscribe({
      next: (data) => {
        this.featuredUsers = data.users || [];
        this.totalCount = data.pagination?.total || 0;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);
        this.hasMore = data.pagination?.hasNext || false;
        this.updatePaginationConfig();
        this.updatePageStats();
        this.loading = false;
      },
      error: (err) => {
        this.showError('Failed to load featured users: ' + (err.error?.message || err.message));
        this.loading = false;
      }
    });
  }

  updatePageStats() {
    this.pageStats = [
      {
        label: 'Featured Users',
        value: this.totalCount.toString(),
        color: 'text-yellow-600'
      },
      {
        label: 'Current Page',
        value: `${this.getCurrentPageInfo().start}-${this.getCurrentPageInfo().end}`,
        color: 'text-gray-600'
      }
    ];
  }

  // Navigate to view user profile
  viewUserProfile(user: any) {
    this.router.navigate(['/profile', user._id]);
  }

  // Get current page info for display
  getCurrentPageInfo() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
    return { start, end, total: this.totalCount };
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast(): void {
    this.showToastFlag = false;
  }

  showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  showError(message: string) {
    this.showToast(message, 'error');
  }

  // Refresh the user list
  refreshList() {
    this.currentPage = 1;
    this.loadFeaturedUsers();
  }

  // Pagination methods
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadFeaturedUsers();
  }

  nextPage() {
    if (this.hasMore) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  // Get page numbers for pagination display
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Helper method to get time ago
  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  // Get user display name
  getUserDisplayName(user: any): string {
    return user.name || user.username || 'Unknown User';
  }

  // Table management methods
  updatePaginationConfig() {
    this.paginationConfig = {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      pageSize: this.itemsPerPage,
      totalItems: this.totalCount
    };
  }

  onTablePageChange(page: number) {
    this.currentPage = page;
    this.loadFeaturedUsers();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    // For now, we'll reload with the default sort. Could be enhanced later
    this.currentPage = 1;
    this.loadFeaturedUsers();
  }

  trackByUserId(index: number, user: any): string {
    return user._id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }
}