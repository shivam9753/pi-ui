import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, GoogleUser } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ContentEditorComponent } from '../content-editor/content-editor.component';

export interface EditableSubmission {
  _id: string;
  title: string;
  description: string;
  submissionType: string;
  contents: any[];
  status: 'draft' | 'pending_review' | 'in_progress' | 'needs_revision' | 'accepted' | 'published' | 'rejected' | 'resubmitted';
  revisionNotes?: string;
  reviewFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
  publishedAt?: string;
  wordCount?: number;
}

@Component({
  selector: 'app-edit-submission',
  templateUrl: './edit-submission.component.html',
  styleUrls: ['./edit-submission.component.css'],
  imports: [
    ReactiveFormsModule, 
    FormsModule,
    CommonModule, 
    ContentEditorComponent
  ]
})
export class EditSubmissionComponent implements OnInit {
  form: FormGroup;
  loggedInUser: GoogleUser | null = null;
  submission: EditableSubmission | null = null;
  submissionId: string = '';
  isResubmitting: boolean = false; // true for resubmit, false for edit
  
  // Form state
  isSubmitting = false;
  isSaving = false;
  hasChanges = false;
  
  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  submissionTypes = [
    { 
      label: 'Opinion', 
      value: 'opinion', 
      description: 'Your perspective on current topics',
      icon: '💭'
    },
    { 
      label: 'Poem', 
      value: 'poem', 
      description: 'Verses, lyrics, free verse',
      icon: '📝'
    },
    { 
      label: 'Prose', 
      value: 'prose', 
      description: 'Short stories, narratives',
      icon: '📖'
    },
    { 
      label: 'Article', 
      value: 'article', 
      description: 'In-depth analysis, research',
      icon: '📰'
    },
    { 
      label: 'Book Review', 
      value: 'book_review', 
      description: 'Book analysis, recommendations',
      icon: '📚'
    },
    { 
      label: 'Cinema Essay', 
      value: 'cinema_essay', 
      description: 'Film analysis, reviews',
      icon: '🎬'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private backendService: BackendService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      submissionType: ['', Validators.required],
      contents: this.fb.array([])
    });
  }

  ngOnInit() {
    // Get user data
    this.authService.user$.subscribe(user => {
      this.loggedInUser = user;
    });

    // Get submission ID from route
    this.route.params.subscribe(params => {
      this.submissionId = params['id'];
      if (this.submissionId) {
        this.loadSubmission();
      }
    });

    // Check if this is a resubmit action
    this.route.queryParams.subscribe(queryParams => {
      this.isResubmitting = queryParams['action'] === 'resubmit';
      // Both 'edit' and 'resubmit' actions use the same interface, just different labeling
    });

    // Track form changes
    this.form.valueChanges.subscribe(() => {
      this.hasChanges = true;
    });
  }

  loadSubmission() {
    this.backendService.getSubmissionWithContents(this.submissionId).subscribe({
      next: (data: any) => {
        this.submission = data;
        this.populateForm(data);
      },
      error: (error: any) => {
        let errorMessage = 'Error loading submission. Please try again.';
        
        if (error.status === 404) {
          errorMessage = 'Submission not found. You may not have permission to edit this submission.';
        } else if (error.status === 401) {
          errorMessage = 'You need to be logged in to edit this submission.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to edit this submission.';
        }
        
        this.showToast(errorMessage, 'error');
        this.router.navigate(['/user-profile']);
      }
    });
  }

  populateForm(submission: EditableSubmission) {
    
    this.form.patchValue({
      title: submission.title,
      description: submission.description,
      submissionType: submission.submissionType
    });

    // Populate contents array
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();

    if (submission.contents && submission.contents.length > 0) {
      submission.contents.forEach((content, index) => {
        contentsArray.push(this.fb.group({
          title: [content.title || '', [Validators.required]],
          body: [content.body || '', [Validators.required]],
          type: [content.type || submission.submissionType]
        }));
      });
    } else {
      // Add at least one content item
      this.addContent();
    }

    this.hasChanges = false;
  }

  get contentsArray(): FormArray {
    return this.form.get('contents') as FormArray;
  }

  addContent() {
    const contentGroup = this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      type: [this.form.value.submissionType || 'poem']
    });
    
    this.contentsArray.push(contentGroup);
  }

  removeContent(index: number) {
    if (this.contentsArray.length > 1) {
      this.contentsArray.removeAt(index);
    }
  }

  onTypeChange() {
    // Update content types when submission type changes
    const newType = this.form.value.submissionType;
    this.contentsArray.controls.forEach(control => {
      control.get('type')?.setValue(newType);
    });
  }

  saveChanges() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    this.isSaving = true;
    const formData = this.form.value;
    
    // Clean form data - remove empty optional fields
    const cleanedData = { ...formData };
    if (!cleanedData.description || cleanedData.description.trim() === '') {
      delete cleanedData.description;
    }

    this.backendService.updateSubmission(this.submissionId, cleanedData).subscribe({
      next: (response: any) => {
        this.showToast('Changes saved successfully!', 'success');
        this.hasChanges = false;
        this.isSaving = false;
        
        // Reload submission data
        this.loadSubmission();
      },
      error: (error: any) => {
        this.showToast('Error saving changes. Please try again.', 'error');
        this.isSaving = false;
      }
    });
  }

  submitForReview() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.showToast('Please fill in all required fields before submitting.', 'error');
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;
    
    // Clean form data - remove empty optional fields
    const cleanedData = { ...formData };
    if (!cleanedData.description || cleanedData.description.trim() === '') {
      delete cleanedData.description;
    }

    if (this.isResubmitting) {
      // Resubmit after revision
      this.backendService.resubmitSubmission(this.submissionId, cleanedData).subscribe({
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
    } else {
      // Update and change status to pending_review
      cleanedData.status = 'pending_review';
      this.backendService.updateSubmission(this.submissionId, cleanedData).subscribe({
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

  cancel() {
    if (this.hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/user-profile']);
      }
    } else {
      this.router.navigate(['/user-profile']);
    }
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast(): void {
    this.showToastFlag = false;
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

  // Helper methods
  getSubmissionTypeInfo() {
    return this.submissionTypes.find(type => type.value === this.form.value.submissionType);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'needs_revision':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'pending_review':
        return 'bg-amber-100 text-amber-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'needs_revision':
        return 'Needs Revision';
      case 'draft':
        return 'Draft';
      case 'pending_review':
        return 'Pending Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  // Helper method to get total word count from all content items
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

  // Helper method to determine if images should be allowed for the current submission type
  shouldAllowImages(): boolean {
    const submissionType = this.form.get('submissionType')?.value;
    return submissionType === 'article' || submissionType === 'cinema_essay';
  }

  // Helper methods for form management (similar to submission form)
  getContentControls() {
    return (this.form.controls['contents'] as FormArray).controls;
  }

  getContentsFormArray(): FormArray {
    return this.form.get('contents') as FormArray;
  }

  // Content management
  onContentChanged(contents: any[]): void {
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    contents.forEach(content => {
      const group = this.fb.group({
        title: [content.title || '', Validators.required],
        body: [content.body || '', Validators.required],
        type: [content.type || this.form.get('submissionType')?.value]
      });
      contentsArray.push(group);
    });
  }

  // Validation methods
  validateForm(): boolean {
    const contents = this.form.get('contents') as FormArray;
    return !!this.form.get('submissionType')?.value && contents.controls.every(content => 
      content.get('title')?.value?.trim() && content.get('body')?.value?.trim()
    );
  }

  getTypeDisplayName(): string {
    const typeMap: { [key: string]: string } = {
      'poem': 'Poetry',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    const currentType = this.form.get('submissionType')?.value;
    return typeMap[currentType] || 'Content';
  }

  // Content checking
  hasContent(): boolean {
    const contents = this.form.get('contents') as FormArray;
    return contents.controls.some(content => 
      content.get('body')?.value?.trim() || content.get('title')?.value?.trim()
    );
  }

  // Math utility for template
  Math = Math;
}