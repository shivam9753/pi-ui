// submission-form.component.ts

import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, CanDeactivate, ActivatedRoute } from '@angular/router';
import { AuthService, GoogleUser } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ContentEditorComponent } from '../content-editor/content-editor.component';
import { DraftsListComponent } from '../drafts-list/drafts-list.component';
import { GuidelinesOverlayComponent } from '../guidelines-overlay/guidelines-overlay.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { Subscription } from 'rxjs';

export interface Draft {
  id: string;
  title: string;
  submissionType: string;
  contents: any[];
  description: string;
  lastModified: Date;
  wordCount: number;
}

// Removed unsaved work prompts as requested

@Component({
  selector: 'app-submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  imports: [
    ReactiveFormsModule,
    DraftsListComponent,
    GuidelinesOverlayComponent,
    ContentEditorComponent,
    ToastNotificationComponent
]
})

export class SubmissionFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loggedInUser: GoogleUser | null = null;
  selectedType = '';
  activeTab: 'submit' | 'drafts' | 'guidelines' = 'submit';
  showDrafts = false;
  showGuidelines = false;
  currentDraft: Draft | null = null;
  drafts: Draft[] = [];
  
  // Form state
  isSubmitting = false;
  isSavingDraft = false;
  hasUnsavedChanges = false;
  currentDraftId: string | null = null;
  private subscriptions: Subscription[] = [];
  
  submissionTypes = [
    { 
      label: 'Opinion', 
      value: 'opinion', 
      description: 'Your perspective on current topics',
      fastTrack: true,
      expedited: true
    },
    { 
      label: 'Poem', 
      value: 'poem', 
      description: 'Verses, lyrics, free verse (min 3 poems required)',
      expedited: false
    },
    { 
      label: 'Prose', 
      value: 'prose', 
      description: 'Short stories, narratives',
      expedited: false
    },
    { 
      label: 'Article', 
      value: 'article', 
      description: 'In-depth analysis, research',
      expedited: false
    },
    { 
      label: 'Book Review', 
      value: 'book_review', 
      description: 'Book analysis, recommendations',
      expedited: false
    },
    { 
      label: 'Cinema Essay', 
      value: 'cinema_essay', 
      description: 'Film analysis, reviews',
      expedited: false
    }
  ];

  getIconForType(type: string): string {
    const icons: { [key: string]: string } = {
      'opinion': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'poem': 'M4 8h12M4 12h8M4 16h14',
      'prose': 'M4 7h16M4 11h16M4 15h12M4 19h8',
      'article': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'book_review': 'M12 6.253v13C10.832 18.477 9.246 18 7.5 18S4.168 18.477 3 19.253V6.253C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253zm0 0C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z',
      'cinema_essay': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
    };
    return icons[type] || '';
  }

  // Toast state
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  constructor(
    private fb: FormBuilder, 
    private backendService: BackendService, 
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: [''], // Will be auto-populated
      submissionType: ['', Validators.required],
      contents: this.fb.array([this.createContentGroup()]),
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loggedInUser = this.authService.getCurrentUser();
    console.log('Logged in user:', this.loggedInUser);
    console.log('User ID being used:', this.loggedInUser?.id);
    console.log('User ID type:', typeof this.loggedInUser?.id);
    
    // Check what's in localStorage
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('google_user');
      console.log('Stored user in localStorage:', storedUser);
    }
    
    this.loadDrafts();
    this.setupFormChangeTracking();
    
    // Check for draft query parameter
    this.route.queryParams.subscribe(params => {
      if (params['draft']) {
        this.loadSpecificDraft(params['draft']);
      }
    });
  }

  createContentGroup(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      tags: ['']
    });
  }

  getContentControls() {
    return (this.form.controls['contents'] as FormArray).controls;
  }

  getContentsFormArray(): FormArray {
    return this.form.get('contents') as FormArray;
  }

  // Validation methods
  validateForm(): boolean {
    const contents = this.form.get('contents') as FormArray;
    return !!this.selectedType && contents.controls.every(content => 
      content.get('title')?.value?.trim() && content.get('body')?.value?.trim()
    );
  }

  // Auto-populate title from first content
  autoPopulateTitle(): void {
    const contents = this.form.get('contents') as FormArray;
    if (contents.length > 0) {
      const firstContentTitle = contents.at(0).get('title')?.value;
      if (firstContentTitle && !this.form.get('title')?.value) {
        this.form.patchValue({ title: firstContentTitle });
      }
    }
  }

  // Type selection
  onTypeSelected(type: string): void {
    if (this.selectedType !== type) {
      const contentsArray = this.form.get('contents') as FormArray;
      contentsArray.clear();
      contentsArray.push(this.createContentGroup());
    }
    
    this.selectedType = type;
    this.form.patchValue({ submissionType: type });
    
    // Auto-scroll to content section after type selection
    setTimeout(() => {
      const contentSection = document.querySelector('[data-section="content"]') || 
                           document.querySelector('app-content-editor') ||
                           document.querySelector('[formArrayName="contents"]');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // Content management
  onContentChanged(contents: any[]): void {
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    contents.forEach(content => {
      const group = this.createContentGroup();
      group.patchValue(content);
      contentsArray.push(group);
    });
  }

  // Draft management
  loadDrafts(): void {
    this.backendService.getUserDrafts().subscribe({
      next: (response) => {
        // Transform backend draft format to component format
        this.drafts = (response.drafts || []).map((draft: any) => ({
          id: draft.id || draft._id,
          title: draft.title || 'Untitled Draft',
          submissionType: draft.type || draft.submissionType,
          contents: draft.contents || [],
          description: draft.excerpt || '',
          lastModified: new Date(draft.lastEditedAt || draft.updatedAt || draft.createdAt),
          wordCount: draft.wordCount || 0
        }));
        console.log('Drafts loaded and transformed:', this.drafts.length);
        console.log('Sample draft:', this.drafts[0]);
      },
      error: (error) => {
        console.error('Error loading drafts:', error);
        this.drafts = [];
      }
    });
  }

  saveAsDraft(): void {
    if (!this.hasContent()) {
      this.showToast('Please add some content before saving as draft', 'error');
      return;
    }

    this.isSavingDraft = true;
    this.autoPopulateTitle();
    
    // Add the type field to each content item
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
      draftId: this.currentDraftId // Include if updating existing draft
    };

    console.log('Saving draft with payload:', draftPayload);
    
    this.backendService.saveDraft(draftPayload).subscribe({
      next: (response) => {
        this.isSavingDraft = false;
        this.hasUnsavedChanges = false;
        this.currentDraftId = response.draft.id;
        this.showToast('Draft saved successfully! Your draft will be available for 1 week in My Profile.', 'success');
        this.loadDrafts(); // Refresh drafts list
      },
      error: (error) => {
        console.error('Error saving draft:', error);
        this.isSavingDraft = false;
        this.showToast('Failed to save draft. Please try again.', 'error');
      }
    });
  }

  loadSpecificDraft(draftId: string): void {
    // Find the draft in the loaded drafts
    const draft = this.drafts.find(d => d.id === draftId);
    if (draft) {
      this.loadDraft(draft);
      this.activeTab = 'submit'; // Switch to submit tab
    } else {
      // If not found in current drafts, try to load from API
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
        error: (error) => {
          console.error('Error loading specific draft:', error);
          this.showToast('Draft not found', 'error');
        }
      });
    }
  }

  loadDraft(draft: Draft): void {
    console.log('Loading draft:', draft);
    this.currentDraft = draft;
    this.selectedType = draft.submissionType;
    this.currentDraftId = draft.id; // Set the draft ID to enable updates
    
    // Populate form with draft data
    this.form.patchValue({
      title: draft.title,
      submissionType: draft.submissionType,
      description: draft.description
    });

    // Populate contents
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    
    try {
      if (draft.contents && draft.contents.length > 0) {
        draft.contents.forEach((content, index) => {
          console.log(`Processing content ${index}:`, content);
          const group = this.createContentGroup();
          group.patchValue({
            title: content.title || '',
            body: content.body || '',
            tags: Array.isArray(content.tags) ? content.tags.join(', ') : (content.tags || '')
          });
          contentsArray.push(group);
        });
      } else {
        console.log('No contents found, adding empty group');
        // If no contents, add an empty content group
        contentsArray.push(this.createContentGroup());
      }
    } catch (error) {
      console.error('Error populating contents:', error);
      // Fallback: add empty content group
      contentsArray.push(this.createContentGroup());
    }

    this.showDrafts = false;
    this.hasUnsavedChanges = false; // Reset since we just loaded saved content
    this.showToast('Draft loaded successfully!', 'success');
    
    // Trigger the onContentChanged to update the content editor and UI
    setTimeout(() => {
      this.form.updateValueAndValidity();
      
      // Force change detection by emitting the form array changes
      const formArrayValue = contentsArray.value;
      console.log('Form array value after loading:', formArrayValue);
      
      // Manually trigger content changed to update UI
      this.onContentChanged(formArrayValue);
      
      // Mark form as pristine since we just loaded saved data
      this.form.markAsPristine();
      
      // Force change detection
      this.cdr.detectChanges();
    }, 200); // Increased timeout to ensure proper rendering
  }

  loadDraftAndSwitchToSubmit(draft: Draft): void {
    this.loadDraft(draft);
    this.activeTab = 'submit';
  }

  deleteDraft(draftId: string): void {
    this.backendService.deleteDraft(draftId).subscribe({
      next: () => {
        this.showToast('Draft deleted successfully', 'success');
        this.loadDrafts(); // Refresh drafts list
      },
      error: (error) => {
        console.error('Error deleting draft:', error);
        this.showToast('Failed to delete draft. Please try again.', 'error');
      }
    });
  }

  // Word count and content checking
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
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Form submission
  submitForm(): void {
    if (!this.validateForm()) {
      this.showToast('Please complete all required fields', 'error');
      return;
    }

    // Check poem count for poetry submissions
    const submissionType = this.form.get('submissionType')?.value;
    if (submissionType === 'poem') {
      const contents = this.form.get('contents') as FormArray;
      if (contents.controls.length < 3) {
        this.showToast('Poetry submissions require at least 3 poems', 'error');
        return;
      }
    }

    this.isSubmitting = true;
    this.autoPopulateTitle();
    
    // Add the type field to each content item
    const formValue = this.form.value;
    const contentsWithType = formValue.contents.map((content: any) => ({
      ...content,
      type: this.selectedType // Add the selected type to each content item
    }));
    
    const submissionPayload = {
      ...formValue,
      contents: contentsWithType,
      authorId: this.loggedInUser?.id,
      submittedAt: new Date().toISOString()
    };

    console.log('Submitting form with payload:', submissionPayload);
    console.log('Current logged in user:', this.loggedInUser);
    console.log('Author ID being sent:', this.loggedInUser?.id);
    
    this.backendService.submitNewSubmission(submissionPayload).subscribe({
      next: (result) => {
        this.hasUnsavedChanges = false; // Reset unsaved changes
        this.showToast('Submission successful! Thank you for sharing your creative work.', 'success');
        this.handleSuccessfulSubmission();
      },
      error: (error) => {
        console.error('Submission error:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        // Show more specific error message
        let errorMessage = 'There was an error submitting your work. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
        
        this.showToast(errorMessage, 'error');
        this.isSubmitting = false;
      }
    });
  }

  private handleSuccessfulSubmission(): void {
    // Delete the current draft if it exists
    if (this.currentDraft) {
      this.deleteDraft(this.currentDraft.id);
    }
    
    this.resetForm();
    
    // Navigate to explore page after 2 seconds
    setTimeout(() => {
      this.router.navigate(['/explore']);
    }, 2000);
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

  getReadingTime(): number {
    const wordCount = this.getTotalWordCount();
    return Math.ceil(wordCount / 200); // Average reading speed
  }

  clearCurrentDraft(): void {
    this.currentDraft = null;
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

  // Progress tracking methods
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

  // Navigation guard implementation
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      if (confirm('You have unsaved changes. Do you want to save them as a draft before leaving?')) {
        // User wants to save as draft
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

  // Setup form change tracking
  setupFormChangeTracking(): void {
    // Track form value changes
    const formSub = this.form.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
    });
    
    this.subscriptions.push(formSub);
  }

  // Browser refresh/close handler - Disabled to avoid annoying prompts
  // @HostListener('window:beforeunload', ['$event'])
  // unloadNotification($event: any): void {
  //   if (this.hasUnsavedChanges) {
  //     $event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  //   }
  // }

  // Cleanup on destroy
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}