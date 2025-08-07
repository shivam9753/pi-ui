import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../services/backend.service';
import { AuthService } from '../../../services/auth.service';

interface Prompt {
  _id: string;
  title: string;
  description: string;
  type: 'poem' | 'prose' | 'article' | 'cinema_essay';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  picture?: string;
  featured: boolean;
  isActive: boolean;
  usageCount: number;
  createdBy?: any;
  createdAt?: string;
  formattedCreatedAt?: string;
}

@Component({
  selector: 'app-prompt-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prompt-management.component.html',
  styleUrl: './prompt-management.component.css'
})
export class PromptManagementComponent implements OnInit {
  // All prompts data
  allPrompts: Prompt[] = [];
  filteredPrompts: Prompt[] = [];
  
  
  // Filters
  manageType = '';
  manageSearch = '';
  manageStatus = 'all'; // 'all', 'active', 'inactive'
  
  // Loading states
  isLoading = true;
  isSaving = false;
  
  // Form
  promptForm: FormGroup;
  editingPrompt: Prompt | null = null;
  showCreateForm = false;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  
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
      type: ['', Validators.required],
      tags: [''],
      difficulty: ['beginner', Validators.required],
      picture: [''],
      featured: [false],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadAllPrompts();
  }

  loadAllPrompts() {
    this.isLoading = true;
    this.backendService.getAllPrompts().subscribe({
      next: (response: { success: any; data: Prompt[]; }) => {
        if (response.success) {
          this.allPrompts = response.data.map(prompt => ({
            ...prompt,
            formattedCreatedAt: prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : 'N/A'
          }));
          this.applyManageFilters();
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading prompts:', error);
        this.isLoading = false;
      }
    });
  }

  applyManageFilters() {
    let prompts = [...this.allPrompts];
    
    if (this.manageType) {
      prompts = prompts.filter(p => p.type === this.manageType);
    }
    
    if (this.manageStatus === 'active') {
      prompts = prompts.filter(p => p.isActive);
    } else if (this.manageStatus === 'inactive') {
      prompts = prompts.filter(p => !p.isActive);
    }
    
    if (this.manageSearch) {
      const searchTerm = this.manageSearch.toLowerCase();
      prompts = prompts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    this.totalItems = prompts.length;
    this.filteredPrompts = prompts;
    this.currentPage = 1; // Reset to first page when filters change
  }

  get paginatedPrompts() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredPrompts.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  onFilterChange() {
    this.applyManageFilters();
  }

  createPrompt() {
    this.editingPrompt = null;
    this.promptForm.reset({
      difficulty: 'beginner',
      featured: false,
      isActive: true
    });
    this.showCreateForm = true;
  }

  editPrompt(prompt: Prompt) {
    this.editingPrompt = prompt;
    this.promptForm.patchValue({
      title: prompt.title,
      description: prompt.description,
      type: prompt.type,
      tags: prompt.tags.join(', '),
      difficulty: prompt.difficulty,
      picture: prompt.picture || '',
      featured: prompt.featured,
      isActive: prompt.isActive
    });
    this.showCreateForm = true;
  }

  savePrompt() {
    if (this.promptForm.invalid) return;
    
    this.isSaving = true;
    const formData = this.promptForm.value;
    
    // Process tags
    const tags = formData.tags 
      ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];
    
    const promptData = {
      ...formData,
      tags
    };
    
    const request = this.editingPrompt 
      ? this.backendService.updatePrompt(this.editingPrompt._id, promptData)
      : this.backendService.createPrompt(promptData);
    
    request.subscribe({
      next: (response: any) => {
        console.log('Save prompt response:', response);
        // Handle both success field and direct response
        if (response.success !== false) {
          this.showCreateForm = false;
          this.loadAllPrompts();
        } else {
          console.error('Error saving prompt:', response.message || response);
        }
        this.isSaving = false;
      },
      error: (error: any) => {
        console.error('Error saving prompt:', error);
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
        } else {
          console.error('Error deleting prompt:', response.message);
        }
      },
      error: (error: any) => {
        console.error('Error deleting prompt:', error);
      }
    });
  }

  togglePromptStatus(prompt: Prompt) {
    const updatedData = { isActive: !prompt.isActive };
    
    this.backendService.updatePrompt(prompt._id, updatedData).subscribe({
      next: (response: any) => {
        if (response.success) {
          prompt.isActive = !prompt.isActive;
        } else {
          console.error('Error updating prompt status:', response.message);
        }
      },
      error: (error: any) => {
        console.error('Error updating prompt status:', error);
      }
    });
  }

  toggleFeatured(prompt: Prompt) {
    const updatedData = { featured: !prompt.featured };
    
    this.backendService.updatePrompt(prompt._id, updatedData).subscribe({
      next: (response: any) => {
        if (response.success) {
          prompt.featured = !prompt.featured;
        } else {
          console.error('Error updating prompt featured status:', response.message);
        }
      },
      error: (error: any) => {
        console.error('Error updating prompt featured status:', error);
      }
    });
  }

  cancelEdit() {
    this.showCreateForm = false;
    this.editingPrompt = null;
    this.promptForm.reset();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'poem': 'Poem',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    return types[type] || type;
  }

  getDifficultyLabel(difficulty: string): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }
}