import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { AdminPageHeaderComponent, AdminPageStat } from '../../shared/components/admin-page-header/admin-page-header.component';
import { CommonUtils } from '../../shared/utils';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationConfig,
  PROMPTS_TABLE_COLUMNS,
  createPromptActions,
  SUBMISSION_BADGE_CONFIG
} from '../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../shared/components/simple-submission-filter/simple-submission-filter.component';


interface Prompt {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  picture?: string;
  isActive: boolean;
  usageCount: number;
  createdBy?: any;
  createdAt?: string;
  formattedCreatedAt?: string;
}

@Component({
  selector: 'app-prompt-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AdminPageHeaderComponent, DataTableComponent, SimpleSubmissionFilterComponent],
  templateUrl: './prompt-management.component.html',
  styleUrl: './prompt-management.component.css'
})
export class PromptManagementComponent implements OnInit {
  // Table configuration
  columns: TableColumn[] = PROMPTS_TABLE_COLUMNS;
  actions: TableAction[] = [];
  badgeConfig = SUBMISSION_BADGE_CONFIG;
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0
  };
  
  // All prompts data
  allPrompts: Prompt[] = [];
  filteredPrompts: Prompt[] = [];
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};
  
  // Loading states
  isLoading = true;
  loading = true; // Alias for isLoading for template compatibility
  isSaving = false;
  
  // Form
  promptForm: FormGroup;
  editingPrompt: Prompt | null = null;
  showCreateForm = false;
  selectedTags: string[] = [];
  
  // Make Math available in template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private backendService: BackendService,
    private authService: AuthService
  ) {
    this.promptForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      tags: [''],
      picture: [''],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.setupTableActions();
    this.loadAllPrompts();
  }

  setupTableActions() {
    this.actions = createPromptActions(
      (prompt) => this.editPrompt(prompt),
      (prompt) => this.togglePromptStatus(prompt),
      (prompt) => this.deletePrompt(prompt)
    );
  }

  loadAllPrompts() {
    this.isLoading = true;
    this.loading = true;
    this.backendService.getAllPrompts().subscribe({
      next: (response: { success: any; data: Prompt[]; }) => {
        if (response.success) {
          this.allPrompts = response.data.map(prompt => ({
            ...prompt,
            formattedCreatedAt: prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : 'N/A'
          }));
          this.applyFilters();
        }
        this.isLoading = false;
        this.loading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let prompts = [...this.allPrompts];
    
    // Apply search filter
    if (this.currentFilters.search) {
      const searchTerm = this.currentFilters.search.toLowerCase();
      prompts = prompts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    const sortBy = this.currentFilters.sortBy || 'createdAt';
    const order = this.currentFilters.order || 'desc';
    
    prompts.sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (order === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    this.filteredPrompts = prompts;
    this.paginationConfig.totalItems = prompts.length;
    this.paginationConfig.totalPages = Math.ceil(prompts.length / this.paginationConfig.pageSize);
    this.paginationConfig.currentPage = 1; // Reset to first page when filters change
  }

  get paginatedPrompts() {
    const startIndex = (this.paginationConfig.currentPage - 1) * this.paginationConfig.pageSize;
    const endIndex = startIndex + this.paginationConfig.pageSize;
    return this.filteredPrompts.slice(startIndex, endIndex);
  }

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.applyFilters();
  }

  createPrompt() {
    this.editingPrompt = null;
    this.selectedTags = [];
    this.promptForm.reset({
      isActive: true
    });
    this.showCreateForm = true;
  }

  editPrompt(prompt: Prompt) {
    this.editingPrompt = prompt;
    this.selectedTags = prompt.tags || [];
    this.promptForm.patchValue({
      title: prompt.title,
      description: prompt.description,
      tags: '', // Clear the tags form control since we use selectedTags array
      picture: prompt.picture || '',
      isActive: prompt.isActive
    });
    this.showCreateForm = true;
  }

  savePrompt() {
    if (this.promptForm.invalid) return;
    
    this.isSaving = true;
    const formData = this.promptForm.value;
    
    const promptData = {
      ...formData,
      tags: this.selectedTags
    };
    
    const request = this.editingPrompt 
      ? this.backendService.updatePrompt(this.editingPrompt._id, promptData)
      : this.backendService.createPrompt(promptData);
    
    request.subscribe({
      next: (response: any) => {
        // Handle both success field and direct response
        if (response.success !== false) {
          this.showCreateForm = false;
          this.selectedTags = [];
          this.loadAllPrompts();
        }
        this.isSaving = false;
      },
      error: (error: any) => {
        this.isSaving = false;
      }
    });
  }

  deletePrompt(prompt: Prompt) {
    if (!confirm(`Are you sure you want to delete "${prompt.title}"?`)) return;
    
    this.backendService.deletePrompt(prompt._id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadAllPrompts();
        }
      },
      error: (error: any) => {
        // Error deleting prompt
      }
    });
  }

  togglePromptStatus(prompt: Prompt) {
    this.backendService.togglePromptStatus(prompt._id).subscribe({
      next: (response: any) => {
        if (response.success) {
          prompt.isActive = response.isActive;
        }
      },
      error: (error: any) => {
        console.error('Error toggling prompt status:', error);
      }
    });
  }


  cancelEdit() {
    this.showCreateForm = false;
    this.editingPrompt = null;
    this.selectedTags = [];
    this.promptForm.reset();
  }

  // Tag management methods
  addTag(tagValue: string, inputElement: HTMLInputElement) {
    const tag = tagValue.trim().toLowerCase();
    if (tag && !this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
    }
    inputElement.value = '';
  }

  removeTag(tagToRemove: string) {
    this.selectedTags = this.selectedTags.filter(tag => tag !== tagToRemove);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.paginationConfig.totalPages) {
      this.paginationConfig.currentPage = page;
    }
  }

  onTablePageChange(page: number) {
    this.paginationConfig.currentPage = page;
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.currentFilters.sortBy = event.column;
    this.currentFilters.order = event.direction;
    this.applyFilters();
  }

  trackByPromptId(index: number, prompt: Prompt): string {
    return prompt._id;
  }

  getBadgeClass(key: string): string {
    return (this.badgeConfig as any)[key] || 'px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-700';
  }


  // New methods for mobile-optimized filters
  refreshPrompts(): void {
    this.loadAllPrompts();
  }

  loadPrompts(): void {
    this.loadAllPrompts();
  }
}