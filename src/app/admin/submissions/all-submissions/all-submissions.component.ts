import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';


@Component({
  selector: 'app-all-submissions',
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent],
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

  // New methods for mobile-optimized filters
  refreshData(): void {
    this.loadSubmissions();
    this.loadUsers();
  }

}