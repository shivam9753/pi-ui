import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-review-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (canReview && !showReviewForm) {
      <div class="flex flex-col sm:flex-row sm:justify-center gap-3">
        <button
          (click)="setAction('approve')"
          [disabled]="isSubmitting"
          class="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-green-800 bg-green-100 rounded-lg hover:bg-green-200 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Accept Submission
        </button>
        
        <button
          (click)="setAction('reject')"
          [disabled]="isSubmitting"
          class="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-red-800 bg-red-100 rounded-lg hover:bg-red-200 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Reject Submission
        </button>
        
        <button
          (click)="setAction('revision')"
          [disabled]="isSubmitting"
          class="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-orange-800 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Ask for Revision
        </button>
      </div>
    }

    @if (showReviewForm) {
      <div class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <label for="reviewNotes" class="block text-base font-semibold text-gray-900 mb-3">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              Review Comments
              @if (reviewAction === 'reject' || reviewAction === 'revision') {
                <span class="text-red-600 text-sm">*Required</span>
              }
            </span>
          </label>
          <textarea
            id="reviewNotes"
            [(ngModel)]="reviewNotes"
            (ngModelChange)="notesChange.emit($event)"
            rows="5"
            class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500 resize-vertical shadow-sm"
            [placeholder]="getPlaceholder()"
            [class.border-red-300]="(reviewAction === 'reject' || reviewAction === 'revision') && !reviewNotes.trim()">
          </textarea>
        </div>
        
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center" [ngClass]="getActionIconClass()">
                <svg class="w-5 h-5" [ngClass]="getActionTextClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getActionIconPath()"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">{{ getActionTitle() }}</h4>
                <p class="text-sm text-gray-500">Complete your review with feedback</p>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                (click)="cancel.emit()"
                [disabled]="isSubmitting"
                class="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50">
                Cancel
              </button>
              
              <button
                (click)="confirm.emit()"
                [disabled]="isSubmitting || ((reviewAction === 'reject' || reviewAction === 'revision') && !reviewNotes.trim())"
                class="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                [ngClass]="getConfirmButtonClass()">
                @if (!isSubmitting) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getConfirmIconPath()"/>
                    </svg>
                    {{ getConfirmText() }}
                  </span>
                }
                @if (isSubmitting) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class ReviewActionsComponent {
  @Input() canReview = false;
  @Input() showReviewForm = false;
  @Input() reviewAction = '';
  @Input() reviewNotes = '';
  @Input() isSubmitting = false;
  
  @Output() actionSet = new EventEmitter<string>();
  @Output() notesChange = new EventEmitter<string>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  setAction(action: string) {
    this.actionSet.emit(action);
  }

  getPlaceholder(): string {
    switch (this.reviewAction) {
      case 'approve': return 'Share what you liked about this submission (optional)...';
      case 'revision': return 'Provide specific feedback on what needs improvement (required)...';
      case 'reject': return 'Explain your decision and provide constructive feedback (required)...';
      default: return 'Add your review comments...';
    }
  }

  getActionIconClass(): string {
    switch (this.reviewAction) {
      case 'approve': return 'bg-green-100';
      case 'reject': return 'bg-red-100';
      case 'revision': return 'bg-orange-100';
      default: return 'bg-blue-100';
    }
  }

  getActionTextClass(): string {
    switch (this.reviewAction) {
      case 'approve': return 'text-green-600';
      case 'reject': return 'text-red-600';
      case 'revision': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  }

  getActionIconPath(): string {
    switch (this.reviewAction) {
      case 'approve': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'reject': return 'M6 18L18 6M6 6l12 12';
      case 'revision': return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      default: return 'M9 12l2 2 4-4';
    }
  }

  getActionTitle(): string {
    switch (this.reviewAction) {
      case 'approve': return 'Approve Submission';
      case 'reject': return 'Reject Submission';
      case 'revision': return 'Request Revision';
      default: return 'Review Action';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.reviewAction) {
      case 'approve': return 'bg-green-600 hover:bg-green-700 focus:ring-green-200';
      case 'reject': return 'bg-red-600 hover:bg-red-700 focus:ring-red-200';
      case 'revision': return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-200';
      default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200';
    }
  }

  getConfirmIconPath(): string {
    switch (this.reviewAction) {
      case 'approve': return 'M9 12l2 2 4-4';
      case 'reject': return 'M6 18L18 6M6 6l12 12';
      case 'revision': return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
      default: return 'M9 12l2 2 4-4';
    }
  }

  getConfirmText(): string {
    switch (this.reviewAction) {
      case 'approve': return 'Confirm Approval';
      case 'reject': return 'Confirm Rejection';
      case 'revision': return 'Send Revision Request';
      default: return 'Confirm';
    }
  }
}