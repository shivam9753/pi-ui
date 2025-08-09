import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface PurgeableSubmission {
  _id: string;
  title: string;
  status: string;
  author: string;
  submittedAt: string;
  eligibleSince: string;
  daysSinceEligible: number;
}

interface PurgeStats {
  totalPurgeable: number;
  byStatus: Array<{
    _id: string;
    count: number;
    oldestEligible: string;
    newestEligible: string;
  }>;
  lastUpdated: string;
}

interface PurgePreview {
  submissionsToDelete: number;
  contentToDelete: number;
  reviewsToDelete: number;
  affectedUsers: string[];
  details: Array<{
    submissionId: string;
    title: string;
    author: string;
    contentPieces: number;
    reviews: number;
    status: string;
  }>;
}

@Component({
  selector: 'app-purge-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="max-w-7xl mx-auto">
      
      <!-- Header -->
      <div class="mb-8">
        <div class="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Data Purge Management</h1>
            <p class="mt-2 text-sm text-gray-700">
              Manage storage by purging rejected and spam submissions older than specified periods.
              <span class="font-medium text-red-600">⚠️ Purging permanently deletes data.</span>
            </p>
          </div>
          <div class="mt-4 sm:mt-0">
            <button 
              (click)="loadStats()" 
              [disabled]="loading"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              <svg *ngIf="!loading" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <div *ngIf="loading" class="w-4 h-4 mr-2 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
              Refresh Stats
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" *ngIf="stats">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Purgeable</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ stats.totalPurgeable | number }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg" *ngFor="let statusStat of stats.byStatus.slice(0, 2)">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-red-100 text-red-800': statusStat._id === 'rejected',
                        'bg-yellow-100 text-yellow-800': statusStat._id === 'spam',
                        'bg-gray-100 text-gray-800': statusStat._id !== 'rejected' && statusStat._id !== 'spam'
                      }">
                  {{ statusStat._id | titlecase }}
                </span>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Count</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ statusStat.count | number }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Purge Filters</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label for="olderThanDays" class="block text-sm font-medium text-gray-700">Older than (days)</label>
              <select id="olderThanDays" 
                      [(ngModel)]="filters.olderThanDays"
                      (ngModelChange)="loadPurgeableSubmissions()"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm">
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="120">120 days (4 months)</option>
                <option value="180">180 days (6 months)</option>
              </select>
            </div>

            <div>
              <label for="statusFilter" class="block text-sm font-medium text-gray-700">Status</label>
              <select id="statusFilter" 
                      [(ngModel)]="filters.status"
                      (ngModelChange)="loadPurgeableSubmissions()"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm">
                <option value="">All statuses</option>
                <option value="rejected">Rejected</option>
                <option value="spam">Spam</option>
              </select>
            </div>

            <div>
              <label for="limit" class="block text-sm font-medium text-gray-700">Results per page</label>
              <select id="limit" 
                      [(ngModel)]="filters.limit"
                      (ngModelChange)="loadPurgeableSubmissions()"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm">
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div class="flex items-end">
              <button 
                (click)="loadPurgeableSubmissions()" 
                [disabled]="loadingSubmissions"
                class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50">
                <svg *ngIf="!loadingSubmissions" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <div *ngIf="loadingSubmissions" class="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Selection Controls -->
      <div class="bg-white shadow rounded-lg mb-6" *ngIf="purgeableSubmissions.length > 0">
        <div class="px-4 py-5 sm:p-6">
          <div class="sm:flex sm:items-center sm:justify-between">
            <div class="flex items-center space-x-4">
              <div class="flex items-center">
                <input 
                  id="selectAll" 
                  type="checkbox" 
                  [checked]="selectedSubmissions.length === purgeableSubmissions.length && purgeableSubmissions.length > 0"
                  [indeterminate]="selectedSubmissions.length > 0 && selectedSubmissions.length < purgeableSubmissions.length"
                  (change)="toggleSelectAll($event)"
                  class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                <label for="selectAll" class="ml-2 text-sm text-gray-700">
                  Select all ({{ selectedSubmissions.length }} selected)
                </label>
              </div>
            </div>

            <div class="mt-4 sm:mt-0 flex space-x-3">
              <button 
                (click)="previewPurge()" 
                [disabled]="selectedSubmissions.length === 0 || previewing"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                <svg *ngIf="!previewing" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <div *ngIf="previewing" class="w-4 h-4 mr-2 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                Preview Purge
              </button>
              
              <button 
                (click)="openPurgeConfirmation()" 
                [disabled]="selectedSubmissions.length === 0"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Purge Selected ({{ selectedSubmissions.length }})
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Results -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" *ngIf="preview">
        <h4 class="text-sm font-medium text-blue-900 mb-2">Purge Preview</h4>
        <div class="text-sm text-blue-800">
          <p><strong>{{ preview.submissionsToDelete }}</strong> submissions will be deleted</p>
          <p><strong>{{ preview.contentToDelete }}</strong> content pieces will be deleted</p>
          <p><strong>{{ preview.reviewsToDelete }}</strong> reviews will be deleted</p>
          <p><strong>{{ preview.affectedUsers.length }}</strong> users affected: {{ preview.affectedUsers.join(', ') }}</p>
        </div>
      </div>

      <!-- Submissions Table -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg" *ngIf="purgeableSubmissions.length > 0">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Purgeable Submissions ({{ pagination?.total | number }})
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    [checked]="selectedSubmissions.length === purgeableSubmissions.length && purgeableSubmissions.length > 0"
                    [indeterminate]="selectedSubmissions.length > 0 && selectedSubmissions.length < purgeableSubmissions.length"
                    (change)="toggleSelectAll($event)"
                    class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Eligible</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let submission of purgeableSubmissions; trackBy: trackBySubmissionId" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    [value]="submission._id"
                    [checked]="selectedSubmissions.includes(submission._id)"
                    (change)="toggleSelection(submission._id, $event)"
                    class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900 max-w-xs truncate" [title]="submission.title">
                    {{ submission.title }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.author }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-red-100 text-red-800': submission.status === 'rejected',
                          'bg-yellow-100 text-yellow-800': submission.status === 'spam',
                          'bg-gray-100 text-gray-800': submission.status !== 'rejected' && submission.status !== 'spam'
                        }">
                    {{ submission.status | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ submission.daysSinceEligible }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.submittedAt | date:'MMM d, y' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6" *ngIf="pagination && pagination.total > pagination.limit">
          <div class="flex-1 flex justify-between sm:hidden">
            <button 
              (click)="previousPage()" 
              [disabled]="pagination.skip === 0"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              Previous
            </button>
            <button 
              (click)="nextPage()" 
              [disabled]="!pagination.hasMore"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">{{ pagination.skip + 1 }}</span> to 
                <span class="font-medium">{{ Math.min(pagination.skip + pagination.limit, pagination.total) }}</span> of 
                <span class="font-medium">{{ pagination.total }}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button 
                  (click)="previousPage()" 
                  [disabled]="pagination.skip === 0"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Previous
                </button>
                <button 
                  (click)="nextPage()" 
                  [disabled]="!pagination.hasMore"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="text-center py-12" *ngIf="purgeableSubmissions.length === 0 && !loadingSubmissions">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No submissions eligible for purging</h3>
        <p class="mt-1 text-sm text-gray-500">Adjust your filters to see purgeable submissions.</p>
      </div>

      <!-- Loading State -->
      <div class="text-center py-12" *ngIf="loadingSubmissions">
        <div class="w-8 h-8 mx-auto border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
        <p class="mt-2 text-sm text-gray-500">Loading purgeable submissions...</p>
      </div>

    </div>

    <!-- Purge Confirmation Modal -->
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" *ngIf="showPurgeConfirmation">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-center mx-auto">
            <svg class="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <div class="mt-2 px-7 py-3">
            <h3 class="text-lg font-medium text-gray-900 text-center">Confirm Permanent Deletion</h3>
            <p class="text-sm text-gray-500 mt-2 text-center">
              You are about to permanently delete <strong>{{ selectedSubmissions.length }}</strong> submissions and all associated data.
              This action cannot be undone.
            </p>
            <div class="mt-4 p-4 bg-red-50 rounded-md">
              <h4 class="text-sm font-medium text-red-900">This will delete:</h4>
              <ul class="mt-2 text-sm text-red-800">
                <li *ngIf="preview">• {{ preview.submissionsToDelete }} submissions</li>
                <li *ngIf="preview">• {{ preview.contentToDelete }} content pieces</li>
                <li *ngIf="preview">• {{ preview.reviewsToDelete }} reviews</li>
              </ul>
            </div>
            <div class="mt-4">
              <label for="confirmText" class="block text-sm font-medium text-gray-700">
                Type "PURGE" to confirm:
              </label>
              <input 
                id="confirmText"
                type="text" 
                [(ngModel)]="purgeConfirmText"
                placeholder="Type PURGE to confirm"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm">
            </div>
          </div>
          <div class="flex items-center px-4 py-3 space-x-2">
            <button 
              (click)="closePurgeConfirmation()"
              class="flex-1 px-4 py-2 bg-white text-gray-700 text-base font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">
              Cancel
            </button>
            <button 
              (click)="executePurge()"
              [disabled]="purgeConfirmText !== 'PURGE' || purging"
              class="flex-1 px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">
              <span *ngIf="!purging">Delete Forever</span>
              <div *ngIf="purging" class="flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Purging...
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PurgeManagementComponent implements OnInit {
  stats: PurgeStats | null = null;
  purgeableSubmissions: PurgeableSubmission[] = [];
  selectedSubmissions: string[] = [];
  preview: PurgePreview | null = null;
  pagination: any = null;

  loading = false;
  loadingSubmissions = false;
  previewing = false;
  purging = false;

  showPurgeConfirmation = false;
  purgeConfirmText = '';

  filters = {
    olderThanDays: 120,
    status: '',
    limit: 50,
    skip: 0
  };

  Math = Math;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadStats();
    this.loadPurgeableSubmissions();
  }

  async loadStats() {
    this.loading = true;
    try {
      const response = await this.apiService.get<PurgeStats>('/purge/stats').toPromise();
      this.stats = response || null;
    } catch (error) {
      console.error('Error loading purge stats:', error);
      this.stats = null;
    } finally {
      this.loading = false;
    }
  }

  async loadPurgeableSubmissions() {
    this.loadingSubmissions = true;
    try {
      const params = {
        olderThanDays: this.filters.olderThanDays.toString(),
        limit: this.filters.limit.toString(),
        skip: this.filters.skip.toString()
      };

      if (this.filters.status) {
        (params as any).status = this.filters.status;
      }

      const response = await this.apiService.get<any>('/purge/submissions', params).toPromise();
      this.purgeableSubmissions = response?.submissions || [];
      this.pagination = response?.pagination || null;
      
      // Clear selections when reloading
      this.selectedSubmissions = [];
      this.preview = null;
    } catch (error) {
      console.error('Error loading purgeable submissions:', error);
      this.purgeableSubmissions = [];
      this.pagination = null;
    } finally {
      this.loadingSubmissions = false;
    }
  }

  toggleSelection(submissionId: string, event: any) {
    if (event.target.checked) {
      this.selectedSubmissions.push(submissionId);
    } else {
      this.selectedSubmissions = this.selectedSubmissions.filter(id => id !== submissionId);
    }
    this.preview = null; // Clear preview when selection changes
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.selectedSubmissions = this.purgeableSubmissions.map(s => s._id);
    } else {
      this.selectedSubmissions = [];
    }
    this.preview = null; // Clear preview when selection changes
  }

  async previewPurge() {
    if (this.selectedSubmissions.length === 0) return;

    this.previewing = true;
    try {
      const response = await this.apiService.post<any>('/purge/preview', {
        submissionIds: this.selectedSubmissions
      }).toPromise();
      this.preview = response?.preview || null;
    } catch (error) {
      console.error('Error generating purge preview:', error);
      this.preview = null;
    } finally {
      this.previewing = false;
    }
  }

  openPurgeConfirmation() {
    this.showPurgeConfirmation = true;
    this.purgeConfirmText = '';
  }

  closePurgeConfirmation() {
    this.showPurgeConfirmation = false;
    this.purgeConfirmText = '';
  }

  async executePurge() {
    if (this.purgeConfirmText !== 'PURGE' || this.selectedSubmissions.length === 0) return;

    this.purging = true;
    try {
      const response = await this.apiService.post<any>('/purge/execute', {
        submissionIds: this.selectedSubmissions,
        confirmPurge: true
      }).toPromise();

      if (response?.success) {
        // Success - reload data
        this.selectedSubmissions = [];
        this.preview = null;
        await this.loadStats();
        await this.loadPurgeableSubmissions();
        
        alert(`Successfully purged ${response?.results?.totalSubmissions || 0} submissions`);
      } else {
        alert('Purge failed: ' + (response?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error executing purge:', error);
      alert('Error executing purge: ' + (error as any)?.error?.message || 'Unknown error');
    } finally {
      this.purging = false;
      this.closePurgeConfirmation();
    }
  }

  trackBySubmissionId(index: number, submission: PurgeableSubmission): string {
    return submission._id;
  }

  nextPage() {
    if (this.pagination && this.pagination.hasMore) {
      this.filters.skip += this.filters.limit;
      this.loadPurgeableSubmissions();
    }
  }

  previousPage() {
    if (this.filters.skip > 0) {
      this.filters.skip = Math.max(0, this.filters.skip - this.filters.limit);
      this.loadPurgeableSubmissions();
    }
  }
}