import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';
import { BackendService } from '../../services/backend.service';

export interface ResponseTemplate {
  _id: string;
  title: string;
  action: 'accept' | 'reject' | 'revision' | 'shortlist';
  submissionType: string;
  tone: 'warm' | 'neutral' | 'firm';
  body: string;
  createdAt: string;
}

@Component({
  selector: 'app-response-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminPageHeaderComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './response-templates.component.html',
  styleUrls: ['./response-templates.component.css']
})
export class ResponseTemplatesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  templates: ResponseTemplate[] = [];
  loading = false;
  saving = false;

  // filters
  filterAction = '';
  filterType = '';
  filterTone = '';

  // edit state
  editingId: string | null = null;

  // toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimeout: any;

  // copy feedback
  copiedId: string | null = null;

  readonly ACTIONS = ['accept', 'reject', 'revision', 'shortlist'];
  readonly SUBMISSION_TYPES = ['poem', 'article', 'prose', 'opinion', 'cinema_essay', 'book_review', 'all'];
  readonly TONES = ['warm', 'neutral', 'firm'];

  createForm: FormGroup;
  editForms: Map<string, FormGroup> = new Map();

  constructor(private readonly fb: FormBuilder, private readonly backend: BackendService) {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      action: ['reject', Validators.required],
      submissionType: ['all', Validators.required],
      tone: ['neutral', Validators.required],
      body: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.toastTimeout);
  }

  loadTemplates(): void {
    this.loading = true;
    const params: any = {};
    if (this.filterAction) params.action = this.filterAction;
    if (this.filterType) params.submissionType = this.filterType;
    if (this.filterTone) params.tone = this.filterTone;

    this.backend.getResponseTemplates(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.templates = Array.isArray(data) ? data : (data.templates ?? []);
          this.loading = false;
        },
        error: () => {
          this.showToast('Failed to load templates', 'error');
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadTemplates();
  }

  clearFilters(): void {
    this.filterAction = '';
    this.filterType = '';
    this.filterTone = '';
    this.loadTemplates();
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.backend.createResponseTemplate(this.createForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.createForm.reset({ action: 'reject', submissionType: 'all', tone: 'neutral', title: '', body: '' });
          this.saving = false;
          this.showToast('Template created', 'success');
          this.loadTemplates();
        },
        error: () => {
          this.saving = false;
          this.showToast('Failed to create template', 'error');
        }
      });
  }

  startEdit(t: ResponseTemplate): void {
    this.editingId = t._id;
    this.editForms.set(t._id, this.fb.group({
      title: [t.title, Validators.required],
      action: [t.action, Validators.required],
      submissionType: [t.submissionType, Validators.required],
      tone: [t.tone, Validators.required],
      body: [t.body, Validators.required],
    }));
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  submitEdit(id: string): void {
    const form = this.editForms.get(id);
    if (!form || form.invalid) { form?.markAllAsTouched(); return; }
    this.saving = true;
    this.backend.updateResponseTemplate(id, form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.editingId = null;
          this.saving = false;
          this.showToast('Template updated', 'success');
          this.loadTemplates();
        },
        error: () => {
          this.saving = false;
          this.showToast('Failed to update template', 'error');
        }
      });
  }

  deleteTemplate(id: string): void {
    if (!confirm('Delete this template?')) return;
    this.backend.deleteResponseTemplate(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.templates = this.templates.filter(t => t._id !== id);
          this.showToast('Template deleted', 'success');
        },
        error: () => this.showToast('Failed to delete template', 'error')
      });
  }

  copyBody(t: ResponseTemplate): void {
    navigator.clipboard.writeText(t.body).then(() => {
      this.copiedId = t._id;
      setTimeout(() => { if (this.copiedId === t._id) this.copiedId = null; }, 2000);
    }).catch(() => this.showToast('Copy failed', 'error'));
  }

  getEditForm(id: string): FormGroup {
    return this.editForms.get(id)!;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimeout);
    this.toast = { message, type };
    this.toastTimeout = setTimeout(() => (this.toast = null), 3000);
  }
}
