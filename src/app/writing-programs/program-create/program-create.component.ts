import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { WritingProgramForm, CriteriaQuestion, QuestionType } from '../../models/writing-program.model';

@Component({
  selector: 'app-program-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './program-create.component.html',
  styleUrl: './program-create.component.css'
})
export class ProgramCreateComponent implements OnInit, OnDestroy {
  programForm!: FormGroup;
  isSubmitting = false;
  error = '';
  
  questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'select', label: 'Single Choice' },
    { value: 'multiselect', label: 'Multiple Choice' },
    { value: 'number', label: 'Number' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private backendService: BackendService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.programForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      applicationDeadline: ['', Validators.required],
      maxApplications: [100, [Validators.required, Validators.min(1)]],
      isPublic: [true],
      criteria: this.fb.group({
        requiresWritingSamples: [false],
        minWritingSamples: [1, [Validators.min(1)]],
        maxWritingSamples: [3, [Validators.min(1)]],
        maxWordCount: [1000, [Validators.min(100)]],
        questions: this.fb.array([])
      })
    });

    // Add a default question
    this.addQuestion();
  }

  get questions(): FormArray {
    return this.programForm?.get('criteria.questions') as FormArray;
  }

  get criteriGroup(): FormGroup {
    return this.programForm?.get('criteria') as FormGroup;
  }

  addQuestion(): void {
    const question = this.fb.group({
      id: [this.generateQuestionId()],
      type: ['text', [Validators.required]],
      question: ['', [Validators.required, Validators.minLength(5)]],
      required: [false],
      options: this.fb.array([]),
      validation: this.fb.group({
        maxLength: [''],
        minLength: [''],
        pattern: ['']
      })
    });

    this.questions.push(question);
  }

  removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.removeAt(index);
    }
  }

  getQuestionOptions(questionIndex: number): FormArray {
    if (!this.questions || this.questions.length <= questionIndex) {
      return this.fb.array([]);
    }
    const question = this.questions.at(questionIndex);
    if (!question) {
      return this.fb.array([]);
    }
    return question.get('options') as FormArray;
  }

  addOption(questionIndex: number): void {
    const options = this.getQuestionOptions(questionIndex);
    options.push(this.fb.control('', Validators.required));
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const options = this.getQuestionOptions(questionIndex);
    if (options.length > 1) {
      options.removeAt(optionIndex);
    }
  }

  onQuestionTypeChange(questionIndex: number, event: Event): void {
    const type = (event.target as HTMLSelectElement)?.value as QuestionType;
    const question = this.questions.at(questionIndex);
    const options = this.getQuestionOptions(questionIndex);
    
    if (type === 'select' || type === 'multiselect') {
      // Add default options if none exist
      if (options.length === 0) {
        this.addOption(questionIndex);
        this.addOption(questionIndex);
      }
    } else {
      // Clear options for non-select types
      while (options.length > 0) {
        options.removeAt(0);
      }
    }
  }

  onWritingSamplesToggle(event: Event): void {
    const enabled = (event.target as HTMLInputElement)?.checked || false;
    const minSamples = this.criteriGroup.get('minWritingSamples');
    const maxSamples = this.criteriGroup.get('maxWritingSamples');
    const maxWordCount = this.criteriGroup.get('maxWordCount');

    if (enabled) {
      minSamples?.setValidators([Validators.required, Validators.min(1)]);
      maxSamples?.setValidators([Validators.required, Validators.min(1)]);
      maxWordCount?.setValidators([Validators.required, Validators.min(100)]);
    } else {
      minSamples?.clearValidators();
      maxSamples?.clearValidators();
      maxWordCount?.clearValidators();
    }

    minSamples?.updateValueAndValidity();
    maxSamples?.updateValueAndValidity();
    maxWordCount?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.programForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = '';

      const formData = this.programForm.value;
      const programData: WritingProgramForm = {
        title: formData.title,
        description: formData.description,
        applicationDeadline: formData.applicationDeadline,
        maxApplications: formData.maxApplications,
        isPublic: formData.isPublic,
        criteria: {
          ...formData.criteria,
          questions: formData.criteria.questions.map((q: any) => ({
            ...q,
            options: q.options || []
          }))
        }
      };

      this.backendService.createWritingProgram(programData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Program created successfully:', response);
            this.router.navigate(['/admin'], { fragment: 'responses' });
          },
          error: (error) => {
            console.error('Error creating program:', error);
            this.error = error.error?.message || 'Failed to create program. Please try again.';
            this.isSubmitting = false;
          }
        });
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.programForm.controls).forEach(key => {
      const control = this.programForm.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        } else if (control instanceof FormArray) {
          this.markFormArrayTouched(control);
        }
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        } else if (control instanceof FormArray) {
          this.markFormArrayTouched(control);
        }
      }
    });
  }

  private markFormArrayTouched(formArray: FormArray): void {
    formArray.controls.forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        this.markFormArrayTouched(control);
      }
    });
  }

  private generateQuestionId(): string {
    return 'q_' + Math.random().toString(36).substr(2, 9);
  }

  cancel(): void {
    this.router.navigate(['/admin'], { fragment: 'responses' });
  }

  getFieldError(fieldName: string): string {
    const field = this.programForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return 'This field is required';
      }
      if (field.errors?.['minLength']) {
        return `Minimum ${field.errors['minLength'].requiredLength} characters required`;
      }
      if (field.errors?.['min']) {
        return `Minimum value is ${field.errors['min'].min}`;
      }
    }
    return '';
  }

  getQuestionError(questionIndex: number, fieldName: string): string {
    if (!this.questions || this.questions.length <= questionIndex) {
      return '';
    }
    const question = this.questions.at(questionIndex);
    if (!question) {
      return '';
    }
    const field = question.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return 'This field is required';
      }
      if (field.errors?.['minLength']) {
        return `Minimum ${field.errors['minLength'].requiredLength} characters required`;
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.programForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  isQuestionFieldInvalid(questionIndex: number, fieldName: string): boolean {
    if (!this.questions || this.questions.length <= questionIndex) {
      return false;
    }
    const question = this.questions.at(questionIndex);
    if (!question) {
      return false;
    }
    const field = question.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}