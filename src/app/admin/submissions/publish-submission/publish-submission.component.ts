import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RichTextEditorComponent } from '../../../submit/rich-text-editor/rich-text-editor.component';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { TagInputComponent } from '../../../utilities/tag-input/tag-input.component';
import { BackendService } from '../../../services/backend.service';

interface SEOConfig {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  allowComments: boolean;
  featuredPost: boolean;
  enableSocialSharing: boolean;
}

@Component({
  selector: 'app-publish-submission',
  imports: [CommonModule, FormsModule, RichTextEditorComponent, BadgeLabelComponent, TagInputComponent],
  templateUrl: './publish-submission.component.html',
  styleUrl: './publish-submission.component.css'
})
export class PublishSubmissionComponent implements OnInit {
  submission: any = null;
  loading = true;
  isPublishing = false;
  
  // Image upload properties
  selectedCoverImageFile: File | null = null;
  selectedSocialImageFile: File | null = null;
  isUploadingCoverImage = false;
  isUploadingSocialImage = false;

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
    ogImage: '',
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
      },
      error: (err) => {
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
      
      // Initialize keywords from submission tags if available, otherwise from content tags
      if (this.submission.tags && this.submission.tags.length > 0) {
        // Filter out empty tags
        const cleanTags = this.submission.tags.filter((tag: string) => tag?.trim().length > 0);
        this.seoConfig.keywords = [...cleanTags];
        this.keywordsInput = this.seoConfig.keywords.join(', ');
      } else {
        // Collect tags from content items if no submission-level tags exist
        const allContentTags = new Set<string>();
        if (this.submission.contents) {
          this.submission.contents.forEach((content: any) => {
            if (content.tags && Array.isArray(content.tags)) {
              content.tags.forEach((tag: string) => {
                const cleanTag = tag?.trim();
                if (cleanTag && cleanTag.length > 0) {
                  allContentTags.add(cleanTag);
                }
              });
            }
          });
        }
        this.seoConfig.keywords = Array.from(allContentTags);
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

  // Sync SEO keywords with content tags automatically
  syncSEOKeywordsWithContentTags() {
    const allContentTags = new Set<string>();
    if (this.submission?.contents) {
      this.submission.contents.forEach((content: any) => {
        if (content.tags && Array.isArray(content.tags)) {
          content.tags.forEach((tag: string) => {
            const cleanTag = tag?.trim();
            if (cleanTag && cleanTag.length > 0) {
              allContentTags.add(cleanTag);
            }
          });
        }
      });
    }
    
    // Update SEO keywords to match content tags
    this.seoConfig.keywords = Array.from(allContentTags);
    this.keywordsInput = this.seoConfig.keywords.join(', ');
  }

  // Add keyword as chip when Enter or comma is pressed
  addKeywordFromInput(event: any) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const keyword = input.value.trim().toLowerCase();
      
      if (keyword && !this.seoConfig.keywords.includes(keyword) && this.seoConfig.keywords.length < 10) {
        this.seoConfig.keywords.push(keyword);
        input.value = '';
        this.keywordsInput = '';
      }
    }
  }

  // Remove keyword chip by index
  removeKeyword(index: number) {
    this.seoConfig.keywords.splice(index, 1);
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

  // Handle cover image file selection
  onCoverImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.validateImageFile(file, event.target)) return;
      this.selectedCoverImageFile = file;
    }
  }

  // Handle social media image file selection
  onSocialImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.validateImageFile(file, event.target)) return;
      this.selectedSocialImageFile = file;
    }
  }

  // Validate image file (shared validation logic)
  private validateImageFile(file: File, inputElement: HTMLInputElement): boolean {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.showError('Image size must be less than 5MB');
      inputElement.value = ''; // Clear the input
      return false;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showError('Please select an image file');
      inputElement.value = ''; // Clear the input
      return false;
    }
    
    return true;
  }

  // Upload cover image to server
  uploadCoverImage() {
    if (!this.selectedCoverImageFile || !this.submission) {
      return;
    }

    this.isUploadingCoverImage = true;

    this.backendService.uploadSubmissionImage(this.submission._id, this.selectedCoverImageFile).subscribe({
      next: (response) => {
        
        // Update submission with new cover image URL
        this.submission.imageUrl = response.imageUrl;
        
        this.showSuccess('Cover image uploaded successfully!');
        this.selectedCoverImageFile = null;
        this.isUploadingCoverImage = false;
        
        // Clear the file input
        const fileInput = document.querySelector('input[data-type="cover"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (err) => {
        this.handleUploadError(err);
        this.isUploadingCoverImage = false;
      }
    });
  }

  // Upload social media image to server
  uploadSocialImage() {
    if (!this.selectedSocialImageFile || !this.submission) {
      return;
    }

    this.isUploadingSocialImage = true;

    this.backendService.uploadSubmissionImage(this.submission._id, this.selectedSocialImageFile).subscribe({
      next: (response) => {
        
        // Update SEO config with new social media image URL
        this.seoConfig.ogImage = response.imageUrl;
        
        this.showSuccess('Social media image uploaded successfully!');
        this.selectedSocialImageFile = null;
        this.isUploadingSocialImage = false;
        
        // Clear the file input
        const fileInput = document.querySelector('input[data-type="social"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (err) => {
        this.handleUploadError(err);
        this.isUploadingSocialImage = false;
      }
    });
  }

  // Handle upload errors (shared logic)
  private handleUploadError(err: any) {
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
  }

  // Remove cover image with confirmation and S3 deletion
  removeCoverImage() {
    const confirmed = confirm('Are you sure you want to remove the cover image? This will permanently delete it from S3 storage and cannot be undone.');
    
    if (!confirmed) {
      return;
    }

    // Call backend to delete image from S3 and database
    this.backendService.deleteSubmissionImage(this.submission._id).subscribe({
      next: (response) => {
        this.submission.imageUrl = '';
        this.showSuccess('Cover image removed and deleted from S3 successfully!');
      },
      error: (error) => {
        this.showError('Failed to remove cover image. Please try again.');
      }
    });
  }

  // Remove social media image
  removeSocialImage() {
    const confirmed = confirm('Are you sure you want to remove the social media image?');
    
    if (!confirmed) {
      return;
    }

    this.seoConfig.ogImage = '';
    this.showSuccess('Social media image removed successfully!');
  }

  // Use cover image as social media image
  useCoverImageAsSocial() {
    if (this.submission.imageUrl) {
      this.seoConfig.ogImage = this.submission.imageUrl;
      this.showSuccess('Cover image set as social media image.');
    } else {
      this.showError('No cover image available to use.');
    }
  }

  // Use social media image as cover image
  useSocialImageAsCover() {
    if (this.seoConfig.ogImage) {
      this.submission.imageUrl = this.seoConfig.ogImage;
      this.showSuccess('Social media image set as cover image.');
    } else {
      this.showError('No social media image available to use.');
    }
  }

  // Auto-fill description from content
  autoFillDescription() {
    if (!this.submission.contents || this.submission.contents.length === 0) {
      this.showError('No content available to generate description from.');
      return;
    }

    // Extract text from the first content item
    const firstContent = this.submission.contents[0];
    const plainText = this.extractPlainText(firstContent.body);
    
    // Create a compelling description (first 200 characters)
    const description = plainText.substring(0, 200).trim();
    const finalDescription = description.length === 200 ? description + '...' : description;
    
    this.submission.description = finalDescription;
    this.showSuccess('Description auto-filled from content.');
  }

  // Auto-fill excerpt from content
  autoFillExcerpt() {
    if (!this.submission.contents || this.submission.contents.length === 0) {
      this.showError('No content available to generate excerpt from.');
      return;
    }

    // Extract text from the first content item
    const firstContent = this.submission.contents[0];
    const plainText = this.extractPlainText(firstContent.body);
    
    // Create a short excerpt (first 150 characters for cards)
    const excerpt = plainText.substring(0, 150).trim();
    const finalExcerpt = excerpt.length === 150 ? excerpt + '...' : excerpt;
    
    this.submission.excerpt = finalExcerpt;
    this.showSuccess('Excerpt auto-filled from content.');
  }

  // Auto-fill meta description from content or description
  autoFillMetaDescription() {
    let sourceText = '';
    
    // Use existing description if available, otherwise use content
    if (this.submission.description && this.submission.description.trim()) {
      sourceText = this.submission.description;
    } else if (this.submission.contents && this.submission.contents.length > 0) {
      const firstContent = this.submission.contents[0];
      sourceText = this.extractPlainText(firstContent.body);
    } else {
      this.showError('No content or description available to generate meta description from.');
      return;
    }

    // Create SEO-optimized meta description (150-160 characters)
    const metaDescription = sourceText.substring(0, 155).trim();
    const finalMetaDescription = metaDescription.length === 155 ? metaDescription + '...' : metaDescription;
    
    this.seoConfig.metaDescription = finalMetaDescription;
    this.showSuccess('Meta description auto-filled.');
  }

  // Helper method to extract plain text from HTML content
  private extractPlainText(htmlContent: string): string {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Get text content and clean it up
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remove extra whitespace and line breaks
    return plainText.replace(/\s+/g, ' ').trim();
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

    // Collect all tags from content items to create submission-level tags
    const allContentTags = new Set<string>();
    this.submission.contents.forEach((content: any) => {
      if (content.tags && Array.isArray(content.tags)) {
        content.tags.forEach((tag: string) => {
          // Filter out empty strings and whitespace-only tags
          const cleanTag = tag?.trim();
          if (cleanTag && cleanTag.length > 0) {
            allContentTags.add(cleanTag);
          }
        });
      }
    });

    const updateData = {
      title: this.submission.title,
      description: this.submission.description,
      excerpt: this.submission.excerpt,
      imageUrl: this.submission.imageUrl,
      tags: Array.from(allContentTags), // Use actual content tags, not SEO keywords
      contents: this.submission.contents.map((content: any) => ({
        _id: content._id,
        title: content.title,
        body: this.prepareContentForSaving(content.body),
        wordCount: this.calculateWordCount(content.body),
        tags: (content.tags || []).filter((tag: string) => tag?.trim().length > 0)
      }))
    };

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        this.showSuccess('Changes saved successfully!');
      },
      error: (err) => {
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

    // Prepare SEO configuration data
    const seoData = {
      slug: this.seoConfig.slug.trim(),
      metaTitle: this.seoConfig.metaTitle,
      metaDescription: this.seoConfig.metaDescription,
      keywords: this.seoConfig.keywords,
      ogImage: this.seoConfig.ogImage,
      allowComments: this.seoConfig.allowComments,
      featuredOnHomepage: this.seoConfig.featuredPost,
      enableSocialSharing: this.seoConfig.enableSocialSharing
    };

    // Use the new SEO-enabled publishing endpoint
    this.backendService.publishSubmissionWithSEO(this.submission._id, seoData).subscribe({
      next: (response) => {
        
        const publishedUrl = response.url || `/post/${seoData.slug}`;
        this.showSuccess(`"${this.submission.title}" has been published successfully! Available at: ${publishedUrl}`);
        
        // Redirect back to admin publication page
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'publish' });
        }, 2000);
        
        this.isPublishing = false;
      },
      error: (err) => {
        
        // Check if the error is slug-related
        if (err.message?.includes('Slug already exists')) {
          this.slugError = 'This slug is already taken. Please choose a different one.';
          this.showError('Slug already exists. Please choose a different slug.');
        } else {
          this.showError('Failed to publish submission. Please try again.');
        }
        
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
