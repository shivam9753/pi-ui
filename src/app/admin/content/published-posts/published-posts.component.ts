import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../../../services/backend.service';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { PublishedContentCardComponent, PublishedContent } from '../../../utilities/published-content-card/published-content-card.component';

@Component({
  selector: 'app-published-posts',
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, BadgeLabelComponent, PublishedContentCardComponent],
  templateUrl: './published-posts.component.html',
  styleUrl: './published-posts.component.css'
})
export class PublishedPostsComponent implements OnInit {
  publishedSubmissions: any[] = [];
  loading = true;
  searchTerm = '';
  selectedType = '';

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPublishedSubmissions();
  }

  loadPublishedSubmissions() {
    this.loading = true;
    
    this.backendService.getSubmissions("", "published").subscribe({
      next: (data) => {
        this.publishedSubmissions = data.submissions || [];
        console.log('Published submissions loaded:', this.publishedSubmissions);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading published submissions:', err);
        this.showError('Failed to load published submissions');
        this.loading = false;
      }
    });
  }

  // Navigate to publishing interface for editing
  editPublishedPost(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId]);
  }

  // Navigate to publishing interface for editing (alias)
  editSubmission(submission: any) {
    this.editPublishedPost(submission._id);
  }

  // Navigate to view the published post (alias)
  viewSubmission(submission: any) {
    if (submission.slug) {
      this.viewPost(submission.slug);
    } else {
      this.router.navigate(['/read', submission._id]);
    }
  }

  // Navigate to view the published post
  viewPost(slug: string) {
    this.router.navigate(['/post', slug]);
  }

  // Filter submissions based on search and type
  get filteredSubmissions() {
    let filtered = this.publishedSubmissions;

    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.title.toLowerCase().includes(search) ||
        sub.username.toLowerCase().includes(search) ||
        (sub.description && sub.description.toLowerCase().includes(search))
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(sub => sub.submissionType === this.selectedType);
    }

    return filtered;
  }

  // Get unique submission types for filter
  get submissionTypes() {
    const types = [...new Set(this.publishedSubmissions.map(sub => sub.submissionType))];
    return types.sort();
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

  showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  showError(message: string) {
    this.showToast(message, 'error');
  }

  // Refresh the submissions list
  refreshList() {
    this.loadPublishedSubmissions();
  }

  // Handle card click for published content
  onContentCardClick(content: PublishedContent) {
    // For admin interface, navigate to edit the post
    this.editPublishedPost(content._id || '');
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
