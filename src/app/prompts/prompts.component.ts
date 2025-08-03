// prompts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../services/backend.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

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
  selector: 'app-prompts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prompts.component.html',
  styleUrls: ['./prompts.component.css']
})
export class PromptsComponent implements OnInit {
  // All prompts data
  allPrompts: Prompt[] = [];
  filteredPrompts: Prompt[] = [];
  currentPrompt: Prompt | null = null;
  
  // User state
  isAdmin = false;
  activeTab = 'browse'; // 'browse' or 'manage'
  
  // Browse filters
  browseType = '';
  browseTextFilter = '';
  browseDifficulty = '';
  
  // Manage filters
  manageType = '';
  manageSearch = '';
  manageStatus = 'all'; // 'all', 'active', 'inactive'
  
  // Loading states
  isLoading = true;
  isRefreshing = false;
  isSaving = false;
  
  // Admin form
  promptForm: FormGroup;
  editingPrompt: Prompt | null = null;
  showCreateForm = false;

  constructor(
    private fb: FormBuilder,
    private backendService: BackendService,
    private authService: AuthService,
    private router: Router
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
    this.isAdmin = this.authService.isAdmin();
    this.loadAllPrompts();
  }

  loadAllPrompts() {
    this.isLoading = true;
    this.backendService.getAllPrompts().subscribe({
      next: (response: { success: any; data: Prompt[]; }) => {
        if (response.success) {
          this.allPrompts = response.data;
          this.applyBrowseFilters();
          this.setInitialPrompt();
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading prompts:', error);
        this.isLoading = false;
      }
    });
  }

  setInitialPrompt() {
    // Show initial poem prompt
    const poemPrompts = this.allPrompts.filter(p => p.type === 'poem' && p.isActive);
    if (poemPrompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * poemPrompts.length);
      this.currentPrompt = poemPrompts[randomIndex];
    } else if (this.allPrompts.length > 0) {
      // Fallback to any prompt if no poems
      this.currentPrompt = this.allPrompts[0];
    }
  }

  refreshPrompt() {
    this.isRefreshing = true;
    
    setTimeout(() => {
      const availablePrompts = this.getFilteredPromptsForRefresh();
      
      if (availablePrompts.length > 0) {
        // Ensure we don't show the same prompt twice in a row
        let randomPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
        
        if (availablePrompts.length > 1 && randomPrompt._id === this.currentPrompt?._id) {
          const otherPrompts = availablePrompts.filter(p => p._id !== this.currentPrompt?._id);
          randomPrompt = otherPrompts[Math.floor(Math.random() * otherPrompts.length)];
        }
        
        this.currentPrompt = randomPrompt;
      }
      
      this.isRefreshing = false;
    }, 500); // Small delay for better UX
  }

  getFilteredPromptsForRefresh(): Prompt[] {
    let prompts = this.allPrompts.filter(p => p.isActive);
    
    if (this.browseType) {
      prompts = prompts.filter(p => p.type === this.browseType);
    }
    
    if (this.browseDifficulty) {
      prompts = prompts.filter(p => p.difficulty === this.browseDifficulty);
    }
    
    if (this.browseTextFilter) {
      const searchTerm = this.browseTextFilter.toLowerCase();
      prompts = prompts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    return prompts;
  }

  applyBrowseFilters() {
    this.filteredPrompts = this.getFilteredPromptsForRefresh();
  }

  onBrowseFilterChange() {
    this.applyBrowseFilters();
    this.refreshPrompt();
  }

  // Admin functionality
  getManagePrompts(): Prompt[] {
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
    
    return prompts;
  }

  openCreateForm() {
    this.editingPrompt = null;
    this.promptForm.reset({
      title: '',
      description: '',
      type: '',
      tags: '',
      difficulty: 'beginner',
      picture: '',
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
    if (this.promptForm.invalid) {
      this.markFormGroupTouched(this.promptForm);
      return;
    }

    this.isSaving = true;
    const formValue = this.promptForm.value;
    
    const tags = formValue.tags 
      ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];

    const promptData = {
      ...formValue,
      tags,
      picture: formValue.picture || null
    };

    const request = this.editingPrompt
      ? this.backendService.updatePrompt(this.editingPrompt._id, promptData)
      : this.backendService.createPrompt(promptData);

    request.subscribe({
      next: (response: { success: any; data: Prompt; }) => {
        if (response.success) {
          if (this.editingPrompt) {
            // Update existing prompt in array
            const index = this.allPrompts.findIndex(p => p._id === this.editingPrompt!._id);
            if (index >= 0) {
              this.allPrompts[index] = response.data;
            }
          } else {
            // Add new prompt to array
            this.allPrompts.unshift(response.data);
          }
          
          this.closeCreateForm();
          this.applyBrowseFilters();
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
    if (confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      this.backendService.deletePrompt(prompt._id).subscribe({
        next: (response: { success: any; }) => {
          if (response.success) {
            this.allPrompts = this.allPrompts.filter(p => p._id !== prompt._id);
            this.applyBrowseFilters();
          }
        },
        error: (error: any) => {
          console.error('Error deleting prompt:', error);
        }
      });
    }
  }

  togglePromptStatus(prompt: Prompt) {
    this.backendService.togglePromptStatus(prompt._id).subscribe({
      next: (response: { success: any; isActive: boolean; }) => {
        if (response.success) {
          prompt.isActive = response.isActive;
          this.applyBrowseFilters();
        }
      },
      error: (error: any) => {
        console.error('Error toggling prompt status:', error);
      }
    });
  }

  usePrompt(prompt: Prompt) {
    // Increment usage count
    this.backendService.usePrompt(prompt._id).subscribe({
      next: (response: { success: any; usageCount: number; }) => {
        if (response.success) {
          prompt.usageCount = response.usageCount;
        }
      },
      error: (error: any) => {
        console.error('Error updating usage count:', error);
      }
    });

    // Navigate to submission form
    this.router.navigate(['/submit'], { 
      queryParams: { 
        promptId: prompt._id,
        type: prompt.type 
      } 
    });
  }

  closeCreateForm() {
    this.showCreateForm = false;
    this.editingPrompt = null;
  }

  clearFilters() {
    this.browseType = '';
    this.browseDifficulty = '';
    this.browseTextFilter = '';
    this.applyBrowseFilters();
    this.refreshPrompt();
  }

  // Utility methods
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'poem': 'Poem',
      'prose': 'Prose', 
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    return labels[type] || type;
  }

  getDifficultyColor(difficulty: string): string {
    const colors: { [key: string]: string } = {
      'beginner': 'bg-green-100 text-green-800',
      'intermediate': 'bg-yellow-100 text-yellow-800',
      'advanced': 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}