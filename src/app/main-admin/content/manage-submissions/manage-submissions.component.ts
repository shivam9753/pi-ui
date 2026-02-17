import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BackendService } from '../../../services/backend.service';
import { HtmlSanitizerService } from '../../../services/html-sanitizer.service';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  PUBLISHED_POSTS_TABLE_COLUMNS,
  createPublishedPostActions,
  SUBMISSION_BADGE_CONFIG,
  SearchableUserSelectorComponent,
  User,
  ConsistentSubmissionMobileCardComponent,
  SubmissionAction,
  SubmissionMobileCardComponent
} from '../../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';
import { SUBMISSION_STATUS, API_ENDPOINTS } from '../../../shared/constants/api.constants';
import { environment } from '../../../../environments/environment';
import { ButtonComponent } from '../../../ui-components/button/button.component';
import { TabsComponent, TabItemComponent } from '../../../ui-components';

@Component({
  selector: 'app-manage-submissions',
  imports: [CommonModule, FormsModule, ButtonComponent, PrettyLabelPipe, BadgeLabelComponent, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent, SearchableUserSelectorComponent, ConsistentSubmissionMobileCardComponent, SubmissionMobileCardComponent, TabsComponent, TabItemComponent],
  templateUrl: './manage-submissions.component.html',
  styleUrl: './manage-submissions.component.css'
})
export class ManageSubmissionsComponent implements OnInit {
  // Table configuration
  // keep a base copy to derive tab-specific column sets
  private baseColumns: TableColumn[] = PUBLISHED_POSTS_TABLE_COLUMNS;
  columns: TableColumn[] = [...this.baseColumns];
  actions: TableAction[] = [];
  consistentActions: SubmissionAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  publishedSubmissions: any[] = [];
  filteredSubmissions: any[] = [];
  loading = true;
  searchTerm = '';
  selectedType = '';
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};
  // Tabs: 'published', 'accepted', 'rejected', 'draft'
  quickFilter: 'published' | 'accepted' | 'rejected' | 'draft' = 'published';
  // Two-way bound tab state for the UI component
  activeTab: string = 'published';

  // Analytics stats
  stats: AdminPageStat[] = [];

  // Author reassignment properties
  users: User[] = [];
  selectedSubmissions = new Set<string>();
  selectedSubmissionsArray: any[] = [];
  bulkSelectedUserId: string = '';
  bulkActionLoading = false;
  showBulkActions = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  // Track counts per tab so UI can show small chips on the tabs
  tabCounts: { [key: string]: number } = {
    published: 0,
    accepted: 0,
    rejected: 0,
    draft: 0
  };

  // Constants for template usage
  readonly SUBMISSION_STATUS = SUBMISSION_STATUS;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;
  totalCount = 0;
  totalPages = 0;
  hasMore = false;

  constructor(
    private backendService: BackendService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private htmlSanitizer: HtmlSanitizerService
  ) {}

  ngOnInit() {
    // Set quickFilter from activeTab default so New tab is selected on load
    if (this.activeTab) {
      this.quickFilter = this.activeTab as any;
    }

    // Check for returnPage parameter in query params (for page restoration after navigation)
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
    // Ensure actions reflect the currently active tab
    this.updateActionsForTab();
    this.loadUsers();
    this.loadPublishedSubmissions();
  }

  // Called when the top-level tab changes
  onTabChange(tabId: string) {
    // tabId expected to be one of: 'published'|'accepted'|'rejected'|'draft'
    console.log('🔁 Tab changed to:', tabId);
    this.quickFilter = tabId as any;
    // reset paging and filters when switching
    this.currentPage = 1;
    this.currentFilters = {};
    // clear any selected items when switching tabs
    this.clearSelection();
    this.updateActionsForTab();
    this.loadPublishedSubmissions();
  }

  updateActionsForTab() {
    // reset to base columns as a starting point
    this.columns = [...this.baseColumns];

    switch (this.quickFilter) {
      case 'published':
        // Published: Primary = Edit, Secondary = Unpublish (move back to Accepted)
        this.actions = [
          { label: 'Edit', color: 'primary', isMainAction: true, handler: (post:any) => this.editPublishedPost(post._id) },
          { label: 'Unpublish', color: 'danger', handler: (post:any) => this.unpublishSubmission(post._id, post.title) }
        ];
        this.consistentActions = [
          { label: 'Edit', color: 'primary', handler: (p:any)=> this.editPublishedPost(p._id) },
          { label: 'Unpublish', color: 'danger', handler: (p:any)=> this.unpublishSubmission(p._id, p.title) }
        ];
        break;

      case 'accepted':
        // Accepted: show status column and primary Publish, secondary Back to Review
        // Remove stats column but keep status visible
        this.columns = this.baseColumns.filter(c => c.key !== 'stats');
        this.actions = [
          { label: 'Publish', color: 'primary', isMainAction: true, handler: (post:any) => this.configureAndPublish(post._id) },
          { label: 'Back to Review', color: 'secondary', handler: (post:any) => this.backToReview(post._id, post.title) }
        ];
        this.consistentActions = [
          { label: 'Publish', color: 'primary', handler: (p:any)=> this.configureAndPublish(p._id) },
          { label: 'Back to Review', color: 'secondary', handler: (p:any)=> this.backToReview(p._id, p.title) }
        ];
        break;

      case 'draft':
        // Drafts: Edit, Delete
        this.actions = [
          { label: 'Edit', color: 'primary', isMainAction: true, handler: (post:any) => this.editPublishedPost(post._id) },
          { label: 'Delete', color: 'danger', handler: (post:any) => this.deleteSubmission(post._id, post.title) }
        ];
        this.consistentActions = [
          { label: 'Edit', color: 'primary', handler: (p:any)=> this.editPublishedPost(p._id) },
          { label: 'Delete', color: 'danger', handler: (p:any)=> this.deleteSubmission(p._id, p.title) }
        ];
        break;

      case 'rejected':
        // Rejected: View, Delete
        this.actions = [
          { label: 'View', color: 'secondary', isMainAction: true, handler: (post:any) => this.viewSubmission(post) },
          { label: 'Delete', color: 'danger', handler: (post:any) => this.deleteSubmission(post._id, post.title) }
        ];
        this.consistentActions = [
          { label: 'View', color: 'secondary', handler: (p:any)=> this.viewSubmission(p) },
          { label: 'Delete', color: 'danger', handler: (p:any)=> this.deleteSubmission(p._id, p.title) }
        ];
        break;

      default:
        this.actions = [];
        this.consistentActions = [];
    }
  }

  setupTableActions() {
    this.actions = createPublishedPostActions(
      (post) => this.editPublishedPost(post._id),
      (post) => this.unpublishSubmission(post._id, post.title),
      (post) => this.configureAndPublish(post._id),
      (post) => this.deleteSubmission(post._id, post.title),
      (post) => this.featureContent(post._id, post.title),
      (post) => this.unfeatureContent(post._id, post.title)
    );
    
    // Setup consistent actions for mobile cards
    this.consistentActions = [
      {
        label: 'Edit',
        color: 'primary',
        handler: (post) => this.editPublishedPost(post._id)
      },
      {
        label: 'Feature',
        color: 'warning',
        handler: (post) => this.featureContent(post._id, post.title)
      },
      {
        label: 'View',
        color: 'secondary',
        handler: (post) => this.viewContent(post)
      }
    ];
  }

  loadPublishedSubmissions() {
    this.loading = true;
    
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    
    // Build parameters including filters
    const params: any = {
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: this.currentFilters.sortBy || 'reviewedAt',
      order: this.currentFilters.order || 'desc'
    };

    // Add type filter if selected
    if (this.currentFilters.type && this.currentFilters.type.trim() !== '') {
      params.type = this.currentFilters.type.trim();
    }

    // Add search parameter if provided
    if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
      params.search = this.currentFilters.search.trim();
    }

    // Map tab to API status filter
    if (this.quickFilter === 'published') {
      params.status = SUBMISSION_STATUS.PUBLISHED;
    } else if (this.quickFilter === 'accepted') {
      params.status = SUBMISSION_STATUS.ACCEPTED;
    } else if (this.quickFilter === 'rejected') {
      params.status = SUBMISSION_STATUS.REJECTED;
    } else if (this.quickFilter === 'draft') {
      params.status = SUBMISSION_STATUS.DRAFT;
    }

    // Debug: ensure params include expected status for current tab
    console.log('📡 Loading submissions — quickFilter:', this.quickFilter, 'params:', params);

    const apiCall = (this.quickFilter === 'published')
      ? this.backendService.getPublishedContent(params.type || '', params)
      : this.backendService.getSubmissions(params);
    
    apiCall.subscribe({
      next: (data: any) => {
        console.log('📊 API Response:', data);
        const submissions = data.submissions || data.data || [];
        console.log('🔢 Received submissions count:', submissions.length);
        console.log('🏷️ Quick filter:', this.quickFilter);
        
        // Create new array references to ensure change detection
        this.publishedSubmissions = [...submissions];
        this.filteredSubmissions = [...submissions];
        this.totalCount = data.total || data.pagination?.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('🚨 Error loading submissions:', err);
        this.loading = false;
      }
    });
  }

  // Helper used by the template to render per-tab counts (safe fallback to 0)
  getTabCount(tabId: string): number {
    return this.tabCounts[tabId] || 0;
  }

  setQuickFilter(filter: 'published' | 'all' | 'accepted') {
    console.log('🎯 Quick filter changed to legacy filter:', filter);
    // legacy helper — map to supported tab values when used
    if (filter === 'published') this.onTabChange('published');
    else if (filter === 'accepted') this.onTabChange('accepted');
    else this.onTabChange('published');
  }

  getAvailableStatuses() {
    // Return an array of statuses to populate the status filter. Empty array hides the status filter.
    switch (this.quickFilter) {
      case 'published':
        return []; // all rows are published — no status filter
      case 'accepted':
        return []; // accepted list shouldn't surface a status filter
      case 'draft':
        return [SUBMISSION_STATUS.DRAFT];
      case 'rejected':
        return [SUBMISSION_STATUS.REJECTED];
      default:
        return [];
    }
  }

  // Navigate to publishing interface for editing
  editPublishedPost(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId], {
      queryParams: { 
        returnPage: this.currentPage,
        returnUrl: '/admin#published-posts'
      }
    });
  }

  // View published content
  viewContent(post: any) {
    if (post.slug) {
      window.open(`/${post.submissionType}/${post.slug}`, '_blank');
    }
  }

  // Configure and publish a submission (for accepted but unpublished items)
  configureAndPublish(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId], {
      queryParams: { 
        returnPage: this.currentPage,
        returnUrl: '/admin#published-posts'
      }
    });
  }

  // Navigate to publishing interface for editing (alias)
  editSubmission(submission: any) {
    this.editPublishedPost(submission._id);
  }

  // Unpublish a submission (move back to accepted)
  unpublishSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to unpublish "${title}"? This will move it back to accepted status.`)) {
      return;
    }

    this.backendService.unpublishSubmission(submissionId, 'Unpublished by admin').subscribe({
      next: (response) => {
        this.showSuccess('Submission unpublished successfully and moved to accepted status');
        // Update the local state instead of refreshing the entire list
        const submission = this.publishedSubmissions.find(sub => sub._id === submissionId);
        if (submission) {
          submission.status = SUBMISSION_STATUS.ACCEPTED; // Change status to show different buttons
        }
      },
      error: (err) => {
        this.showError('Failed to unpublish submission');
      }
    });
  }

  // Delete a submission permanently
  deleteSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently DELETE "${title}"? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation for delete
    if (!confirm('This will permanently delete the submission and all its content. Are you absolutely sure?')) {
      return;
    }

    this.backendService.deleteSubmission(submissionId).subscribe({
      next: (response) => {
        this.showSuccess('Submission deleted successfully');
        this.loadPublishedSubmissions(); // Refresh the list
      },
      error: (err) => {
        this.showError('Failed to delete submission');
      }
    });
  }

  // Navigate to view the published post (alias)
  viewSubmission(submission: any) {
    if (submission.slug) {
      this.viewPost(submission.slug);
    } else {
      this.router.navigate(['/read', submission._id]);
    }
  }

  // Navigate to view the published post
  viewPost(slug: string) {
    this.router.navigate(['/post', slug]);
  }

  // Note: Since we're doing server-side pagination, filtering is handled server-side
  // For client-side filtering within the current page:
  get legacyFilteredSubmissions() {
    let filtered = this.publishedSubmissions;

    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.title.toLowerCase().includes(search) ||
        sub.username.toLowerCase().includes(search) ||
        (sub.description && sub.description.toLowerCase().includes(search))
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(sub => sub.submissionType === this.selectedType);
    }

    return filtered;
  }

  // Apply filters and reset to first page
  applyFilters() {
    this.currentPage = 1;
    this.loadPublishedSubmissions();
  }

  // Get unique submission types for filter
  get submissionTypes() {
    const typesSet = new Set(this.publishedSubmissions.map(sub => sub.submissionType));
    const types = Array.from(typesSet);
    return types.sort();
  }

  // Get current page info for display
  getCurrentPageInfo() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
    return { start, end, total: this.totalCount };
  }

  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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

  // Refresh the submissions list
  refreshList() {
    this.currentPage = 1;
    this.loadPublishedSubmissions();
  }

  // Handler for admin page header refresh
  onRefresh() {
    this.refreshList();
  }

  // Pagination methods
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPublishedSubmissions();
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

  // Handle card click for published content
  onContentCardClick(content: any) {
    // For admin interface, navigate to edit the post
    this.editPublishedPost(content._id || '');
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

  // Clean HTML from description
  getCleanDescription(submission: any): string {
    return this.htmlSanitizer.getCleanDescription(
      submission?.excerpt, 
      submission?.description, 
      'No description available'
    );
  }

  // Get author name with fallback
  getAuthorName(submission: any): string {
    // Prioritize actual names over usernames for better display
    const name = submission.authorName || 
                 submission.author?.name || 
                 submission.submitterName || 
                 submission.userId?.name ||
                 submission.username || 
                 submission.author?.username || 
                 submission.userId?.username ||
                 submission.submitterEmail ||
                 submission.author?.email ||
                 submission.userId?.email ||
                 submission.email;
    
    // If we got an email address, try to extract a more readable name
    if (name && name.includes('@')) {
      // Extract the part before @ and make it more readable
      const emailPart = name.split('@')[0];
      // Replace dots and underscores with spaces, capitalize first letter
      return emailPart
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return name || 'Unknown Author';
  }

  // Truncate description for display
  getTruncatedDescription(submission: any, maxLength: number = 100): string {
    const cleanDesc = this.getCleanDescription(submission);
    return this.htmlSanitizer.truncateText(cleanDesc, maxLength);
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

  calculateStats() {
    // Simplify stats to a single Total metric per tab
    this.stats = [
      {
        label: 'Total',
        value: this.totalCount.toLocaleString(),
        color: '#3b82f6'
      }
    ];
  }

  onTablePageChange(page: number) {
    this.currentPage = page;
    this.loadPublishedSubmissions();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentFilters.sortBy = event.column;
    this.currentFilters.order = event.direction;
    this.currentPage = 1; // Reset to first page when sorting
    this.loadPublishedSubmissions(); // Reload data with new sorting
  }

  trackBySubmissionId(index: number, submission: any): string {
    return submission._id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadPublishedSubmissions(); // Reload data with server-side filtering
  }

  // Feature content (mark as featured)
  featureContent(contentId: string, title: string) {
    if (!confirm(`Are you sure you want to mark "${title}" as featured? This will highlight it on the platform.`)) {
      return;
    }

    this.backendService.featureContent(contentId).subscribe({
      next: (response) => {
        this.showSuccess('Content marked as featured successfully');
        // Update the local state
        const content = this.publishedSubmissions.find(sub => sub._id === contentId);
        if (content) {
          content.isFeatured = true;
          content.featuredAt = new Date().toISOString();
        }
      },
      error: (err) => {
        this.showError('Failed to feature content: ' + (err.error?.message || err.message));
      }
    });
  }

  // Unfeature content (remove featured status)
  unfeatureContent(contentId: string, title: string) {
    if (!confirm(`Are you sure you want to remove featured status from "${title}"?`)) {
      return;
    }

    this.backendService.unfeatureContent(contentId).subscribe({
      next: (response) => {
        this.showSuccess('Featured status removed successfully');
        // Update the local state
        const content = this.publishedSubmissions.find(sub => sub._id === contentId);
        if (content) {
          content.isFeatured = false;
          content.featuredAt = null;
        }
      },
      error: (err) => {
        this.showError('Failed to unfeature content: ' + (err.error?.message || err.message));
      }
    });
  }

  // Load users for author reassignment
  loadUsers() {
    this.backendService.getUsers({}).subscribe({
      next: (response: any) => {
        this.users = response.users || response.data || [];
      },
      error: (err: any) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  // Selection management
  onSelectionChange(selectedItems: any[]) {
    this.selectedSubmissionsArray = selectedItems;
    this.selectedSubmissions.clear();
    selectedItems.forEach(item => this.selectedSubmissions.add(item._id));
    this.showBulkActions = this.selectedSubmissions.size > 0;
  }

  clearSelection() {
    this.selectedSubmissions.clear();
    this.selectedSubmissionsArray = [];
    this.showBulkActions = false;
    this.bulkSelectedUserId = '';
  }

  // Bulk author reassignment
  bulkReassignUser() {
    if (!this.bulkSelectedUserId || this.selectedSubmissions.size === 0) {
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
      next: (response: any) => {
        this.showMessage(
          `Successfully reassigned ${this.selectedSubmissions.size} submission(s) to ${selectedUser?.name || 'selected user'}`,
          'success'
        );
        this.clearSelection();
        this.loadPublishedSubmissions();
        this.bulkActionLoading = false;
      },
      error: (err: any) => {
        this.showMessage(err.error?.message || 'Failed to reassign submissions', 'error');
        this.bulkActionLoading = false;
      }
    });
  }

  // Get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const jwtToken = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    });
  }

  // Show message helper
  showMessage(text: string, type: 'success' | 'error' | 'info') {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  // User search handler
  private searchTimeout: any;
  onUserSearch(searchTerm: string) {
    console.log('🔍 User search triggered with term:', searchTerm);
    
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // If search term is empty, reset to initial users
    if (!searchTerm.trim()) {
      // Reload initial users
      this.loadUsers();
      return;
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performUserSearch(searchTerm);
    }, 300);
  }

  private performUserSearch(searchTerm: string) {
    console.log('📡 Performing API search for:', searchTerm);
    
    const headers = this.getAuthHeaders();
    const url = `${environment.apiBaseUrl}${API_ENDPOINTS.USERS_NESTED.SEARCH}?q=${encodeURIComponent(searchTerm)}&limit=50`;
    console.log('🌐 API URL:', url);

    this.http.get(url, { headers }).subscribe({
      next: (res: any) => {
        console.log('✅ User search results:', res);
        this.users = (res.users || []).map((user: any) => ({
          _id: user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email || 'No email'
        }));
        console.log('🎯 Updated users count:', this.users.length);
      },
      error: (err) => {
        console.error('❌ User search error:', err);
        console.error('❌ Full error:', JSON.stringify(err, null, 2));
        // Keep existing users on error
      }
    });
  }

  // Navigate to review interface for a submission
  reviewSubmission(submission: any) {
    // submission can be an object or id
    const id = typeof submission === 'string' ? submission : submission._id;
    this.router.navigate(['/review-submission', id]);
  }

  // Move an accepted submission back to review (pending_review)
  backToReview(submissionId: string, title: string) {
    if (!confirm(`Move "${title}" back to review? This will set the submission status to Under Review.`)) {
      return;
    }

    this.backendService.updateSubmissionStatus(submissionId, SUBMISSION_STATUS.PENDING_REVIEW).subscribe({
      next: (res:any) => {
        this.showSuccess('Submission moved back to review');
        // Update local state if present
        const sub = this.publishedSubmissions.find(s => s._id === submissionId);
        if (sub) sub.status = SUBMISSION_STATUS.PENDING_REVIEW;
      },
      error: (err:any) => {
        this.showError('Failed to move submission back to review');
      }
    });
  }

}
