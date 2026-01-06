// prompts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BackendService } from '../services/backend.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { GuidelinesOverlayComponent } from '../main-submission/guidelines-overlay/guidelines-overlay.component';
import { CommonUtils } from '../shared/utils';

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
}

@Component({
  selector: 'app-prompts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GuidelinesOverlayComponent],
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
  
  // Browse filters
  browseType = '';
  browseTextFilter = '';
  browseDifficulty = '';

  activeTab: 'discover' | 'gamified' | 'guidelines' = 'gamified'; // default to gamified or browse as you want
showGuidelinesOverlay = false;
  
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

  get promptIndex(): number {
  if (!this.filteredPrompts || !this.currentPrompt) return -1;
  return this.filteredPrompts.findIndex(
    p => p._id === this.currentPrompt!._id
  );
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


  usePrompt(prompt: Prompt) {
    // Increment usage count
    this.backendService.usePrompt(prompt._id).subscribe({
      next: (response: { success: any; usageCount: number; }) => {
        if (response.success) {
          prompt.usageCount = response.usageCount;
        }
      },
      error: (error: any) => {
      }
    });

    // Navigate to submission form
    this.router.navigate(['/submission'], { 
      queryParams: { 
        promptId: prompt._id,
        type: prompt.type 
      } 
    });
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
      'intermediate': 'bg-amber-100 text-amber-800',
      'advanced': 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString?: string): string {
    return CommonUtils.formatDate(dateString);
  }

  setActiveTab(tab: 'discover' | 'gamified' | 'guidelines') {
  this.activeTab = tab;
}
openGuidelines() {
  this.showGuidelinesOverlay = true;
  this.activeTab = 'guidelines';
}
closeGuidelines() {
  this.showGuidelinesOverlay = false;
  // Optionally switch to a default tab
  this.activeTab = 'gamified'; 
}
}