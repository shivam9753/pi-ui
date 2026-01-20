import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table.component';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';
import { BackendService } from '../../services/backend.service';
import { ModalService } from '../../services/modal.service';

interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  status: string;
  submittedAt: string;
  createdAt?: string;
  publishedWorkId?: string;
  excerpt?: string;
  content?: string;
  revisionNotes?: string; // optional field for revision notes
}

@Component({
  selector: 'app-submissions-list',
  templateUrl: './submissions-list.component.html',
  imports: [CommonModule, RouterModule, DataTableComponent, BadgeLabelComponent],
  standalone: true
})
export class SubmissionsListComponent implements OnInit {
  submissions = signal<Submission[]>([]);
  submissionsLoading = signal(false);
  isLoading = signal(true);
  submissionsPage = signal(0);
  submissionsLimit = signal(10);
  totalSubmissions = signal(0);
  hasMoreSubmissions = signal(true);

  // filter state
  selectedStatuses = signal<string[]>([]);
  submissionsFilter = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly backendService: BackendService,
    private readonly modalService: ModalService // injected modal service
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const statusesParam = params['statuses'] || params['status'];
      const statuses = statusesParam ? String(statusesParam).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      this.selectedStatuses.set(statuses);
      this.loadSubmissions(0);
    });
  }

  async loadSubmissions(page: number = 0) {
    try {
      this.submissionsLoading.set(true);
      this.submissionsPage.set(page);

      const options: any = {
        limit: this.submissionsLimit(),
        skip: page * this.submissionsLimit()
      };

      // If route requested specific statuses, pass them to backend as 'status' param
      const sel = this.selectedStatuses();
      if (sel && sel.length > 0) {
        options.status = sel.join(',');
      }

      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          const subs = response.submissions || [];
          this.submissions.set(subs);
          this.totalSubmissions.set(response.total || subs.length);
          this.hasMoreSubmissions.set(subs.length >= this.submissionsLimit());
          this.submissionsLoading.set(false);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          console.error('Error loading submissions (list page):', err);
          this.submissions.set([]);
          this.submissionsLoading.set(false);
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Exception in loadSubmissions (list page):', error);
      this.submissions.set([]);
      this.submissionsLoading.set(false);
      this.isLoading.set(false);
    }
  }

  // Provide a filtered view based on query param
  getFilteredSubmissions() {
    let subs = [...this.submissions()];
    const sel = this.selectedStatuses() || [];
    if (sel.length > 0) {
      subs = subs.filter(s => sel.includes(s.status));
    }

    const filter = this.submissionsFilter().toLowerCase();
    if (filter) {
      subs = subs.filter(s => (s.title || '').toLowerCase().includes(filter) || (s.submissionType || '').toLowerCase().includes(filter));
    }

    // Sort newest by default
    subs.sort((a, b) => new Date(b.createdAt || b.submittedAt).getTime() - new Date(a.createdAt || a.submittedAt).getTime());

    return subs;
  }

  // Table config
  tableColumns: TableColumn[] = [
    { key: 'title', label: 'Title', sortable: true, type: 'text', width: '40%' },
    { key: 'createdAt', label: 'Created', sortable: true, type: 'date', width: '15%' },
    { key: 'submissionType', label: 'Type', sortable: false, type: 'badge', width: '15%' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge', width: '20%' },
    // Notes action column only (icon that opens modal)
    { key: 'notesAction', label: 'Notes', type: 'custom', width: '8%', mobileHidden: false }
  ];

  get tableActions(): TableAction[] {
    const sel = this.selectedStatuses();

    // If the list is specifically showing only 'needs_revision', show only the Edit action
    if (sel && sel.length === 1 && sel.includes('needs_revision')) {
      return [
        { label: 'Edit', handler: (item: any) => this.editSubmission(item), color: 'secondary', isMainAction: true }
      ];
    }

    const actions: TableAction[] = [
      { label: 'View', handler: (item: any) => this.viewSubmission(item), color: 'primary', isMainAction: true }
    ];

    // If any of the selected statuses allow editing, include Edit action
    if (sel.includes('needs_revision')) {
      actions.push({ label: 'Edit', handler: (item: any) => this.editSubmission(item), color: 'secondary' });
    }

    return actions;
  }

  get paginationConfig() {
    const total = this.totalSubmissions() || 0;
    const pageSize = this.submissionsLimit();
    const currentPage = this.submissionsPage() + 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { currentPage, totalPages, pageSize, totalItems: total, hasMore: this.hasMoreSubmissions() };
  }

  onDataTablePageChange(page: number) {
    const idx = Math.max(0, page - 1);
    this.loadSubmissions(idx);
  }

  viewSubmission(submission: Submission) {
    if (submission.status === 'published' && submission.publishedWorkId) {
      this.router.navigate(['/read', submission.publishedWorkId]);
    } else {
      this.router.navigate(['/edit-submission', submission._id], { queryParams: { mode: 'view' } });
    }
  }

  editSubmission(submission: Submission) {
    // Navigate to edit page without passing the revision note in query params
    this.router.navigate(['/edit-submission', submission._id], { queryParams: { mode: 'edit' } });
  }

  setSearch(value: string) {
    this.submissionsFilter.set(value || '');
  }

  openRevisionNotes(submission: Submission) {
    const note = submission.revisionNotes || 'No revision notes available.';
    // Use modal service to show the notes
    this.modalService.open({
      title: 'Revision Notes',
      message: note,
      showCloseButton: true,
      buttons: [
        {
          label: 'Close',
          action: () => {
            this.modalService.close();
          },
          variant: 'secondary'
        }
      ]
    });
  }

  // Friendly label for a backend status key
  getFormattedStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending_review': 'Pending Review',
      'in_progress': 'In Review',
      'resubmitted': 'Resubmitted',
      'shortlisted': 'Shortlisted',
      'accepted': 'Ready to Publish',
      'published': 'Published',
      'rejected': 'Rejected',
      'needs_revision': 'Needs Revision',
      'draft': 'Draft'
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
}
