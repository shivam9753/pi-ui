import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { GrievanceForm, ApiResponse } from '../../models';

@Component({
  selector: 'app-grievance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './grievance-form.component.html',
  styleUrl: './grievance-form.component.css'
})
export class GrievanceFormComponent implements OnInit, OnDestroy {
  grievanceForm!: FormGroup;
  isSubmitting = false;
  submitted = false;
  isAuthenticated = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private backendService: BackendService,
    private authService: AuthService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Check authentication status
    this.authService.isLoggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth: boolean) => {
        this.isAuthenticated = isAuth;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.grievanceForm = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(200)
      ]],
      message: ['', [
        Validators.required,
        Validators.minLength(20),
        Validators.maxLength(2000)
      ]]
    });
  }

  get title() {
    return this.grievanceForm.get('title');
  }

  get message() {
    return this.grievanceForm.get('message');
  }

  get titleCharCount(): number {
    return this.title?.value?.length || 0;
  }

  get messageCharCount(): number {
    return this.message?.value?.length || 0;
  }

  get messageWordCount(): number {
    const text = this.message?.value || '';
    return text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  }

  onSubmit(): void {
    if (this.grievanceForm.valid && !this.isSubmitting && this.isAuthenticated) {
      this.isSubmitting = true;
      
      const formData: GrievanceForm = {
        title: this.title?.value.trim(),
        message: this.message?.value.trim()
      };

      this.backendService.submitGrievance(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ApiResponse<any>) => {
            console.log('Grievance submitted successfully:', response);
            this.submitted = true;
            this.grievanceForm.reset();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error submitting grievance:', error);
            this.isSubmitting = false;
            // Error handling - could add toast notification here
          }
        });
    } else {
      // Mark form as touched to show validation errors
      this.grievanceForm.markAllAsTouched();
    }
  }

  resetForm(): void {
    this.grievanceForm.reset();
    this.submitted = false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.grievanceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.grievanceForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
    }
    return '';
  }
}