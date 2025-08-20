import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BackendService } from '../../../services/backend.service';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { SUBMISSION_STATUS, SubmissionStatus, API_ENDPOINTS } from '../../../shared/constants/api.constants';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  SUBMISSIONS_TABLE_COLUMNS,
  createSubmissionActions,
  SUBMISSION_BADGE_CONFIG,
  SearchableUserSelectorComponent,
  User
} from '../../../shared/components';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';


@Component({
  selector: 'app-all-submissions',
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent, DataTableComponent, PrettyLabelPipe, SimpleSubmissionFilterComponent, SearchableUserSelectorComponent],
  templateUrl: './all-submissions.component.html',
  styleUrl: './all-submissions.component.css'
})
export class AllSubmissionsComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = [...SUBMISSIONS_TABLE_COLUMNS, {
    key: 'actions',
    label: 'Actions',
    type: 'custom',
    width: '15%',
    sortable: false
  }];
  actions: TableAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  selectedSubmissionsArray: any[] = [];
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  submissions: any[] = [];
  filteredSubmissions: any[] = [];
  users: User[] = [];
  loading = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};
  
  // Sorting properties
  currentSort = {
    sortBy: 'reviewedAt',
    order: 'desc' as 'asc' | 'desc'
  };
  
  // Edit mode
  editingSubmission: any = null;
  selectedUserId = '';
  
  // Bulk operations
  selectedSubmissions = new Set<string>();
  allSelected = false;
  showBulkActions = false;
  bulkSelectedUserId = '';
  bulkActionLoading = false;

  constructor(
    private http: HttpClient,
    private backendService: BackendService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const jwtToken = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
  }

  ngOnInit() {
    this.setupTableActions();
    this.loadSubmissions();
    this.loadUsers();
  }

  setupTableActions() {
    this.actions = [
      {
        label: 'Change Author',
        color: 'warning' as const,
        handler: (submission: any) => this.startEdit(submission)
      },
      {
        label: 'Delete',
        color: 'danger' as const,
        handler: (submission: any) => this.deleteSubmission(submission)
      }
    ];
  }

  loadSubmissions() {
    this.loading = true;
    
    // Build API parameters from current filters, pagination, and sorting
    const apiParams = {
      limit: this.paginationConfig.pageSize,
      skip: (this.paginationConfig.currentPage - 1) * this.paginationConfig.pageSize,
      sortBy: this.currentSort.sortBy,
      order: this.currentSort.order,
      ...this.getApiFilters()
    };
    
    this.backendService.getSubmissions(apiParams).subscribe({
      next: (res: any) => {
        this.submissions = res.submissions || [];
        this.filteredSubmissions = this.submissions; // Use API response directly
        
        // Update pagination from API response
        if (res.pagination) {
          this.paginationConfig = {
            currentPage: res.pagination.currentPage || 1,
            totalPages: res.pagination.totalPages || 1,
            pageSize: res.pagination.limit || 20,
            totalItems: res.total || 0
          };
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.showMessage('Failed to load submissions', 'error');
        this.loading = false;
      }
    });
  }

  getApiFilters() {
    const apiFilters: any = {};
    
    if (this.currentFilters.status) {
      apiFilters.status = this.currentFilters.status;
    }
    
    if (this.currentFilters.type) {
      apiFilters.type = this.currentFilters.type;
    }
    
    if (this.currentFilters.search?.trim()) {
      apiFilters.search = this.currentFilters.search.trim();
    }
    
    return apiFilters;
  }

  loadUsers() {
    const headers = this.getAuthHeaders();
    this.http.get(`${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.USERS}`, { headers }).subscribe({
      next: (res: any) => {
        this.users = (res.users || []).map((user: any) => ({
          _id: user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email || 'No email'
        }));
      },
      error: (err) => {
      }
    });
  }

  startEdit(submission: any) {
    this.editingSubmission = { ...submission };
    // Handle different possible data structures for userId
    this.selectedUserId = submission.userId?._id || submission.userId || submission.authorId || '';
  }

  cancelEdit() {
    this.editingSubmission = null;
    this.selectedUserId = '';
  }

  saveChanges() {
    if (!this.selectedUserId) {
      this.showMessage('Please select a user', 'error');
      return;
    }

    const headers = this.getAuthHeaders();
    this.http.put(`${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.SUBMISSIONS.REASSIGN(this.editingSubmission._id)}`, {
      newUserId: this.selectedUserId
    }, { headers }).subscribe({
      next: (res: any) => {
        this.showMessage('Submission reassigned successfully', 'success');
        this.cancelEdit();
        this.loadSubmissions();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to reassign submission', 'error');
      }
    });
  }

  deleteSubmission(submission: any) {
    const confirmMsg = `Are you sure you want to permanently delete the submission "${submission.title}"?\n\nThis action cannot be undone and will remove all associated data.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    // Double confirmation for delete action
    const doubleConfirmMsg = `FINAL CONFIRMATION:\n\nYou are about to permanently delete:\n"${submission.title}"\n\nThis will remove all content, reviews, and history. This action is irreversible.\n\nType "DELETE" to confirm.`;
    
    const userInput = prompt(doubleConfirmMsg);
    if (userInput !== 'DELETE') {
      this.showMessage('Delete operation cancelled', 'info');
      return;
    }

    this.loading = true;
    this.backendService.deleteSubmission(submission._id).subscribe({
      next: () => {
        this.showMessage(`Submission "${submission.title}" has been permanently deleted`, 'success');
        this.loadSubmissions(); // Refresh the list
        this.loading = false;
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to delete submission', 'error');
        this.loading = false;
      }
    });
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case SUBMISSION_STATUS.PENDING_REVIEW: return 'tag tag-yellow';
      case SUBMISSION_STATUS.IN_PROGRESS: return 'tag tag-blue';
      case SUBMISSION_STATUS.ACCEPTED: return 'tag tag-emerald';
      case SUBMISSION_STATUS.REJECTED: return 'tag tag-red';
      case SUBMISSION_STATUS.PUBLISHED: return 'tag tag-green';
      case SUBMISSION_STATUS.NEEDS_REVISION: return 'tag tag-orange';
      default: return 'tag tag-gray';
    }
  }
  
  onSelectionChange(selectedSubmissions: any[]) {
    this.selectedSubmissionsArray = selectedSubmissions;
    this.selectedSubmissions.clear();
    selectedSubmissions.forEach(sub => this.selectedSubmissions.add(sub._id));
    this.updateBulkActionsVisibility();
  }

  toggleSubmissionSelection(submissionId: string) {
    if (this.selectedSubmissions.has(submissionId)) {
      this.selectedSubmissions.delete(submissionId);
    } else {
      this.selectedSubmissions.add(submissionId);
    }
    this.updateBulkActionsVisibility();
  }
  
  updateBulkActionsVisibility() {
    this.showBulkActions = this.selectedSubmissions.size > 0;
  }
  
  isSubmissionSelected(submissionId: string): boolean {
    return this.selectedSubmissions.has(submissionId);
  }
  
  clearSelection() {
    this.selectedSubmissions.clear();
    this.allSelected = false;
    this.showBulkActions = false;
    this.bulkSelectedUserId = '';
  }

  // Bulk operations
  bulkReassignUser() {
    if (!this.bulkSelectedUserId) {
      this.showMessage('Please select a user to assign submissions to', 'error');
      return;
    }
    
    if (this.selectedSubmissions.size === 0) {
      this.showMessage('Please select submissions to reassign', 'error');
      return;
    }
    
    const selectedUser = this.users.find(u => u._id === this.bulkSelectedUserId);
    const confirmMsg = `Are you sure you want to reassign ${this.selectedSubmissions.size} submission(s) to ${selectedUser?.name || 'selected user'}?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    this.bulkActionLoading = true;
    const submissionIds = Array.from(this.selectedSubmissions);
    const headers = this.getAuthHeaders();
    
    this.http.put(`${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.SUBMISSIONS.BULK_REASSIGN}`, {
      submissionIds,
      newUserId: this.bulkSelectedUserId
    }, { headers }).subscribe({
      next: (res: any) => {
        this.showMessage(`Successfully reassigned ${submissionIds.length} submission(s) to ${selectedUser?.name}`, 'success');
        this.clearSelection();
        this.loadSubmissions();
        this.bulkActionLoading = false;
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to bulk reassign submissions', 'error');
        this.bulkActionLoading = false;
      }
    });
  }

  onTablePageChange(page: number) {
    this.paginationConfig.currentPage = page;
    this.loadSubmissions(); // Reload data for new page
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentSort = {
      sortBy: event.column,
      order: event.direction
    };
    this.paginationConfig.currentPage = 1; // Reset to first page when sorting
    this.loadSubmissions(); // Reload data with new sorting
  }

  trackBySubmissionId(index: number, submission: any): string {
    return submission._id;
  }

  // New methods for mobile-optimized filters
  refreshData(): void {
    this.loadSubmissions();
    this.loadUsers();
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.paginationConfig.currentPage = 1; // Reset to first page when filtering
    this.loadSubmissions(); // Reload data with new filters
  }

  // Legacy method - no longer needed since we use API-based filtering
  // Keeping it simple in case any other part of the code calls it
  applyFilters() {
    this.filteredSubmissions = this.submissions;
  }

  // Helper methods to handle different API response structures
  getAuthorName(item: any): string {
    return item.authorName || 'Unknown';
  }

  getAuthorEmail(item: any): string {
    return 'No email';  // Email not provided in simplified response
  }

}