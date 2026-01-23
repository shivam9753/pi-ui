import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { Submission } from '../../models/submission.model';
import { Author, AuthorUtils } from '../../models/author.model';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';

@Component({
  selector: 'app-purge-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminPageHeaderComponent],
  templateUrl: './purge-management.component.html',
})
export class PurgeManagementComponent implements OnInit {
  activeTab: 'drafts' | 'rejected' = 'drafts';
  
  draftSubmissions: Submission[] = [];
  rejectedSubmissions: Submission[] = [];
  selectedRejected: string[] = [];
  
  loadingDrafts = false;
  loadingRejected = false;
  
  // Detail view state
  showDetailModal = false;
  selectedSubmission: Submission | null = null;
  loadingSubmissionDetails = false;
  
  constructor(private backendService: BackendService) {}

  ngOnInit() {
    this.loadDraftSubmissions();
    this.loadRejectedSubmissions();
  }
  
  setActiveTab(tab: 'drafts' | 'rejected') {
    this.activeTab = tab;
  }
  
  refreshData() {
    this.loadDraftSubmissions();
    this.loadRejectedSubmissions();
  }

  async loadDraftSubmissions() {
    this.loadingDrafts = true;
    try {
      const response = await this.backendService.getSubmissions({
        status: 'draft',
        limit: 100,
        sortBy: 'updatedAt',
        order: 'desc'
      }).toPromise();
      this.draftSubmissions = AuthorUtils.normalizeSubmissionsAuthors(response?.submissions || []);
    } catch (error) {
      console.error('Error loading draft submissions:', error);
      this.draftSubmissions = [];
    } finally {
      this.loadingDrafts = false;
    }
  }

  async loadRejectedSubmissions() {
    this.loadingRejected = true;
    try {
      const response = await this.backendService.getSubmissions({
        status: 'rejected',
        limit: 100,
        sortBy: 'reviewedAt',
        order: 'desc'
      }).toPromise();
      this.rejectedSubmissions = AuthorUtils.normalizeSubmissionsAuthors(response?.submissions || []);
    } catch (error) {
      console.error('Error loading rejected submissions:', error);
      this.rejectedSubmissions = [];
    } finally {
      this.loadingRejected = false;
    }
  }

  toggleRejectedSelection(submissionId: string, event: any) {
    if (event.target.checked) {
      this.selectedRejected.push(submissionId);
    } else {
      this.selectedRejected = this.selectedRejected.filter(id => id !== submissionId);
    }
  }

  toggleSelectAllRejected(event: any) {
    if (event.target.checked) {
      this.selectedRejected = this.rejectedSubmissions.map(s => s._id);
    } else {
      this.selectedRejected = [];
    }
  }

  async deleteDraftSubmission(submissionId: string) {
    if (!confirm('Are you sure you want to delete this draft submission? This action cannot be undone.')) {
      return;
    }
    
    try {
      await this.backendService.deleteSubmission(submissionId).toPromise();
      this.draftSubmissions = this.draftSubmissions.filter(s => s._id !== submissionId);
      alert('Draft submission deleted successfully.');
    } catch (error) {
      console.error('Error deleting draft submission:', error);
      alert('Failed to delete draft submission.');
    }
  }
  
  async deleteSelectedRejected() {
    if (this.selectedRejected.length === 0) return;
    
    const count = this.selectedRejected.length;
    if (!confirm(`Are you sure you want to delete ${count} rejected submissions? This action cannot be undone.`)) {
      return;
    }
    
    try {
      for (const submissionId of this.selectedRejected) {
        await this.backendService.deleteSubmission(submissionId).toPromise();
      }
      
      this.rejectedSubmissions = this.rejectedSubmissions.filter(
        s => !this.selectedRejected.includes(s._id)
      );
      this.selectedRejected = [];
      alert(`Successfully deleted ${count} rejected submissions.`);
    } catch (error) {
      console.error('Error deleting rejected submissions:', error);
      alert('Failed to delete some rejected submissions.');
    }
  }
  
  getAuthorName(submission: Submission): string {
    return submission.author?.name || 'Unknown';
  }
  
  async viewSubmissionDetails(submission: Submission) {
    this.selectedSubmission = submission;
    this.showDetailModal = true;
    
    // Load full submission details with content if not already loaded
    if (!submission.contents || submission.contents.length === 0) {
      this.loadingSubmissionDetails = true;
      try {
        const response = await this.backendService.getSubmissionWithContents(submission._id).toPromise();
        if (response) {
          this.selectedSubmission = { ...submission, contents: response.contents || [] };
        }
      } catch (error) {
        console.error('Error loading submission details:', error);
      } finally {
        this.loadingSubmissionDetails = false;
      }
    }
  }
  
  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedSubmission = null;
    this.loadingSubmissionDetails = false;
  }
  
  async deleteRejectedSubmission(submissionId: string) {
    if (!confirm('Are you sure you want to delete this rejected submission? This action cannot be undone.')) {
      return;
    }
    
    try {
      await this.backendService.deleteSubmission(submissionId).toPromise();
      this.rejectedSubmissions = this.rejectedSubmissions.filter(s => s._id !== submissionId);
      this.selectedRejected = this.selectedRejected.filter(id => id !== submissionId);
      alert('Rejected submission deleted successfully.');
    } catch (error) {
      console.error('Error deleting rejected submission:', error);
      alert('Failed to delete rejected submission.');
    }
  }

  trackBySubmissionId(index: number, submission: Submission) {
    return submission._id;
  }
}