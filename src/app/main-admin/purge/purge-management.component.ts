import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { Submission } from '../../models/submission.model';
import { AuthorUtils } from '../../models/author.model';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';
import { ThemingService } from '../../services/theming.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  SUBMISSION_BADGE_CONFIG
} from '../../shared/components';

@Component({
  selector: 'app-purge-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TitleCasePipe, AdminPageHeaderComponent, MatTabsModule, MatButtonModule, DataTableComponent],
  templateUrl: './purge-management.component.html',
  styleUrl: './purge-management.component.css',
})
export class PurgeManagementComponent implements OnInit {
  selectedTabIndex = 0;

  draftSubmissions: Submission[] = [];
  rejectedSubmissions: Submission[] = [];
  selectedDrafts: Submission[] = [];
  selectedRejected: Submission[] = [];
  loadingDrafts = false;
  loadingRejected = false;

  badgeConfig = SUBMISSION_BADGE_CONFIG;

  draftColumns: TableColumn[] = [
    { key: 'title', label: 'Title', type: 'custom', width: '35%', sortable: true },
    { key: 'author', label: 'Author', type: 'custom', width: '20%', sortable: false },
    { key: 'submissionType', label: 'Type', type: 'badge', width: '15%', sortable: true },
    { key: 'createdAt', label: 'Created', type: 'date', width: '15%', sortable: true },
    { key: 'updatedAt', label: 'Updated', type: 'date', width: '15%', sortable: true },
  ];

  rejectedColumns: TableColumn[] = [
    { key: 'title', label: 'Title', type: 'custom', width: '30%', sortable: true },
    { key: 'author', label: 'Author', type: 'custom', width: '20%', sortable: false },
    { key: 'submissionType', label: 'Type', type: 'badge', width: '15%', sortable: true },
    { key: 'reviewedAt', label: 'Rejected At', type: 'date', width: '15%', sortable: true },
    { key: 'reviewedBy', label: 'Reviewed By', type: 'custom', width: '20%', sortable: false },
  ];

  draftActions: TableAction[] = [
    {
      label: 'View',
      color: 'primary',
      handler: (s: Submission) => { void this.viewSubmissionDetails(s); }
    },
    {
      label: 'Delete',
      color: 'danger',
      handler: (s: Submission) => { void this.deleteDraftSubmission(s._id); }
    }
  ];

  rejectedActions: TableAction[] = [
    {
      label: 'View',
      color: 'primary',
      handler: (s: Submission) => { void this.viewSubmissionDetails(s); }
    },
    {
      label: 'Delete',
      color: 'danger',
      handler: (s: Submission) => { void this.deleteRejectedSubmission(s._id); }
    }
  ];

  // Detail view state
  showDetailModal = false;
  selectedSubmission: Submission | null = null;
  loadingSubmissionDetails = false;

  constructor(private readonly backendService: BackendService, public themingService: ThemingService) {}

  onTabChange(index: number) {
    this.selectedTabIndex = index;
  }

  ngOnInit() {
    this.loadDraftSubmissions();
    this.loadRejectedSubmissions();
  }

  refreshData() {
    this.loadDraftSubmissions();
    this.loadRejectedSubmissions();
  }

  async loadDraftSubmissions() {
    this.loadingDrafts = true;
    try {
      const response: any = await this.backendService.getSubmissions({
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
      const response: any = await this.backendService.getSubmissions({
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

  onDraftSelectionChange(selected: Submission[]) {
    this.selectedDrafts = selected;
  }

  onRejectedSelectionChange(selected: Submission[]) {
    this.selectedRejected = selected;
  }

  async deleteSelectedDrafts() {
    if (this.selectedDrafts.length === 0) return;
    const count = this.selectedDrafts.length;
    if (!confirm(`Are you sure you want to delete ${count} draft submissions? This action cannot be undone.`)) return;
    try {
      for (const s of this.selectedDrafts) {
        await this.backendService.deleteSubmission(s._id).toPromise();
      }
      const ids = this.selectedDrafts.map(s => s._id);
      this.draftSubmissions = this.draftSubmissions.filter(s => !ids.includes(s._id));
      this.selectedDrafts = [];
      alert(`Successfully deleted ${count} draft submissions.`);
    } catch (error) {
      console.error('Error deleting draft submissions:', error);
      alert('Failed to delete some draft submissions.');
    }
  }

  async deleteDraftSubmission(submissionId: string) {
    if (!confirm('Are you sure you want to delete this draft submission? This action cannot be undone.')) return;
    try {
      await this.backendService.deleteSubmission(submissionId).toPromise();
      this.draftSubmissions = this.draftSubmissions.filter(s => s._id !== submissionId);
      this.selectedDrafts = this.selectedDrafts.filter(s => s._id !== submissionId);
      if (this.selectedSubmission?._id === submissionId) this.closeDetailModal();
    } catch (error) {
      console.error('Error deleting draft submission:', error);
      alert('Failed to delete draft submission.');
    }
  }

  async deleteSelectedRejected() {
    if (this.selectedRejected.length === 0) return;
    const count = this.selectedRejected.length;
    if (!confirm(`Are you sure you want to delete ${count} rejected submissions? This action cannot be undone.`)) return;
    try {
      for (const s of this.selectedRejected) {
        await this.backendService.deleteSubmission(s._id).toPromise();
      }
      const ids = this.selectedRejected.map(s => s._id);
      this.rejectedSubmissions = this.rejectedSubmissions.filter(s => !ids.includes(s._id));
      this.selectedRejected = [];
      alert(`Successfully deleted ${count} rejected submissions.`);
    } catch (error) {
      console.error('Error deleting rejected submissions:', error);
      alert('Failed to delete some rejected submissions.');
    }
  }

  async deleteRejectedSubmission(submissionId: string) {
    if (!confirm('Are you sure you want to delete this rejected submission? This action cannot be undone.')) return;
    try {
      await this.backendService.deleteSubmission(submissionId).toPromise();
      this.rejectedSubmissions = this.rejectedSubmissions.filter(s => s._id !== submissionId);
      this.selectedRejected = this.selectedRejected.filter(s => s._id !== submissionId);
      if (this.selectedSubmission?._id === submissionId) this.closeDetailModal();
    } catch (error) {
      console.error('Error deleting rejected submission:', error);
      alert('Failed to delete rejected submission.');
    }
  }

  getAuthorName(submission: Submission): string {
    return submission.author?.name || 'Unknown';
  }

  async viewSubmissionDetails(submission: Submission) {
    this.selectedSubmission = submission;
    this.showDetailModal = true;
    if (!submission.contents || submission.contents.length === 0) {
      this.loadingSubmissionDetails = true;
      try {
        const response: any = await this.backendService.getSubmissionWithContents(submission._id).toPromise();
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

  trackBySubmissionId(index: number, submission: Submission) {
    return submission._id;
  }
}
