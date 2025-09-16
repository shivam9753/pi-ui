import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { WritingProgram, WritingProgramListResponse } from '../../models';

@Component({
  selector: 'app-program-listing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './program-listing.component.html',
  styleUrl: './program-listing.component.css'
})
export class ProgramListingComponent implements OnInit, OnDestroy {
  programs: WritingProgram[] = [];
  loading = true;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 0;
  totalPrograms = 0;
  limit = 12;
  
  private destroy$ = new Subject<void>();

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.loadPrograms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPrograms(): void {
    this.loading = true;
    this.error = '';

    this.backendService.getActiveWritingPrograms(this.currentPage, this.limit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: WritingProgramListResponse) => {
          this.programs = response.programs || [];
          this.totalPrograms = response.pagination?.total || 0;
          this.totalPages = response.pagination?.pages || 0;
          this.currentPage = response.pagination?.page || 1;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading writing programs:', error);
          this.error = 'Failed to load writing programs. Please try again later.';
          this.loading = false;
        }
      });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPrograms();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      const end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
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
    } else if (diffDays <= 7) {
      return `${diffDays} days left`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  }

  isDeadlineSoon(deadline: string): boolean {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }

  isDeadlineToday(deadline: string): boolean {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0;
  }

  getDeadlineClass(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'text-red-600 bg-red-50';
    } else if (diffDays === 0) {
      return 'text-red-600 bg-red-50 animate-pulse';
    } else if (diffDays <= 3) {
      return 'text-orange-600 bg-orange-50';
    } else if (diffDays <= 7) {
      return 'text-yellow-600 bg-yellow-50';
    } else {
      return 'text-green-600 bg-green-50';
    }
  }

  getSpotsRemainingClass(program: WritingProgram): string {
    const remaining = program.maxApplications - program.applicationsReceived;
    const percentage = (remaining / program.maxApplications) * 100;
    
    if (percentage <= 10) {
      return 'text-red-600';
    } else if (percentage <= 25) {
      return 'text-orange-600';
    } else {
      return 'text-gray-600';
    }
  }

  truncateDescription(description: string, maxLength: number = 150): string {
    if (description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}