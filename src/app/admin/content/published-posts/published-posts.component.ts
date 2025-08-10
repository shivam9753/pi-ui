import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../../../services/backend.service';
import { HtmlSanitizerService } from '../../../services/html-sanitizer.service';
import { PublishedContentCardComponent, PublishedContent } from '../../../utilities/published-content-card/published-content-card.component';
import { PrettyLabelPipe } from '../../../pipes/pretty-label.pipe';
import { TypeBadgePipe } from '../../../pipes/type-badge.pipe';

@Component({
  selector: 'app-published-posts',
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, PrettyLabelPipe, TypeBadgePipe],
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
    private router: Router,
    private htmlSanitizer: HtmlSanitizerService
  ) {}

  ngOnInit() {
    this.loadPublishedSubmissions();
  }

  loadPublishedSubmissions() {
    this.loading = true;
    
    // Load both published and draft submissions
    this.backendService.getSubmissions("", "published_and_draft", {
      limit: 100,
      skip: 0,
      sortBy: 'reviewedAt',
      order: 'desc'
    }).subscribe({
      next: (data) => {
        // API should already filter by status, so use all returned submissions
        this.publishedSubmissions = data.submissions || [];
        console.log('Published/Draft submissions loaded:', this.publishedSubmissions.length);
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

  // Configure and publish a submission (for accepted but unpublished items)
  configureAndPublish(submissionId: string) {
    this.router.navigate(['/publish-configure', submissionId]);
  }

  // Navigate to publishing interface for editing (alias)
  editSubmission(submission: any) {
    this.editPublishedPost(submission._id);
  }

  // Unpublish a submission (move back to accepted)
  unpublishSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to unpublish "${title}"? This will move it back to accepted status.`)) {
      return;
    }

    this.backendService.unpublishSubmission(submissionId, 'Unpublished by admin').subscribe({
      next: (response) => {
        this.showSuccess('Submission unpublished successfully and moved to accepted status');
        // Update the local state instead of refreshing the entire list
        const submission = this.publishedSubmissions.find(sub => sub._id === submissionId);
        if (submission) {
          submission.status = 'accepted'; // Change status to show different buttons
        }
      },
      error: (err) => {
        console.error('Error unpublishing submission:', err);
        this.showError('Failed to unpublish submission');
      }
    });
  }

  // Delete a submission permanently
  deleteSubmission(submissionId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently DELETE "${title}"? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation for delete
    if (!confirm('This will permanently delete the submission and all its content. Are you absolutely sure?')) {
      return;
    }

    this.backendService.deleteSubmission(submissionId).subscribe({
      next: (response) => {
        this.showSuccess('Submission deleted successfully');
        this.loadPublishedSubmissions(); // Refresh the list
      },
      error: (err) => {
        console.error('Error deleting submission:', err);
        this.showError('Failed to delete submission');
      }
    });
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

  // Clean HTML from description
  getCleanDescription(submission: any): string {
    return this.htmlSanitizer.getCleanDescription(
      submission.excerpt, 
      submission.description, 
      'No description available'
    );
  }

  // Get author name with fallback
  getAuthorName(submission: any): string {
    return submission.username || 
           submission.authorName || 
           submission.author?.username || 
           submission.author?.name || 
           submission.submitterName || 
           'Unknown Author';
  }

  // Truncate description for display
  getTruncatedDescription(submission: any, maxLength: number = 100): string {
    const cleanDesc = this.getCleanDescription(submission);
    return this.htmlSanitizer.truncateText(cleanDesc, maxLength);
  }
}
