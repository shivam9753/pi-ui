import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { CardAction, SubmissionCardComponent } from '../../../submission-card/submission-card.component';
import { BackendService } from '../../../services/backend.service';

@Component({
  selector: 'app-ready-to-publish',
  imports: [CommonModule, DatePipe, BadgeLabelComponent, FormsModule, SubmissionCardComponent],
  templateUrl: './ready-to-publish.component.html',
  styleUrl: './ready-to-publish.component.css'
})
export class ReadyToPublishComponent {
  acceptedSubmissions: any[] = [];
  loading = true;

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAcceptedSubmissions();
  }

  // Load accepted submissions
  loadAcceptedSubmissions() {
    this.loading = true;
    
    // Check if we have a valid JWT token
    const jwtToken = localStorage.getItem('jwt_token');
    console.log('JWT Token exists:', !!jwtToken);
    console.log('JWT Token length:', jwtToken?.length || 0);
    

    
    // Use the new consolidated endpoint with pagination
    this.backendService.getSubmissions("", "accepted", {
      limit: 50,
      skip: 0,
      sortBy: 'reviewedAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        console.log('API Response:', data);
        // Handle optimized response structure
        this.acceptedSubmissions = data.submissions || [];
        console.log('Accepted submissions loaded:', this.acceptedSubmissions.length);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading submissions:', err);
        this.showError('Failed to load submissions');
        this.loading = false;
      }
    });
  }

  getAuthorInitials(tell: any) {

  }

  // Configure publishing - navigate to publishing interface
  configurePublishing(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId]);
  }


  // Get card action configuration
  getCardAction(): CardAction {
    return {
      label: 'Configure & Publish',
      variant: 'outline'
    };
  }

  // Handle card action clicks
  onCardAction(submissionId: string) {
    this.configurePublishing(submissionId);
  }


  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast(): void {
    this.showToastFlag = false;
  }

  // Show success message
  showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  // Show error message  
  showError(message: string) {
    this.showToast(message, 'error');
  }

  // Refresh the submissions list
  refreshList() {
    this.loadAcceptedSubmissions();
  }

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get time ago
  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}
