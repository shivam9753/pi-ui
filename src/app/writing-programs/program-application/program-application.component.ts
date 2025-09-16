import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { WritingProgram, ProgramApplicationForm, WritingSample, CriteriaQuestion } from '../../models';

@Component({
  selector: 'app-program-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './program-application.component.html',
  styleUrl: './program-application.component.css'
})
export class ProgramApplicationComponent implements OnInit, OnDestroy {
  program: WritingProgram | null = null;
  applicationForm!: FormGroup;
  writingSamplesForm!: FormArray;
  
  loading = true;
  submitting = false;
  submitted = false;
  error = '';
  isAuthenticated = false;
  
  private destroy$ = new Subject<void>();
  private programSlug = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private authService: AuthService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    // Check authentication
    this.authService.isLoggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth: boolean) => {
        this.isAuthenticated = isAuth;
      });

    // Get program slug from route
    this.programSlug = this.route.snapshot.paramMap.get('slug') || '';
    if (this.programSlug) {
      this.loadProgram();
    } else {
      this.error = 'Program not found';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.applicationForm = this.fb.group({
      criteriaResponses: this.fb.group({}),
      writingSamples: this.fb.array([])
    });
    
    this.writingSamplesForm = this.applicationForm.get('writingSamples') as FormArray;
  }

  loadProgram(): void {
    this.loading = true;
    this.error = '';

    this.backendService.getWritingProgramBySlug(this.programSlug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.program = response.program;
          this.setupFormForProgram();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading program:', error);
          this.error = 'Program not found or no longer accepting applications';
          this.loading = false;
        }
      });
  }

  private setupFormForProgram(): void {
    if (!this.program) return;

    // Setup criteria questions
    const criteriaGroup = this.fb.group({});
    if (this.program.criteria?.questions) {
      this.program.criteria.questions.forEach(question => {
        const validators = [];
        if (question.required) {
          validators.push(Validators.required);
        }
        if (question.validation?.minLength) {
          validators.push(Validators.minLength(question.validation.minLength));
        }
        if (question.validation?.maxLength) {
          validators.push(Validators.maxLength(question.validation.maxLength));
        }
        
        criteriaGroup.addControl(question.id, this.fb.control('', validators));
      });
    }
    
    this.applicationForm.setControl('criteriaResponses', criteriaGroup);

    // Setup writing samples if required
    if (this.program.criteria?.requiresWritingSamples) {
      const minSamples = this.program.criteria.minWritingSamples || 1;
      for (let i = 0; i < minSamples; i++) {
        this.addWritingSample();
      }
    }
  }

  addWritingSample(): void {
    if (!this.program) return;
    
    const maxSamples = this.program.criteria?.maxWritingSamples || 3;
    if (this.writingSamplesForm.length >= maxSamples) {
      return;
    }

    const sampleForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      content: ['', [Validators.required, Validators.minLength(50)]]
    });

    this.writingSamplesForm.push(sampleForm);
  }

  removeWritingSample(index: number): void {
    if (!this.program) return;
    
    const minSamples = this.program.criteria?.minWritingSamples || 1;
    if (this.writingSamplesForm.length > minSamples) {
      this.writingSamplesForm.removeAt(index);
    }
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  isWordCountValid(text: string): boolean {
    if (!this.program) return true;
    const wordCount = this.getWordCount(text);
    const maxWords = this.program.criteria?.maxWordCount || 2000;
    return wordCount <= maxWords;
  }

  getWordCountClass(text: string): string {
    if (!this.program) return '';
    const wordCount = this.getWordCount(text);
    const maxWords = this.program.criteria?.maxWordCount || 2000;
    const percentage = (wordCount / maxWords) * 100;
    
    if (percentage >= 100) {
      return 'text-red-600 font-medium';
    } else if (percentage >= 90) {
      return 'text-orange-600';
    } else if (percentage >= 80) {
      return 'text-yellow-600';
    }
    return 'text-gray-500';
  }

  onSubmit(): void {
    if (!this.applicationForm.valid || !this.isAuthenticated || !this.program) {
      this.applicationForm.markAllAsTouched();
      return;
    }

    // Validate writing samples word count
    const writingSamples = this.writingSamplesForm.value as WritingSample[];
    for (const sample of writingSamples) {
      if (!this.isWordCountValid(sample.content)) {
        this.error = `Writing sample "${sample.title}" exceeds the maximum word count of ${this.program.criteria?.maxWordCount} words.`;
        return;
      }
    }

    this.submitting = true;
    this.error = '';

    const applicationData: ProgramApplicationForm = {
      criteriaResponses: this.applicationForm.get('criteriaResponses')?.value || {},
      writingSamples: writingSamples.map(sample => ({
        ...sample,
        wordCount: this.getWordCount(sample.content)
      }))
    };

    this.backendService.submitWritingProgramApplication(this.program._id, applicationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Application submitted successfully:', response);
          this.submitted = true;
          this.submitting = false;
        },
        error: (error) => {
          console.error('Error submitting application:', error);
          this.error = error.error?.message || 'Failed to submit application. Please try again.';
          this.submitting = false;
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.applicationForm.get(['criteriaResponses', fieldName]);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(question: CriteriaQuestion): string {
    const field = this.applicationForm.get(['criteriaResponses', question.id]);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
      }
    }
    return '';
  }

  isSampleFieldInvalid(sampleIndex: number, fieldName: string): boolean {
    const field = this.writingSamplesForm.at(sampleIndex)?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getSampleFieldError(sampleIndex: number, fieldName: string): string {
    const field = this.writingSamplesForm.at(sampleIndex)?.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
      }
    }
    return '';
  }

  formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `${diffDays} days left`;
    }
  }

  canAddMoreSamples(): boolean {
    if (!this.program) return false;
    const maxSamples = this.program.criteria?.maxWritingSamples || 3;
    return this.writingSamplesForm.length < maxSamples;
  }

  canRemoveSample(): boolean {
    if (!this.program) return false;
    const minSamples = this.program.criteria?.minWritingSamples || 1;
    return this.writingSamplesForm.length > minSamples;
  }
}