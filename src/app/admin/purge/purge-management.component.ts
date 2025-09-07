import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { Submission } from '../../models/submission.model';
import { Author, AuthorUtils } from '../../models/author.model';

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
            <h1 class="text-2xl font-bold text-gray-900">Submissions Management</h1>
            <p class="mt-2 text-sm text-gray-700">
              View and manage draft and rejected submissions. 
              <span class="font-medium text-red-600">⚠️ Purging permanently deletes data.</span>
            </p>
          </div>
          <div class="mt-4 sm:mt-0">
            <button
              (click)="refreshData()"
              [disabled]="loadingDrafts || loadingRejected"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              @if (!loadingDrafts && !loadingRejected) {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              }
              @if (loadingDrafts || loadingRejected) {
                <div class="w-4 h-4 mr-2 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
              }
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    
      <!-- Tab Navigation -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              (click)="setActiveTab('drafts')"
              [class.border-orange-500]="activeTab === 'drafts'"
              [class.text-orange-600]="activeTab === 'drafts'"
              [class.border-transparent]="activeTab !== 'drafts'"
              [class.text-gray-500]="activeTab !== 'drafts'"
              [class.hover:text-gray-700]="activeTab !== 'drafts'"
              [class.hover:border-gray-300]="activeTab !== 'drafts'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>Draft Submissions</span>
                @if (draftSubmissions.length > 0) {
                  <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{{ draftSubmissions.length }}</span>
                }
              </div>
            </button>
            <button
              (click)="setActiveTab('rejected')"
              [class.border-orange-500]="activeTab === 'rejected'"
              [class.text-orange-600]="activeTab === 'rejected'"
              [class.border-transparent]="activeTab !== 'rejected'"
              [class.text-gray-500]="activeTab !== 'rejected'"
              [class.hover:text-gray-700]="activeTab !== 'rejected'"
              [class.hover:border-gray-300]="activeTab !== 'rejected'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Rejected Submissions</span>
                @if (rejectedSubmissions.length > 0) {
                  <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{{ rejectedSubmissions.length }}</span>
                }
              </div>
            </button>
          </nav>
        </div>
      </div>
    
      <!-- Tab Content -->
      @if (activeTab === 'drafts') {
        <div class="animate-fade-in">
          <!-- Draft Submissions Content -->
          <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Draft Submissions</h3>
              <p class="text-sm text-gray-600 mb-4">
                These are submissions that users have saved as drafts but never submitted for review.
              </p>
              
              <!-- Draft Submissions Table -->
              @if (draftSubmissions.length > 0) {
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      @for (submission of draftSubmissions; track submission._id) {
                        <tr class="hover:bg-gray-50">
                          <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900 max-w-xs truncate" [title]="submission.title">
                              {{ submission.title }}
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ getAuthorName(submission) }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {{ submission.submissionType | titlecase }}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ submission.createdAt | date:'MMM d, y' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ submission.updatedAt | date:'MMM d, y' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div class="flex space-x-2">
                              <button
                                (click)="viewSubmissionDetails(submission)"
                                class="text-blue-600 hover:text-blue-900">
                                View
                              </button>
                              <button
                                (click)="deleteDraftSubmission(submission._id)"
                                class="text-red-600 hover:text-red-900">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No draft submissions found</h3>
                  <p class="mt-1 text-sm text-gray-500">All submissions have been submitted for review.</p>
                </div>
              }
              
              @if (loadingDrafts) {
                <div class="text-center py-8">
                  <div class="w-8 h-8 mx-auto border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <p class="mt-2 text-sm text-gray-500">Loading draft submissions...</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
      
      @if (activeTab === 'rejected') {
        <div class="animate-fade-in">
          <!-- Rejected Submissions Content -->
          <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Rejected Submissions</h3>
              <p class="text-sm text-gray-600 mb-4">
                These are submissions that have been reviewed and rejected. You can delete them permanently.
              </p>
              
              <!-- Rejected Submissions Table -->
              @if (rejectedSubmissions.length > 0) {
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            [checked]="selectedRejected.length === rejectedSubmissions.length && rejectedSubmissions.length > 0"
                            [indeterminate]="selectedRejected.length > 0 && selectedRejected.length < rejectedSubmissions.length"
                            (change)="toggleSelectAllRejected($event)"
                            class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected At</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewed By</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      @for (submission of rejectedSubmissions; track submission._id) {
                        <tr class="hover:bg-gray-50">
                          <td class="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              [value]="submission._id"
                              [checked]="selectedRejected.includes(submission._id)"
                              (change)="toggleRejectedSelection(submission._id, $event)"
                              class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                          </td>
                          <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900 max-w-xs truncate" [title]="submission.title">
                              {{ submission.title }}
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ getAuthorName(submission) }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {{ submission.submissionType | titlecase }}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ submission.reviewedAt | date:'MMM d, y' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ submission.reviewedBy || 'System' }}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              (click)="viewSubmissionDetails(submission)"
                              class="text-blue-600 hover:text-blue-900">
                              View Details
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                
                <!-- Bulk Actions for Rejected -->
                @if (selectedRejected.length > 0) {
                  <div class="mt-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div class="text-sm text-gray-700">
                      <strong>{{ selectedRejected.length }}</strong> submissions selected
                    </div>
                    <button
                      (click)="deleteSelectedRejected()"
                      class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete Selected ({{ selectedRejected.length }})
                    </button>
                  </div>
                }
              } @else {
                <div class="text-center py-8">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No rejected submissions found</h3>
                  <p class="mt-1 text-sm text-gray-500">All submissions are either published, pending, or in draft.</p>
                </div>
              }
              
              @if (loadingRejected) {
                <div class="text-center py-8">
                  <div class="w-8 h-8 mx-auto border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                  <p class="mt-2 text-sm text-gray-500">Loading rejected submissions...</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    
    </div>
    
    <!-- Submission Detail Modal -->
    @if (showDetailModal && selectedSubmission) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-semibold text-gray-900">Submission Details</h3>
              <button
                (click)="closeDetailModal()"
                class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <!-- Loading State -->
            @if (loadingSubmissionDetails) {
              <div class="text-center py-12">
                <div class="w-8 h-8 mx-auto border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                <p class="mt-2 text-sm text-gray-500">Loading submission details...</p>
              </div>
            }
            
            <!-- Content -->
            @if (!loadingSubmissionDetails) {
              <div class="max-h-96 overflow-y-auto">
                <!-- Basic Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <p class="text-sm text-gray-900">{{ selectedSubmission.title }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Author</label>
                    <p class="text-sm text-gray-900">{{ getAuthorName(selectedSubmission) }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-blue-100 text-blue-800': selectedSubmission.status === 'draft',
                        'bg-red-100 text-red-800': selectedSubmission.status === 'rejected'
                      }">
                      {{ selectedSubmission.submissionType | titlecase }}
                    </span>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-yellow-100 text-yellow-800': selectedSubmission.status === 'draft',
                        'bg-red-100 text-red-800': selectedSubmission.status === 'rejected'
                      }">
                      {{ selectedSubmission.status | titlecase }}
                    </span>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p class="text-sm text-gray-900">{{ selectedSubmission.createdAt | date:'MMM d, y, h:mm a' }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p class="text-sm text-gray-900">{{ selectedSubmission.updatedAt | date:'MMM d, y, h:mm a' }}</p>
                  </div>
                  @if (selectedSubmission.reviewedAt) {
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Reviewed At</label>
                      <p class="text-sm text-gray-900">{{ selectedSubmission.reviewedAt | date:'MMM d, y, h:mm a' }}</p>
                    </div>
                  }
                  @if (selectedSubmission.reviewedBy) {
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Reviewed By</label>
                      <p class="text-sm text-gray-900">{{ selectedSubmission.reviewedBy }}</p>
                    </div>
                  }
                </div>
                
                <!-- Description -->
                @if (selectedSubmission.description) {
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <div class="bg-gray-50 p-3 rounded-md">
                      <p class="text-sm text-gray-900">{{ selectedSubmission.description }}</p>
                    </div>
                  </div>
                }
                
                <!-- Content Pieces -->
                @if (selectedSubmission.contents && selectedSubmission.contents.length > 0) {
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Content ({{ selectedSubmission.contents.length }} pieces)</label>
                    <div class="space-y-4">
                      @for (content of selectedSubmission.contents; track content._id) {
                        <div class="bg-gray-50 p-4 rounded-md">
                          <div class="flex justify-between items-start mb-2">
                            <h4 class="text-sm font-medium text-gray-900">{{ content.title }}</h4>
                            @if (content.tags && content.tags.length > 0) {
                              <div class="flex flex-wrap gap-1">
                                @for (tag of content.tags; track tag) {
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {{ tag }}
                                  </span>
                                }
                              </div>
                            }
                          </div>
                          <div class="text-sm text-gray-700 max-h-32 overflow-y-auto" [innerHTML]="content.body"></div>
                        </div>
                      }
                    </div>
                  </div>
                }
                
                <!-- Review Notes -->
                @if (selectedSubmission.revisionNotes) {
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Review Notes</label>
                    <div class="bg-red-50 p-3 rounded-md border border-red-200">
                      <p class="text-sm text-red-800">{{ selectedSubmission.revisionNotes }}</p>
                    </div>
                  </div>
                }
              </div>
            }
            
            <!-- Actions -->
            <div class="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                (click)="closeDetailModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Close
              </button>
              @if (selectedSubmission.status === 'draft') {
                <button
                  (click)="deleteDraftSubmission(selectedSubmission._id); closeDetailModal()"
                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
                  Delete Draft
                </button>
              }
              @if (selectedSubmission.status === 'rejected') {
                <button
                  (click)="deleteRejectedSubmission(selectedSubmission._id); closeDetailModal()"
                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
                  Delete Submission
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
    `
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
}