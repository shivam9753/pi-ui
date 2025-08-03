// submission-form.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, GoogleUser } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ContentEditorComponent } from '../content-editor/content-editor.component';
import { DraftsListComponent } from '../drafts-list/drafts-list.component';
import { GuidelinesOverlayComponent } from '../guidelines-overlay/guidelines-overlay.component';

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
  selector: 'app-submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  imports: [
    ReactiveFormsModule, 
    CommonModule, 
    DraftsListComponent,
    GuidelinesOverlayComponent,
    ContentEditorComponent
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
  
  submissionTypes = [
    { 
      label: 'Poem', 
      value: 'poem', 
      description: 'Verses, lyrics, free verse', 
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
             </svg>` 
    },
    { 
      label: 'Article', 
      value: 'article', 
      description: 'News, opinion, research', 
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
             </svg>` 
    },
    { 
      label: 'Cinema Essay', 
      value: 'cinema_essay', 
      description: 'Film analysis, reviews', 
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
             </svg>` 
    },
    { 
      label: 'Prose', 
      value: 'prose', 
      description: 'Short stories, narratives', 
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
             </svg>` 
    }
  ];

  // Toast state
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private fb: FormBuilder, 
    private backendService: BackendService, 
    private authService: AuthService,
    private router: Router
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
    // Mock implementation for now - drafts API not implemented yet
    console.log('Loading drafts (mock implementation)');
    this.drafts = []; // Empty for now
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
      ...formValue,
      contents: contentsWithType,
      authorId: this.loggedInUser?.id,
      submissionType: this.selectedType,
      status: 'draft',
      lastModified: new Date().toISOString()
    };

    console.log('Saving draft with payload:', draftPayload);
    
    // Simulate API call for now
    setTimeout(() => {
      this.isSavingDraft = false;
      this.showToast('Draft saved successfully!', 'success');
      // TODO: Implement actual draft saving API call
    }, 1000);
  }

  loadDraft(draft: Draft): void {
    this.currentDraft = draft;
    this.selectedType = draft.submissionType;
    
    // Populate form with draft data
    this.form.patchValue({
      title: draft.title,
      submissionType: draft.submissionType,
      description: draft.description
    });

    // Populate contents
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    draft.contents.forEach(content => {
      const group = this.createContentGroup();
      group.patchValue(content);
      contentsArray.push(group);
    });

    this.showDrafts = false;
    this.showToast('Draft loaded successfully!', 'success');
  }

  loadDraftAndSwitchToSubmit(draft: Draft): void {
    this.loadDraft(draft);
    this.activeTab = 'submit';
  }

  deleteDraft(draftId: string): void {
    // Mock implementation for now - drafts API not implemented yet
    console.log('Deleting draft (mock implementation):', draftId);
    this.showToast('Draft functionality not implemented yet', 'info');
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
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
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

  // Cleanup on destroy
  ngOnDestroy(): void {
    // Component cleanup
  }
}