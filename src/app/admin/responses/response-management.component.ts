import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { Submission } from '../../models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-response-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './response-management.component.html',
  styleUrl: './response-management.component.css'
})
export class ResponseManagementComponent implements OnInit, OnDestroy {
  activeSubTab: 'grievances' | 'writing-programs' | 'applications' = 'grievances';
  
  // Grievance data
  grievances: Submission[] = [];
  grievancesLoading = false;
  grievancesError = '';
  
  // Writing program data  
  writingPrograms: any[] = [];
  programsLoading = false;
  programsError = '';
  
  // Applications data
  applications: Submission[] = [];
  applicationsLoading = false;
  applicationsError = '';
  
  // Pagination
  grievancesPagination = { page: 1, limit: 20, total: 0, pages: 0 };
  applicationsPagination = { page: 1, limit: 20, total: 0, pages: 0 };
  
  // Filters
  filterForm!: FormGroup;
  
  private destroy$ = new Subject<void>();

  constructor(
    private backendService: BackendService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initFilterForm();
  }

  ngOnInit(): void {
    this.loadGrievances();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      status: ['all'],
      sortBy: ['createdAt'],
      sortOrder: ['desc']
    });

    // Watch for filter changes
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  setActiveSubTab(tab: 'grievances' | 'writing-programs' | 'applications'): void {
    this.activeSubTab = tab;
    
    switch (tab) {
      case 'grievances':
        if (this.grievances.length === 0) {
          this.loadGrievances();
        }
        break;
      case 'writing-programs':
        if (this.writingPrograms.length === 0) {
          this.loadWritingPrograms();
        }
        break;
      case 'applications':
        if (this.applications.length === 0) {
          this.loadApplications();
        }
        break;
    }
  }

  loadGrievances(): void {
    this.grievancesLoading = true;
    this.grievancesError = '';

    const options = {
      page: this.grievancesPagination.page,
      limit: this.grievancesPagination.limit,
      status: this.filterForm.get('status')?.value === 'all' ? undefined : this.filterForm.get('status')?.value,
      sortBy: this.filterForm.get('sortBy')?.value,
      sortOrder: this.filterForm.get('sortOrder')?.value
    };

    this.backendService.getGrievanceSubmissions(options)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.grievances = response.submissions || [];
          if (response.pagination) {
            this.grievancesPagination = { ...this.grievancesPagination, ...response.pagination };
          }
          this.grievancesLoading = false;
        },
        error: (error) => {
          console.error('Error loading grievances:', error);
          this.grievancesError = 'Failed to load grievances';
          this.grievancesLoading = false;
        }
      });
  }

  loadWritingPrograms(): void {
    this.programsLoading = true;
    this.programsError = '';

    this.backendService.getAdminWritingPrograms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.writingPrograms = response.programs || [];
          this.programsLoading = false;
        },
        error: (error) => {
          console.error('Error loading writing programs:', error);
          this.programsError = 'Failed to load writing programs';
          this.programsLoading = false;
        }
      });
  }

  loadApplications(): void {
    this.applicationsLoading = true;
    this.applicationsError = '';

    const options = {
      page: this.applicationsPagination.page,
      limit: this.applicationsPagination.limit,
      status: this.filterForm.get('status')?.value === 'all' ? undefined : this.filterForm.get('status')?.value,
      sortBy: this.filterForm.get('sortBy')?.value,
      sortOrder: this.filterForm.get('sortOrder')?.value
    };

    this.backendService.getWritingProgramApplications(options)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applications = response.submissions || [];
          if (response.pagination) {
            this.applicationsPagination = { ...this.applicationsPagination, ...response.pagination };
          }
          this.applicationsLoading = false;
        },
        error: (error) => {
          console.error('Error loading applications:', error);
          this.applicationsError = 'Failed to load applications';
          this.applicationsLoading = false;
        }
      });
  }

  applyFilters(): void {
    // Reset pagination to first page
    this.grievancesPagination.page = 1;
    this.applicationsPagination.page = 1;

    // Reload current tab data
    switch (this.activeSubTab) {
      case 'grievances':
        this.loadGrievances();
        break;
      case 'applications':
        this.loadApplications();
        break;
    }
  }

  goToPage(page: number, type: 'grievances' | 'applications'): void {
    if (type === 'grievances') {
      if (page >= 1 && page <= this.grievancesPagination.pages && page !== this.grievancesPagination.page) {
        this.grievancesPagination.page = page;
        this.loadGrievances();
      }
    } else {
      if (page >= 1 && page <= this.applicationsPagination.pages && page !== this.applicationsPagination.page) {
        this.applicationsPagination.page = page;
        this.loadApplications();
      }
    }
  }

  getPaginationPages(pagination: any): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (pagination.pages <= maxVisiblePages) {
      for (let i = 1; i <= pagination.pages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
      const end = Math.min(pagination.pages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  updateProgramStatus(programId: string, status: string): void {
    this.backendService.updateWritingProgramStatus(programId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update local data
          const program = this.writingPrograms.find(p => p._id === programId);
          if (program) {
            program.status = status;
          }
        },
        error: (error) => {
          console.error('Error updating program status:', error);
        }
      });
  }

  viewSubmissionDetails(submissionId: string): void {
    // TODO: Implement submission details modal or navigation
    console.log('View submission details:', submissionId);
  }

  respondToSubmission(submissionId: string): void {
    // TODO: Implement response modal or navigation
    console.log('Respond to submission:', submissionId);
  }

  truncateText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  createProgram(): void {
    this.router.navigate(['/create-program']);
  }
}