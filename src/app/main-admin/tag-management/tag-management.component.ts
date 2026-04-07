import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  createdAt?: string;
}

@Component({
  selector: 'app-tag-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './tag-management.component.html',
  styleUrls: ['./tag-management.component.css']
})
export class TagManagementComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  tags: Tag[] = [];
  filteredTags: Tag[] = [];
  pagedTags: Tag[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  successMessage = '';
  errorMessage = '';
  searchQuery = '';

  displayedColumns = ['index', 'name', 'slug', 'createdAt', 'actions'];
  pageSize = 10;
  pageIndex = 0;

  createForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
    });
  }

  ngOnInit() {
    this.loadTags();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTags(search = '') {
    this.loading = true;
    this.clearMessages();
    const params: any = { limit: 200, skip: 0 };
    if (search) params.search = search;

    this.api.get<any>('/tags/all', params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tags = res.tags || [];
          this.filteredTags = this.tags;
          this.pageIndex = 0;
          this.updatePagedTags();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'Failed to load tags';
          this.loading = false;
        }
      });
  }

  onSearch(query: string) {
    this.searchQuery = query;
    const q = query.trim().toLowerCase();
    if (q) {
      this.filteredTags = this.tags.filter(t =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
      );
    } else {
      this.filteredTags = this.tags;
    }
    this.pageIndex = 0;
    this.updatePagedTags();
  }

  onPage(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedTags();
  }

  private updatePagedTags() {
    const start = this.pageIndex * this.pageSize;
    this.pagedTags = this.filteredTags.slice(start, start + this.pageSize);
  }

  createTag() {
    if (this.createForm.invalid || this.saving) return;
    this.saving = true;
    this.clearMessages();

    const name = this.createForm.value.name.trim();

    this.api.post<any>('/tags', { name })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.successMessage = `Tag "${res.tag.name}" created successfully`;
          this.createForm.reset();
          this.saving = false;
          this.loadTags();
        },
        error: (err) => {
          this.errorMessage = err.message || 'Failed to create tag';
          this.saving = false;
        }
      });
  }

  deleteTag(tag: Tag) {
    if (this.deletingId) return;
    if (!confirm(`Delete tag "${tag.name}"? This will not remove it from existing content.`)) return;

    this.deletingId = tag._id;
    this.clearMessages();

    this.api.delete<any>(`/tags/${tag._id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Tag "${tag.name}" deleted`;
          this.deletingId = null;
          this.tags = this.tags.filter(t => t._id !== tag._id);
          this.onSearch(this.searchQuery);
        },        error: (err) => {
          this.errorMessage = err.message || 'Failed to delete tag';
          this.deletingId = null;
        }
      });
  }

  private clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  get totalCount(): number {
    return this.tags.length;
  }
}
