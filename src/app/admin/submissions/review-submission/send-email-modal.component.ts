import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EmailData {
  subject: string;
  message: string;
  template?: 'approved' | 'rejected' | 'revision' | 'shortlisted' | '';
}

@Component({
  selector: 'app-send-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <!-- Modal Overlay -->
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
           (click)="onOverlayClick($event)">

        <!-- Modal Container -->
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <h2 class="text-xl font-bold">Send Email to Author</h2>
            </div>
            <button
              (click)="closeModal()"
              [disabled]="isSending"
              class="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">

            <!-- Subject Line -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Subject Line <span class="text-red-600">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="emailData.subject"
                placeholder="e.g., Regarding your submission 'Poem Title'"
                class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                [class.border-red-300]="!emailData.subject.trim() && attemptedSubmit">
            </div>

            <!-- Message -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Message <span class="text-red-600">*</span>
              </label>
              <textarea
                [(ngModel)]="emailData.message"
                rows="10"
                placeholder="Write your message here...&#10;&#10;You can write feedback, suggestions, or any custom message for the author."
                class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                [class.border-red-300]="!emailData.message.trim() && attemptedSubmit">
              </textarea>
              <p class="mt-1 text-xs text-gray-500">
                This will be sent as a plain text email.
              </p>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              (click)="closeModal()"
              [disabled]="isSending"
              class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              (click)="sendEmail()"
              [disabled]="isSending || !isValid()"
              class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (!isSending) {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                <span>Send Email</span>
              }
              @if (isSending) {
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              }
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class SendEmailModalComponent {
  @Input() isOpen = false;
  @Input() submissionTitle = '';
  @Output() close = new EventEmitter<void>();
  @Output() send = new EventEmitter<EmailData>();

  emailData: EmailData = {
    subject: '',
    message: '',
    template: ''
  };

  isSending = false;
  attemptedSubmit = false;

  ngOnChanges() {
    if (this.isOpen && this.submissionTitle) {
      // Pre-fill subject if not already set
      if (!this.emailData.subject) {
        this.emailData.subject = `Regarding your submission "${this.submissionTitle}"`;
      }
    }
  }

  isValid(): boolean {
    return this.emailData.subject.trim().length > 0 &&
           this.emailData.message.trim().length > 0;
  }

  getTemplateName(): string {
    switch (this.emailData.template) {
      case 'approved': return 'Approval';
      case 'rejected': return 'Rejection';
      case 'revision': return 'Revision Request';
      case 'shortlisted': return 'Shortlisted';
      default: return '';
    }
  }

  onOverlayClick(event: MouseEvent) {
    if (!this.isSending) {
      this.closeModal();
    }
  }

  closeModal() {
    if (!this.isSending) {
      this.close.emit();
      this.resetForm();
    }
  }

  async sendEmail() {
    this.attemptedSubmit = true;

    if (!this.isValid()) {
      return;
    }

    this.isSending = true;
    this.send.emit(this.emailData);
  }

  resetForm() {
    this.emailData = {
      subject: '',
      message: '',
      template: ''
    };
    this.attemptedSubmit = false;
    this.isSending = false;
  }

  // Call this from parent after email is sent
  onEmailSent() {
    this.isSending = false;
    this.closeModal();
  }

  // Call this from parent if email failed
  onEmailFailed() {
    this.isSending = false;
  }
}
