import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RichTextEditorComponent } from '../../../submit/rich-text-editor/rich-text-editor.component';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { BackendService } from '../../../services/backend.service';

interface SEOConfig {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  allowComments: boolean;
  featuredPost: boolean;
  enableSocialSharing: boolean;
}

@Component({
  selector: 'app-publish-submission',
  imports: [CommonModule, FormsModule, TitleCasePipe, RichTextEditorComponent, BadgeLabelComponent],
  templateUrl: './publish-submission.component.html',
  styleUrl: './publish-submission.component.css'
})
export class PublishSubmissionComponent implements OnInit {
  submission: any = null;
  loading = true;
  isPublishing = false;
  
  // Image upload properties
  selectedImageFile: File | null = null;
  isUploadingImage = false;

  // Content expansion state
  contentExpanded: boolean[] = [];
  allContentExpanded = false;
  
  // Tab state for content editing/preview
  activeContentTab: 'edit' | 'preview' = 'edit';

  // SEO Configuration
  seoConfig: SEOConfig = {
    slug: '',
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    allowComments: true,
    featuredPost: false,
    enableSocialSharing: true
  };

  keywordsInput = '';
  slugError = '';
  baseUrl = window.location.origin + '/post/';
  
  // User profile approval properties
  userProfile: any = null;
  showProfileApproval = false;
  profileApprovalData = {
    tempBio: '',
    tempProfileImage: '',
    approvedBio: '',
    approvedImage: false
  };

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    const submissionId = this.route.snapshot.paramMap.get('id');
    if (submissionId) {
      this.loadSubmission(submissionId);
    } else {
      this.loading = false;
    }
  }

  loadSubmission(submissionId: string) {
    this.loading = true;
    
    this.backendService.getSubmissionWithContents(submissionId).subscribe({
      next: (data) => {
        this.submission = data;
        
        // Clean content when loading
        if (this.submission.contents && this.submission.contents.length > 0) {
          this.submission.contents = this.submission.contents.map((content: any) => ({
            ...content,
            body: this.cleanContentForEditing(content.body)
          }));
        }
        
        this.initializeSEOConfig();
        this.loadUserProfile(this.submission.userId);
        this.loading = false;
        console.log('Submission loaded for publishing:', this.submission);
      },
      error: (err) => {
        console.error('Error loading submission:', err);
        this.showError('Failed to load submission');
        this.loading = false;
      }
    });
  }

  initializeSEOConfig() {
    if (this.submission) {
      // Generate initial slug from title
      this.seoConfig.slug = this.generateSlugFromTitle(this.submission.title);
      this.seoConfig.metaTitle = this.submission.title;
      this.seoConfig.metaDescription = this.submission.description || '';
      
      // Initialize keywords from submission tags if available
      if (this.submission.tags && this.submission.tags.length > 0) {
        this.seoConfig.keywords = [...this.submission.tags];
        this.keywordsInput = this.seoConfig.keywords.join(', ');
      }

      // Initialize content expansion state
      if (this.submission.contents) {
        this.contentExpanded = new Array(this.submission.contents.length).fill(false);
        // Expand first content item by default
        if (this.submission.contents.length > 0) {
          this.contentExpanded[0] = true;
        }
      }
    }
  }

  generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .substring(0, 50); // Limit length
  }

  validateSlug() {
    const slug = this.seoConfig.slug.trim();
    this.slugError = '';

    if (!slug) {
      this.slugError = 'SEO slug is required';
      return;
    }

    if (slug.length < 3) {
      this.slugError = 'Slug must be at least 3 characters long';
      return;
    }

    if (slug.length > 100) {
      this.slugError = 'Slug must be less than 100 characters';
      return;
    }

    // Check for valid characters (letters, numbers, hyphens)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      this.slugError = 'Slug can only contain lowercase letters, numbers, and hyphens';
      return;
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      this.slugError = 'Slug cannot contain consecutive hyphens';
      return;
    }

    // Check if starts or ends with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      this.slugError = 'Slug cannot start or end with a hyphen';
      return;
    }
  }

  updateKeywords() {
    const keywords = this.keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 10); // Limit to 10 keywords
    
    this.seoConfig.keywords = keywords;
  }

  // Content expansion methods
  toggleContentExpanded(index: number) {
    this.contentExpanded[index] = !this.contentExpanded[index];
    this.updateAllContentExpandedState();
  }

  toggleAllContent() {
    this.allContentExpanded = !this.allContentExpanded;
    this.contentExpanded.fill(this.allContentExpanded);
  }

  updateAllContentExpandedState() {
    this.allContentExpanded = this.contentExpanded.every(expanded => expanded);
  }

  // Manually clean content (for user-triggered cleaning)
  cleanContentManually(index: number) {
    if (this.submission.contents && this.submission.contents[index]) {
      const content = this.submission.contents[index];
      content.body = this.cleanContentForEditing(content.body);
    }
  }

  // Clean content for editing (remove empty divs, normalize line breaks)
  cleanContentForEditing(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div><\/div>/g, '')              // Remove empty div tags
      .replace(/<div>\s*<\/div>/g, '')           // Remove div tags with only whitespace
      .replace(/<div>/g, '')                     // Remove opening div tags
      .replace(/<\/div>/g, '<br>')               // Convert closing div tags to line breaks
      .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br><br>') // Normalize multiple br tags
      .replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>')     // Limit consecutive br tags to max 2
      .replace(/&nbsp;/g, ' ')                   // Convert non-breaking spaces
      .replace(/&amp;/g, '&')                    // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/^\s*<br\s*\/?>/g, '')            // Remove leading br tags
      .replace(/<br\s*\/?>$/g, '')               // Remove trailing br tags
      .trim();                                   // Remove leading/trailing whitespace
  }

  // Clean content for preview (convert line breaks to HTML)
  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/\n/g, '<br>')          // Convert line breaks to br tags
      .replace(/\r/g, '');             // Remove carriage returns
  }

  // Prepare content for saving (clean up rich text editor output)
  prepareContentForSaving(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div><\/div>/g, '')                    // Remove empty div tags
      .replace(/<div>\s*<\/div>/g, '')                 // Remove div tags with only whitespace
      .replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>')     // Limit consecutive br tags to max 2
      .replace(/^\s*(<br\s*\/?>\s*)+/g, '')            // Remove leading br tags
      .replace(/(\s*<br\s*\/?>\s*)+$/g, '')            // Remove trailing br tags
      .replace(/\s+/g, ' ')                            // Normalize whitespace
      .trim();                                         // Remove leading/trailing whitespace
  }

  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
    if (!this.selectedImageFile || !this.submission) {
      return;
    }

    this.isUploadingImage = true;

    this.backendService.uploadSubmissionImage(this.submission._id, this.selectedImageFile).subscribe({
      next: (response) => {
        console.log('Image uploaded successfully:', response);
        
        // Update submission with new image URL
        this.submission.imageUrl = response.imageUrl;
        
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
    this.submission.imageUrl = '';
    this.showSuccess('Image removed successfully!');
  }

  isFormValid(): boolean {
    this.validateSlug();
    return !this.slugError && 
           this.seoConfig.slug.trim().length > 0 && 
           this.seoConfig.metaTitle.trim().length > 0 && 
           this.seoConfig.metaDescription.trim().length > 0;
  }

  saveChanges() {
    if (!this.submission) return;

    const updateData = {
      title: this.submission.title,
      description: this.submission.description,
      imageUrl: this.submission.imageUrl,
      contents: this.submission.contents.map((content: any) => ({
        _id: content._id,
        title: content.title,
        body: this.prepareContentForSaving(content.body),
        wordCount: this.calculateWordCount(content.body),
        tags: content.tags || []
      }))
    };

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        console.log('Submission updated successfully:', response);
        this.showSuccess('Changes saved successfully!');
      },
      error: (err) => {
        console.error('Error saving changes:', err);
        this.showError('Failed to save changes. Please try again.');
      }
    });
  }

  saveAndPublish() {
    if (!this.isFormValid() || !this.submission) {
      return;
    }

    this.isPublishing = true;

    // First save any content changes
    this.saveChanges();

    // Then publish the submission using existing endpoint
    this.backendService.updateSubmissionStatus(this.submission._id, 'published').subscribe({
      next: (response) => {
        console.log('Submission published successfully:', response);
        
        // Store SEO configuration in localStorage for future use
        // (This will be properly saved to backend when the endpoint is implemented)
        const seoData = {
          submissionId: this.submission._id,
          slug: this.seoConfig.slug.trim(),
          metaTitle: this.seoConfig.metaTitle,
          metaDescription: this.seoConfig.metaDescription,
          keywords: this.seoConfig.keywords,
          allowComments: this.seoConfig.allowComments,
          featuredPost: this.seoConfig.featuredPost,
          enableSocialSharing: this.seoConfig.enableSocialSharing
        };
        
        console.log('SEO Configuration (will be saved when backend endpoint is ready):', seoData);
        
        this.showSuccess(`"${this.submission.title}" has been published successfully! SEO settings will be applied when backend endpoint is implemented.`);
        
        // Redirect back to admin publication page
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'publish' });
        }, 1500);
        
        this.isPublishing = false;
      },
      error: (err) => {
        console.error('Error publishing submission:', err);
        this.showError('Failed to publish submission. Please try again.');
        this.isPublishing = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'publish' });
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

  // Load user profile to check for pending approval data
  loadUserProfile(userId: string) {
    this.backendService.getUserById(userId).subscribe({
      next: (response: any) => {
        this.userProfile = response.user;
        
        // Check if user has pending profile approval data
        if (this.userProfile.tempBio || this.userProfile.tempProfileImage) {
          this.showProfileApproval = true;
          this.profileApprovalData = {
            tempBio: this.userProfile.tempBio || '',
            tempProfileImage: this.userProfile.tempProfileImage || '',
            approvedBio: this.userProfile.bio || '',
            approvedImage: !!this.userProfile.profileImage
          };
        }
      },
      error: (err) => {
        console.error('Error loading user profile:', err);
      }
    });
  }

  // Approve user's bio and copy to main profile
  approveBio() {
    const updatedBio = this.profileApprovalData.tempBio;
    this.backendService.approveUserBio(this.userProfile._id, updatedBio).subscribe({
      next: (response: any) => {
        this.userProfile = response.user;
        this.profileApprovalData.approvedBio = updatedBio;
        this.profileApprovalData.tempBio = '';
        this.showSuccess('Bio approved and updated successfully!');
        
        // Check if all approvals are done
        this.checkProfileApprovalComplete();
      },
      error: (err) => {
        console.error('Error approving bio:', err);
        this.showError('Failed to approve bio. Please try again.');
      }
    });
  }

  // Approve user's profile image
  approveProfileImage() {
    this.backendService.approveUserProfileImage(this.userProfile._id).subscribe({
      next: (response: any) => {
        this.userProfile = response.user;
        this.profileApprovalData.approvedImage = true;
        this.profileApprovalData.tempProfileImage = '';
        this.showSuccess('Profile image approved successfully!');
        
        // Check if all approvals are done
        this.checkProfileApprovalComplete();
      },
      error: (err) => {
        console.error('Error approving profile image:', err);
        this.showError('Failed to approve profile image. Please try again.');
      }
    });
  }

  // Edit the bio before approving
  editBio() {
    const newBio = prompt('Edit the bio:', this.profileApprovalData.tempBio);
    if (newBio !== null) {
      this.profileApprovalData.tempBio = newBio;
    }
  }

  // Check if all profile approvals are complete
  checkProfileApprovalComplete() {
    if (!this.profileApprovalData.tempBio && !this.profileApprovalData.tempProfileImage) {
      this.showProfileApproval = false;
      this.showSuccess('All profile approvals completed! User profile is now live.');
    }
  }

  // Get profile image URL
  getProfileImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    return imagePath.startsWith('http') ? imagePath : `${window.location.origin}${imagePath}`;
  }
}
