import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-all-submissions',
  imports: [CommonModule, FormsModule],
  templateUrl: './all-submissions.component.html',
  styleUrl: './all-submissions.component.css'
})
export class AllSubmissionsComponent implements OnInit {
  submissions: any[] = [];
  users: any[] = [];
  loading = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  // Edit mode
  editingSubmission: any = null;
  selectedUserId = '';
  
  // Bulk operations
  selectedSubmissions = new Set<string>();
  allSelected = false;
  showBulkActions = false;
  bulkSelectedUserId = '';
  bulkActionLoading = false;
  
  // Filters
  statusFilter = '';
  typeFilter = '';
  searchText = '';
  
  // Available status and type options for filtering
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'published', label: 'Published' },
    { value: 'needs_revision', label: 'Needs Revision' }
  ];
  
  typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'poem', label: 'Poem' },
    { value: 'story', label: 'Story' },
    { value: 'article', label: 'Article' },
    { value: 'quote', label: 'Quote' },
    { value: 'cinema_essay', label: 'Cinema Essay' }
  ];

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const jwtToken = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
  }

  ngOnInit() {
    this.loadSubmissions();
    this.loadUsers();
  }

  loadSubmissions() {
    this.loading = true;
    const headers = this.getAuthHeaders();
    this.http.get(`${environment.apiBaseUrl}/admin/submissions/all`, { headers }).subscribe({
      next: (res: any) => {
        this.submissions = res.submissions || [];
        this.loading = false;
      },
      error: (err) => {
        this.showMessage('Failed to load submissions', 'error');
        this.loading = false;
      }
    });
  }

  loadUsers() {
    const headers = this.getAuthHeaders();
    this.http.get(`${environment.apiBaseUrl}/admin/users`, { headers }).subscribe({
      next: (res: any) => {
        this.users = res.users || [];
      },
      error: (err) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  startEdit(submission: any) {
    this.editingSubmission = { ...submission };
    this.selectedUserId = submission.userId._id;
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
    this.http.put(`${environment.apiBaseUrl}/admin/submissions/${this.editingSubmission._id}/reassign`, {
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

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'published': return 'bg-purple-100 text-purple-800';
      case 'needs_revision': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  // Bulk selection methods
  toggleAllSelection() {
    this.allSelected = !this.allSelected;
    if (this.allSelected) {
      // Select all filtered submissions
      this.filteredSubmissions.forEach(sub => this.selectedSubmissions.add(sub._id));
    } else {
      this.selectedSubmissions.clear();
    }
    this.updateBulkActionsVisibility();
  }
  
  toggleSubmissionSelection(submissionId: string) {
    if (this.selectedSubmissions.has(submissionId)) {
      this.selectedSubmissions.delete(submissionId);
    } else {
      this.selectedSubmissions.add(submissionId);
    }
    this.updateAllSelectedState();
    this.updateBulkActionsVisibility();
  }
  
  updateAllSelectedState() {
    const filteredIds = this.filteredSubmissions.map(sub => sub._id);
    this.allSelected = filteredIds.length > 0 && filteredIds.every(id => this.selectedSubmissions.has(id));
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
  
  // Filtering
  get filteredSubmissions() {
    return this.submissions.filter(submission => {
      const matchesStatus = !this.statusFilter || submission.status === this.statusFilter;
      const matchesType = !this.typeFilter || submission.submissionType === this.typeFilter;
      
      // Text search - search in title, description, and author name/email
      const matchesSearch = !this.searchText || this.matchesSearchText(submission, this.searchText);
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }
  
  private matchesSearchText(submission: any, searchText: string): boolean {
    const search = searchText.toLowerCase().trim();
    if (!search) return true;
    
    // Search in title
    if (submission.title?.toLowerCase().includes(search)) {
      return true;
    }
    
    // Search in description
    if (submission.description?.toLowerCase().includes(search)) {
      return true;
    }
    
    // Search in author name
    if (submission.userId?.name?.toLowerCase().includes(search)) {
      return true;
    }
    
    // Search in author email
    if (submission.userId?.email?.toLowerCase().includes(search)) {
      return true;
    }
    
    // Search in author username
    if (submission.userId?.username?.toLowerCase().includes(search)) {
      return true;
    }
    
    return false;
  }
  
  onFilterChange() {
    // Clear selections when filters change
    this.clearSelection();
  }
  
  clearAllFilters() {
    this.statusFilter = '';
    this.typeFilter = '';
    this.searchText = '';
    this.onFilterChange();
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
    
    this.http.put(`${environment.apiBaseUrl}/admin/submissions/bulk-reassign`, {
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
  
  // Filter by published status specifically
  filterPublishedSubmissions() {
    this.statusFilter = 'published';
    this.onFilterChange();
  }
}