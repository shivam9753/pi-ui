import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, CanDeactivate } from '@angular/router';
import { AuthService, GoogleUser } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ContentEditorComponent } from '../content-editor/content-editor.component';
import { DraftsListComponent } from '../drafts-list/drafts-list.component';
import { GuidelinesOverlayComponent } from '../guidelines-overlay/guidelines-overlay.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { SUBMISSION_STATUS, SubmissionStatus, HTTP_STATUS } from '../../shared/constants/api.constants';
import { Subscription } from 'rxjs';

export type SubmissionMode = 'create' | 'edit' | 'resubmit' | 'view';

export interface EditableSubmission {
  _id: string;
  title: string;
  description: string;
  submissionType: string;
  contents: any[];
  status: SubmissionStatus;
  revisionNotes?: string;
  reviewFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
  publishedAt?: string;
  wordCount?: number;
}

export interface Draft {
  id: string;
  title: string;
  submissionType: string;
  contents: any[];
  description: string;
  lastModified: Date;
  wordCount: number;
}

@Component({
  selector: 'app-submission-editor',
  templateUrl: './submission-editor.component.html',
  styleUrls: ['./submission-editor.component.css'],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    ContentEditorComponent,
    DraftsListComponent,
    GuidelinesOverlayComponent,
    ToastNotificationComponent
  ]
})
export class SubmissionEditorComponent implements OnInit, OnDestroy {
  @Input() mode: SubmissionMode = 'create';
  @Input() submissionId?: string;
  @Input() existingData?: EditableSubmission;

  form: FormGroup;
  loggedInUser: GoogleUser | null = null;
  selectedType = '';
  activeTab: 'submit' | 'drafts' | 'guidelines' = 'submit';
  submission: EditableSubmission | null = null;
  currentDraft: Draft | null = null;
  drafts: Draft[] = [];

  // Form state
  isSubmitting = false;
  isSaving = false;
  isSavingDraft = false;
  hasUnsavedChanges = false;
  hasChanges = false;
  currentDraftId: string | null = null;
  relatedTopicPitchId: string | null = null; // Store topic pitch ID if submission is from a pitch
  private topicPitchData: { title?: string; description?: string; type?: string } | null = null; // Store topic pitch data to apply later
  private subscriptions: Subscription[] = [];

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  submissionTypes = [
    { 
      label: 'Opinion', 
      value: 'opinion', 
      description: 'Your perspective on current topics',
      icon: '💭',
      fastTrack: true,
      expedited: true
    },
    { 
      label: 'Poem', 
      value: 'poem', 
      description: 'Poetry in all forms',
      icon: '📝',
      expedited: false
    },
    { 
      label: 'Prose', 
      value: 'prose', 
      description: 'Ceative nonfiction, memoir, and more',
      icon: '📖',
      expedited: false
    },
    { 
      label: 'Article', 
      value: 'article', 
      description: 'Well-researched analysis, deep dives, or thoughtful essays',
      icon: '📰',
      expedited: false
    },
    { 
      label: 'Book Review', 
      value: 'book_review', 
      description: 'Critical takes, reader impressions, and recommendations worth sharing',
      icon: '📚',
      expedited: false
    },
    { 
      label: 'Cinema Essay', 
      value: 'cinema_essay', 
      description: 'Film criticism, analysis or essays on cinema culture',
      icon: '🎬',
      expedited: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private backendService: BackendService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: [''], // Will be auto-populated or pre-filled for edit mode
      submissionType: ['', Validators.required],
      contents: this.fb.array([this.createContentGroup()]),
      description: ['']
    });
  }

  ngOnInit(): void {
    // Get user data
    this.authService.user$.subscribe(user => {
      this.loggedInUser = user;
    });

    // Determine mode from route params and query params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.submissionId = params['id'];
        this.mode = 'edit'; // Default to edit, will be refined by query params
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      const action = queryParams['action'];
      const mode = queryParams['mode'];
      
      if (action === 'resubmit' || mode === 'resubmit') {
        this.mode = 'resubmit';
      } else if (action === 'view' || mode === 'view') {
        this.mode = 'view';
      } else if (queryParams['draft']) {
        this.mode = 'create';
        this.loadSpecificDraft(queryParams['draft']);
      } else if (queryParams['topicId']) {
        // Handle topic pitch parameters
        this.mode = 'create';
        this.handleTopicPitchParams(queryParams);
      }
    });

    // Load existing submission if in edit/resubmit/view mode
    if (this.submissionId && (this.mode === 'edit' || this.mode === 'resubmit' || this.mode === 'view')) {
      this.loadSubmission();
    }

    // Load drafts for create mode
    if (this.mode === 'create') {
      this.loadDrafts();
    }

    this.setupFormChangeTracking();

    // Set current user if available
    if (!this.loggedInUser) {
      this.loggedInUser = this.authService.getCurrentUser();
    }
  }

  // Mode-based getters for template
  get isCreateMode(): boolean { return this.mode === 'create'; }
  get isEditMode(): boolean { return this.mode === 'edit'; }
  get isResubmitMode(): boolean { return this.mode === 'resubmit'; }
  get isViewMode(): boolean { return this.mode === 'view'; }

  get pageTitle(): string {
    switch (this.mode) {
      case 'create': return 'Submit Your Work';
      case 'edit': return 'Edit Your Submission';
      case 'resubmit': return 'Resubmit Your Work';
      case 'view': return 'View Submission';
      default: return 'Submission Editor';
    }
  }

  get pageSubtitle(): string {
    switch (this.mode) {
      case 'create': 
        return this.relatedTopicPitchId 
          ? '✨ Writing based on a community topic pitch - form pre-filled for you!' 
          : 'Send us your work for consideration';
      case 'edit': return 'Update your submission and resubmit';
      case 'resubmit': return 'Make revisions and resubmit for review';
      case 'view': return 'Review your submission';
      default: return '';
    }
  }

  createContentGroup(): FormGroup {
    return this.fb.group({
      title: [''],
      body: [''],
      tags: [''],
      footnotes: [''],
      type: [this.selectedType || '']
    });
  }

  loadSubmission(): void {
    if (!this.submissionId) return;

    this.backendService.getSubmissionWithContents(this.submissionId).subscribe({
      next: (data: EditableSubmission) => {
        this.submission = data;
        this.populateForm(data);
      },
      error: (error: any) => {
        let errorMessage = 'Error loading submission. Please try again.';
        
        if (error.status === HTTP_STATUS.NOT_FOUND) {
          errorMessage = 'Submission not found. You may not have permission to access this submission.';
        } else if (error.status === HTTP_STATUS.UNAUTHORIZED) {
          errorMessage = 'You need to be logged in to access this submission.';
        } else if (error.status === HTTP_STATUS.FORBIDDEN) {
          errorMessage = 'You do not have permission to access this submission.';
        }
        
        this.showToast(errorMessage, 'error');
        this.router.navigate(['/user-profile']);
      }
    });
  }

  populateForm(submission: EditableSubmission): void {
    this.selectedType = submission.submissionType;
    
    this.form.patchValue({
      title: submission.title,
      description: submission.description || '',
      submissionType: submission.submissionType
    });

    // Populate contents array
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();

    if (submission.contents && submission.contents.length > 0) {
      submission.contents.forEach((content) => {
        const group = this.fb.group({
          title: [content.title || '', Validators.required],
          body: [content.body || '', Validators.required],
          tags: [Array.isArray(content.tags) ? content.tags.join(', ') : (content.tags || '')],
          footnotes: [content.footnotes || ''],
          type: [content.type || submission.submissionType]
        });
        contentsArray.push(group);
      });
    } else {
      contentsArray.push(this.createContentGroup());
    }

    this.hasChanges = false;
    this.hasUnsavedChanges = false;
  }

  // Draft Management (Create mode only)
  loadDrafts(): void {
    if (this.mode !== 'create') return;

    this.backendService.getUserDrafts().subscribe({
      next: (response) => {
        this.drafts = (response.drafts || []).map((draft: any) => ({
          id: draft.id || draft._id,
          title: draft.title || 'Untitled Draft',
          submissionType: draft.type || draft.submissionType,
          contents: draft.contents || [],
          description: draft.excerpt || '',
          lastModified: new Date(draft.lastEditedAt || draft.updatedAt || draft.createdAt),
          wordCount: draft.wordCount || 0
        }));
      },
      error: () => {
        this.drafts = [];
      }
    });
  }

  loadSpecificDraft(draftId: string): void {
    const draft = this.drafts.find(d => d.id === draftId);
    if (draft) {
      this.loadDraft(draft);
      this.activeTab = 'submit';
    } else {
      this.backendService.getUserDrafts().subscribe({
        next: (response) => {
          const apiDraft = (response.drafts || []).find((d: any) => d.id === draftId || d._id === draftId);
          if (apiDraft) {
            const transformedDraft: Draft = {
              id: apiDraft._id,
              title: apiDraft.title,
              submissionType: apiDraft.submissionType,
              contents: apiDraft.contents || [],
              description: apiDraft.description,
              lastModified: apiDraft.lastEditedAt,
              wordCount: apiDraft.wordCount || 0
            };
            this.loadDraft(transformedDraft);
            this.activeTab = 'submit';
          }
        },
        error: () => {
          this.showToast('Draft not found', 'error');
        }
      });
    }
  }

  handleTopicPitchParams(queryParams: any): void {
    // Store topic pitch data for later use
    const { topicId, title, type, description } = queryParams;
    
    // Store topic ID for future reference
    if (topicId) {
      this.relatedTopicPitchId = topicId;
    }
    
    // Store data to apply after type selection
    this.topicPitchData = {
      title: title || undefined,
      description: description || undefined,
      type: type || undefined
    };
    
    // Map topic pitch content types to submission types and trigger selection
    if (type) {
      let submissionType = type;
      if (type === 'cinema_essay') {
        submissionType = 'article'; // Map cinema essay to article for submission
      }
      
      // This will trigger onTypeSelected which will set up the form properly
      this.onTypeSelected(submissionType);
    }
    
    // Show a notification that this is from a topic pitch
    setTimeout(() => {
      this.showToast('Pre-filled from topic pitch! Feel free to modify as needed.', 'info');
    }, 100);
  }

  loadDraft(draft: Draft): void {
    this.currentDraft = draft;
    this.selectedType = draft.submissionType;
    this.currentDraftId = draft.id;
    
    this.form.patchValue({
      title: draft.title,
      submissionType: draft.submissionType,
      description: draft.description
    });

    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    
    if (draft.contents && draft.contents.length > 0) {
      draft.contents.forEach((content) => {
        const group = this.createContentGroup();
        group.patchValue({
          title: content.title || '',
          body: content.body || '',
          tags: Array.isArray(content.tags) ? content.tags.join(', ') : (content.tags || ''),
          footnotes: content.footnotes || ''
        });
        contentsArray.push(group);
      });
    } else {
      contentsArray.push(this.createContentGroup());
    }

    this.hasUnsavedChanges = false;
    this.hasChanges = false;
    this.showToast('Draft loaded successfully!', 'success');
    
    setTimeout(() => {
      this.form.updateValueAndValidity();
      this.onContentChanged(contentsArray.value);
      this.form.markAsPristine();
      this.cdr.detectChanges();
    }, 200);
  }

  loadDraftAndSwitchToSubmit(draft: Draft): void {
    this.loadDraft(draft);
    this.activeTab = 'submit';
  }

  saveAsDraft(): void {
    if (!this.hasContent()) {
      this.showToast('Please add some content before saving as draft', 'error');
      return;
    }

    this.isSavingDraft = true;
    this.autoPopulateTitle();
    
    const formValue = this.form.value;
    const contentsWithType = formValue.contents.map((content: any) => ({
      ...content,
      type: content.type || this.selectedType
    }));
    
    const draftPayload = {
      title: formValue.title,
      description: formValue.description,
      submissionType: this.selectedType,
      contents: contentsWithType,
      draftId: this.currentDraftId
    };
    
    this.backendService.saveDraft(draftPayload).subscribe({
      next: (response) => {
        this.isSavingDraft = false;
        this.hasUnsavedChanges = false;
        this.currentDraftId = response.draft.id;
        this.showToast('Draft saved successfully! Your draft will be available for 1 week in My Profile.', 'success');
        this.loadDrafts();
      },
      error: (error) => {
        this.isSavingDraft = false;
        let errorMessage = 'Failed to save draft. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.status === 401) {
          errorMessage = 'Please log in again to save your draft.';
        } else if (error.status === 413) {
          errorMessage = 'Draft is too large. Please reduce the content size.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again in a few minutes.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.showToast(errorMessage, 'error');
      }
    });
  }

  deleteDraft(draftId: string): void {
    this.backendService.deleteDraft(draftId).subscribe({
      next: () => {
        this.showToast('Draft deleted successfully', 'success');
        this.loadDrafts();
      },
      error: (error) => {
        let errorMessage = 'Failed to delete draft. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.status === 401) {
          errorMessage = 'Please log in again to delete your draft.';
        } else if (error.status === 404) {
          errorMessage = 'Draft not found. It may have already been deleted.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again in a few minutes.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.showToast(errorMessage, 'error');
      }
    });
  }

  // Form Management
  get contentsArray(): FormArray {
    return this.form.get('contents') as FormArray;
  }

  getContentControls() {
    return (this.form.controls['contents'] as FormArray).controls;
  }

  getContentsFormArray(): FormArray {
    return this.form.get('contents') as FormArray;
  }

  addContent(): void {
    const contentGroup = this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      tags: [[]],
      footnotes: [''],
      type: [this.selectedType || 'poem']
    });
    
    this.contentsArray.push(contentGroup);
  }

  removeContent(index: number): void {
    if (this.contentsArray.length > 1) {
      this.contentsArray.removeAt(index);
    }
  }

  onTypeSelected(type: string): void {
    if (this.selectedType !== type) {
      const contentsArray = this.form.get('contents') as FormArray;
      contentsArray.clear();
      contentsArray.push(this.createContentGroup());
    }
    
    this.selectedType = type;
    this.form.patchValue({ submissionType: type });
    
    // Apply topic pitch data if available
    if (this.topicPitchData) {
      setTimeout(() => {
        if (this.topicPitchData?.title) {
          this.form.patchValue({ title: this.topicPitchData.title });
          
          // Also set title on the first content item
          const contentsArray = this.form.get('contents') as FormArray;
          if (contentsArray && contentsArray.length > 0) {
            const firstContent = contentsArray.at(0);
            firstContent?.patchValue({ title: this.topicPitchData.title });
          }
        }
        
        if (this.topicPitchData?.description) {
          this.form.patchValue({ description: this.topicPitchData.description });
        }
        
        // Clear the stored data since we've applied it
        this.topicPitchData = null;
        
        // Force change detection
        this.cdr.detectChanges();
      }, 0);
    }
    
    // Auto-scroll to content section after type selection
    setTimeout(() => {
      const contentSection = document.querySelector('[data-section="content"]') || 
                           document.querySelector('app-content-editor') ||
                           document.querySelector('[formArrayName="contents"]');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, this.topicPitchData ? 200 : 100); // Delay scroll if we're applying topic pitch data
  }

  onTypeChange(): void {
    const newType = this.form.value.submissionType;
    this.contentsArray.controls.forEach(control => {
      control.get('type')?.setValue(newType);
    });
  }

  onContentChanged(contents: any[]): void {
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    contents.forEach(content => {
      const group = this.createContentGroup();
      group.patchValue({
        ...content,
        type: content.type || this.selectedType
      });
      contentsArray.push(group);
    });
  }

  // Validation
  validateForm(): boolean {
    const contents = this.form.get('contents') as FormArray;
    return !!this.selectedType && contents.controls.every(content => 
      content.get('title')?.value?.trim() && content.get('body')?.value?.trim()
    );
  }

  autoPopulateTitle(): void {
    const contents = this.form.get('contents') as FormArray;
    if (contents.length > 0) {
      const firstContentTitle = contents.at(0).get('title')?.value;
      if (firstContentTitle && !this.form.get('title')?.value) {
        this.form.patchValue({ title: firstContentTitle });
      }
    }
  }

  // Content utilities
  hasContent(): boolean {
    const contents = this.form.get('contents') as FormArray;
    return contents.controls.some(content => 
      content.get('body')?.value?.trim() || content.get('title')?.value?.trim()
    );
  }

  getTotalWordCount(): number {
    const contents = this.form.get('contents') as FormArray;
    let totalWords = 0;
    
    contents.controls.forEach(content => {
      const body = content.get('body')?.value || '';
      const title = content.get('title')?.value || '';
      totalWords += this.countWords(body) + this.countWords(title);
    });
    
    return totalWords;
  }

  private countWords(text: string): number {
    if (!text) return 0;
    
    // Convert HTML to plain text first for create mode
    if (this.mode === 'create') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  getReadingTime(): number {
    const wordCount = this.getTotalWordCount();
    return Math.ceil(wordCount / 200);
  }

  // Submission actions
  saveChanges(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    this.isSaving = true;
    const formData = this.form.value;
    
    const cleanedData = { ...formData };
    if (!cleanedData.description || cleanedData.description.trim() === '') {
      delete cleanedData.description;
    }

    this.backendService.updateSubmission(this.submissionId!, cleanedData).subscribe({
      next: (response: any) => {
        this.showToast('Changes saved successfully!', 'success');
        this.hasChanges = false;
        this.hasUnsavedChanges = false;
        this.isSaving = false;
        this.loadSubmission();
      },
      error: (error: any) => {
        this.showToast('Error saving changes. Please try again.', 'error');
        this.isSaving = false;
      }
    });
  }

  submitForReview(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.showToast('Please fill in all required fields before submitting.', 'error');
      return;
    }

    // Check poem count for poetry submissions
    if (this.selectedType === 'poem') {
      const contents = this.form.get('contents') as FormArray;
      if (contents.controls.length < 3) {
        this.showToast('Poetry submissions require at least 3 poems', 'error');
        return;
      }
    }

    this.isSubmitting = true;
    const formData = this.form.value;
    
    const cleanedData = { ...formData };
    if (!cleanedData.description || cleanedData.description.trim() === '') {
      delete cleanedData.description;
    }

    if (this.isResubmitMode) {
      // Use updateSubmission instead of resubmitSubmission to avoid backend action mapping issues
      cleanedData.status = SUBMISSION_STATUS.RESUBMITTED; // Set to resubmitted status
      this.backendService.updateSubmission(this.submissionId!, cleanedData).subscribe({
        next: (response: any) => {
          this.showToast('Submission resubmitted successfully! It will be reviewed again.', 'success');
          setTimeout(() => {
            this.router.navigate(['/user-profile']);
          }, 2000);
        },
        error: (error: any) => {
          this.showToast('Error resubmitting. Please try again.', 'error');
          this.isSubmitting = false;
        }
      });
    } else if (this.isEditMode) {
      cleanedData.status = SUBMISSION_STATUS.PENDING_REVIEW;
      this.backendService.updateSubmission(this.submissionId!, cleanedData).subscribe({
        next: (response: any) => {
          this.showToast('Submission updated and sent for review!', 'success');
          setTimeout(() => {
            this.router.navigate(['/user-profile']);
          }, 2000);
        },
        error: (error: any) => {
          this.showToast('Error submitting for review. Please try again.', 'error');
          this.isSubmitting = false;
        }
      });
    }
  }

  submitForm(): void {
    if (!this.validateForm()) {
      this.showToast('Please complete all required fields', 'error');
      return;
    }

    // Check poem count for poetry submissions
    if (this.selectedType === 'poem') {
      const contents = this.form.get('contents') as FormArray;
      if (contents.controls.length < 3) {
        this.showToast('Poetry submissions require at least 3 poems', 'error');
        return;
      }
    }

    // Show confirmation dialog before submission
    const confirmSubmission = confirm('Are you ready to submit your work for review? Once submitted, it cannot be edited.');
    if (!confirmSubmission) {
      return;
    }

    this.isSubmitting = true;
    this.autoPopulateTitle();
    
    const formValue = this.form.value;
    const contentsWithType = formValue.contents.map((content: any) => ({
      ...content,
      type: this.selectedType
    }));
    
    const submissionPayload = {
      ...formValue,
      contents: contentsWithType,
      submittedAt: new Date().toISOString()
    };
    
    this.backendService.submitNewSubmission(submissionPayload).subscribe({
      next: () => {
        this.hasUnsavedChanges = false;
        this.showToast('Submission successful! Thank you for sharing your creative work.', 'success');
        this.handleSuccessfulSubmission();
      },
      error: (error) => {
        this.isSubmitting = false;
        
        let errorMessage = 'There was an error submitting your work. Please try again.';
        
        if (error.error?.errors && Array.isArray(error.error.errors)) {
          const validationErrors = error.error.errors;
          const errorMessages = validationErrors.map((err: any) => {
            let fieldName = err.path || 'Field';
            if (fieldName.startsWith('contents[') && fieldName.includes('].title')) {
              const match = fieldName.match(/contents\[(\d+)\]\.title/);
              if (match) {
                const index = parseInt(match[1]) + 1;
                fieldName = `Content ${index} title`;
              }
            } else if (fieldName.startsWith('contents[') && fieldName.includes('].body')) {
              const match = fieldName.match(/contents\[(\d+)\]\.body/);
              if (match) {
                const index = parseInt(match[1]) + 1;
                fieldName = `Content ${index} body`;
              }
            } else if (fieldName === 'title') {
              fieldName = 'Main title';
            }
            
            return `${fieldName}: ${err.msg}`;
          });
          
          const maxErrors = 5;
          const displayErrors = errorMessages.slice(0, maxErrors);
          errorMessage = displayErrors.join('\n');
          
          if (errorMessages.length > maxErrors) {
            errorMessage += `\n... and ${errorMessages.length - maxErrors} more validation errors`;
          }
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.showToast(errorMessage, 'error');
      }
    });
  }

  private handleSuccessfulSubmission(): void {
    if (this.currentDraft) {
      this.deleteDraft(this.currentDraft.id);
    }
    
    this.resetForm();
    
    setTimeout(() => {
      this.router.navigate(['/explore']);
    }, 2000);
  }

  cancel(): void {
    if (this.hasChanges || this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/user-profile']);
      }
    } else {
      this.router.navigate(['/user-profile']);
    }
  }

  resetForm(): void {
    this.form.reset();
    this.selectedType = '';
    this.currentDraft = null;
    this.isSubmitting = false;
    
    const contents = this.form.controls['contents'] as FormArray;
    contents.clear();
    contents.push(this.createContentGroup());
  }

  clearCurrentDraft(): void {
    this.currentDraft = null;
  }

  // Icon utility for templates
  getIconForType(type: string): string {
    const icons: { [key: string]: string } = {
      'opinion': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'poem': 'M4 8h12M4 12h8M4 16h14',
      'prose': 'M4 7h16M4 11h16M4 15h12M4 19h8',
      'article': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'book_review': 'M12 6.253v13C10.832 18.477 9.246 18 7.5 18S4.168 18.477 3 19.253V6.253C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253zm0 0C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z',
      'cinema_essay': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
    };
    return icons[type] || 'M12 2l3.09 6.26L22 9l-5 4.87L18.18 20 12 16.77 5.82 20 L7 13.87 2 9l6.91-.74L12 2z';
  }

  // Progress tracking methods (Create mode only)
  getCurrentStep(): number {
    if (!this.selectedType) return 1;
    if (!this.hasContent()) return 2;
    return 3;
  }

  getCurrentStepText(): string {
    const step = this.getCurrentStep();
    const steps = ['Choose type', 'Write content', 'Review & submit'];
    return steps[step - 1] || 'Choose type';
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
  }

  hideToast(): void {
    this.showToastFlag = false;
  }

  // Helper methods for status display (Edit/Resubmit modes)
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case SUBMISSION_STATUS.NEEDS_REVISION:
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case SUBMISSION_STATUS.RESUBMITTED:
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case SUBMISSION_STATUS.DRAFT:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case SUBMISSION_STATUS.PENDING_REVIEW:
        return 'bg-amber-100 text-amber-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case SUBMISSION_STATUS.NEEDS_REVISION:
        return 'Needs Revision';
      case SUBMISSION_STATUS.RESUBMITTED:
        return 'Resubmitted';
      case SUBMISSION_STATUS.DRAFT:
        return 'Draft';
      case SUBMISSION_STATUS.PENDING_REVIEW:
        return 'Pending Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  getSubmissionTypeInfo() {
    return this.submissionTypes.find(type => type.value === this.selectedType);
  }

  getTypeDisplayName(): string {
    const typeMap: { [key: string]: string } = {
      'poem': 'Poetry',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    const currentType = this.selectedType;
    return typeMap[currentType] || 'Content';
  }

  shouldAllowImages(): boolean {
    return true; // Allow images for all submission types
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Setup form change tracking
  setupFormChangeTracking(): void {
    const formSub = this.form.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
      this.hasChanges = true;
    });
    
    this.subscriptions.push(formSub);
  }

  // Navigation guard implementation
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      if (this.mode === 'create' && confirm('You have unsaved changes. Do you want to save them as a draft before leaving?')) {
        this.isSavingDraft = true;
        this.autoPopulateTitle();
        
        const formValue = this.form.value;
        const contentsWithType = formValue.contents.map((content: any) => ({
          ...content,
          type: content.type || this.selectedType
        }));
        
        const draftPayload = {
          title: formValue.title,
          description: formValue.description,
          submissionType: this.selectedType,
          contents: contentsWithType,
          draftId: this.currentDraftId
        };
        
        const saveSubscription = this.backendService.saveDraft(draftPayload).subscribe({
          next: () => {
            this.isSavingDraft = false;
            this.hasUnsavedChanges = false;
            resolve(true);
          },
          error: () => {
            this.isSavingDraft = false;
            resolve(true);
          }
        });
        
        this.subscriptions.push(saveSubscription);
      } else if (confirm('Are you sure you want to leave without saving? Your changes will be lost.')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  // Math utility for template
  Math = Math;

  // Cleanup on destroy
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}