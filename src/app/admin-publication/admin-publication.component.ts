import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-admin-publication',
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule],
  templateUrl: './admin-publication.component.html',
  styleUrl: './admin-publication.component.css'
})
export class AdminPublicationComponent {
  acceptedSubmissions: any[] = [];
  editingSubmission: any = null;
  loading = true;
  isSaving = false;
  
  // Image upload properties
  selectedImageFile: File | null = null;
  isUploadingImage = false;

  constructor(private backendService: BackendService) {}

  ngOnInit() {
    this.loadAcceptedSubmissions();
  }

  // Load accepted submissions
  loadAcceptedSubmissions() {
    this.loading = true;
    
    this.backendService.getSubmissions("", "accepted").subscribe({
      next: (data) => {
        this.acceptedSubmissions = data.submissions || [];
        console.log('Accepted submissions loaded:', this.acceptedSubmissions);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading submissions:', err);
        this.showError('Failed to load submissions');
        this.loading = false;
      }
    });
  }

  // Edit submission - load full details
  editSubmission(submission: any) {
    this.backendService.getSubmissionWithContents(submission._id).subscribe({
      next: (data) => {
        this.editingSubmission = { 
          ...data, 
          imageUrl: data.imageUrl || '' 
        };
        console.log('Editing submission:', this.editingSubmission);
      },
      error: (err) => {
        console.error('Error loading submission details:', err);
        this.showError('Failed to load submission details');
      }
    });
  }

  // Cancel edit
  cancelEdit() {
    this.editingSubmission = null;
    this.selectedImageFile = null;
    this.isUploadingImage = false;
  }

  // Handle image file selection
  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.showError('Image size must be less than 5MB');
        event.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showError('Please select an image file');
        event.target.value = ''; // Clear the input
        return;
      }
      
      this.selectedImageFile = file;
      console.log('Image selected:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');
    }
  }

  // Upload image to server
  uploadImage() {
    if (!this.selectedImageFile || !this.editingSubmission) {
      return;
    }

    this.isUploadingImage = true;

    this.backendService.uploadSubmissionImage(this.editingSubmission._id, this.selectedImageFile).subscribe({
      next: (response) => {
        console.log('Image uploaded successfully:', response);
        
        // Update submission with new image URL
        this.editingSubmission.imageUrl = response.imageUrl;
        
        this.showSuccess('Image uploaded successfully!');
        this.selectedImageFile = null;
        this.isUploadingImage = false;
        
        // Clear the file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.showError('Failed to upload image. Please try again.');
        this.isUploadingImage = false;
        console.error('💥 Upload failed:', err);
      console.error('💥 Error details:', {
        status: err.status,
        statusText: err.statusText,
        message: err.message,
        error: err.error,
        url: err.url
      });
      
      // Better error message based on status code
      let errorMessage = 'Failed to upload image';
      if (err.status === 404) {
        errorMessage = 'Upload endpoint not found. Please check server configuration.';
      } else if (err.status === 401) {
        errorMessage = 'Not authorized to upload images.';
      } else if (err.status === 413) {
        errorMessage = 'Image file too large (max 5MB).';
      } else if (err.error && err.error.error) {
        errorMessage = err.error.error;
      }
      
      this.showError(errorMessage);
      this.isUploadingImage = false;
      }
    });
  }

  // Remove current image
  removeImage() {
    if (confirm('Are you sure you want to remove the current image?')) {
      this.editingSubmission.imageUrl = '';
    }
  }

  // Save changes to submission
  saveChanges() {
    if (!this.editingSubmission) return;

    this.isSaving = true;
    
    const updateData = {
      title: this.editingSubmission.title,
      description: this.editingSubmission.description,
      imageUrl: this.editingSubmission.imageUrl,
      contents: this.editingSubmission.contents.map((content: any) => ({
        _id: content._id,
        title: content.title,
        body: content.body,
        wordCount: this.calculateWordCount(content.body),
        tags: content.tags || []
      }))
    };

    this.backendService.updateSubmission(this.editingSubmission._id, updateData).subscribe({
      next: (response) => {
        console.log('Submission updated successfully:', response);
        this.showSuccess('Changes saved successfully!');
        this.editingSubmission = null;
        this.loadAcceptedSubmissions(); // Refresh the list
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving changes:', err);
        this.showError('Failed to save changes. Please try again.');
        this.isSaving = false;
      }
    });
  }

  // Publish submission
  publishSubmission(submissionId: string) {
    const submission = this.acceptedSubmissions.find(s => s._id === submissionId);
    const submissionTitle = submission ? submission.title : 'this submission';
    
    if (confirm(`Are you sure you want to publish "${submissionTitle}"? This will make it visible to the public.`)) {
      
      // Set loading state
      if (submission) {
        submission.isPublishing = true;
      }

      this.backendService.updateSubmissionStatus(submissionId, 'published').subscribe({
        next: (response) => {
          console.log('Submission published successfully:', response);
          this.showSuccess(`"${submissionTitle}" has been published successfully!`);
          
          // Remove from accepted list since it's now published
          this.acceptedSubmissions = this.acceptedSubmissions.filter(s => s._id !== submissionId);
        },
        error: (err) => {
          console.error('Error publishing submission:', err);
          this.showError('Failed to publish submission. Please try again.');
          
          // Reset loading state
          if (submission) {
            submission.isPublishing = false;
          }
        }
      });
    }
  }

  // Handle image load errors
  onImageError(event: any) {
    console.warn('Image failed to load:', event.target.src);
    // Hide broken image
    event.target.style.display = 'none';
  }

  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Show success message
  showSuccess(message: string) {
    // You can replace this with a proper toast notification
    alert(message);
  }

  // Show error message  
  showError(message: string) {
    // You can replace this with a proper toast notification
    alert(message);
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
