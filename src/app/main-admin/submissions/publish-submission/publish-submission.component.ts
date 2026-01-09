import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProseMirrorEditorComponent } from '../../../submit/rich-text-editor/prosemirror-editor.component';
import { BadgeLabelComponent } from '../../../utilities/badge-label/badge-label.component';
import { TagInputComponent } from '../../../utilities/tag-input/tag-input.component';
import { BackendService } from '../../../services/backend.service';
import { SUBMISSION_STATUS, UPLOAD_CONFIG } from '../../../shared/constants/api.constants';
import { compressImageForUpload } from '../../../shared/utils/image-compression.util';
import { ButtonComponent } from '../../../ui-components/button/button.component';

interface SEOConfig {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  featuredPost: boolean;
}

@Component({
  selector: 'app-publish-submission',
  imports: [CommonModule, FormsModule, ProseMirrorEditorComponent, BadgeLabelComponent, TagInputComponent, ButtonComponent, ButtonComponent],
  templateUrl: './publish-submission.component.html',
  styleUrl: './publish-submission.component.css',
  encapsulation: ViewEncapsulation.None
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

  // Transient previews for newly selected local files (shown in gallery before upload)
  transientUploadedImages: string[] = [];
  lastSelectedCoverPreviewUrl?: string | null = null;
  lastSelectedSocialPreviewUrl?: string | null = null;

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
    featuredPost: false
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

  // Profile image reuse properties
  availableProfileImage: string | null = null;
  showProfileImageReuse = false;

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToastFlag = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
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

        // Store original content for preview (preserve &nbsp; entities)
        // The editor's two-way binding will modify content.body, so we need a separate copy for preview
        if (this.submission.contents && this.submission.contents.length > 0) {
          this.submission.contents = this.submission.contents.map((content: any) => ({
            ...content,
            originalBody: content.body // Keep original with &nbsp; for preview
          }));
        }

        this.initializeSEOConfig();
        
        // Extract userId as string (could be object with _id field)
        const userId = typeof this.submission.userId === 'string' 
          ? this.submission.userId 
          : this.submission.userId?._id || this.submission.userId?.id;
          
        console.log('🔧 Extracted userId:', userId, 'from:', this.submission.userId);
        
        if (userId) {
          this.loadUserProfile(userId);
        }
        
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
      // Use existing SEO data if available, otherwise generate from submission data
      if (this.submission.seo) {
        // Populate from existing SEO data
        this.seoConfig.slug = this.submission.seo.slug || this.generateSlugFromTitle(this.submission.title);
        this.seoConfig.metaTitle = this.submission.seo.metaTitle || this.submission.title;
        this.seoConfig.metaDescription = this.submission.seo.metaDescription || this.submission?.description || '';
        this.seoConfig.keywords = this.submission.seo.keywords || [];
        this.seoConfig.ogImage = this.submission.seo.ogImage || '';
        this.seoConfig.featuredPost = this.submission.seo.featuredOnHomepage || false;
      } else {
        // Generate initial values if no SEO data exists
        this.seoConfig.slug = this.generateSlugFromTitle(this.submission.title);
        this.seoConfig.metaTitle = this.submission.title;
        this.seoConfig.metaDescription = this.submission?.description || '';
        this.seoConfig.ogImage = '';
        this.seoConfig.featuredPost = false;
      }

      // Populate form fields from submission data
      if (!this.submission.description && this.submission.contents?.length > 0) {
        // Auto-generate description from first content if empty
        const firstContent = this.submission.contents[0];
        const plainText = this.extractPlainText(firstContent.body);
        this.submission.description = plainText.substring(0, 200).trim();
        if (this.submission.description.length === 200) {
          this.submission.description += '...';
        }
      }

      // Initialize excerpt if not present (only for backward compatibility)
      if (!this.submission.excerpt && this.submission.description) {
        this.submission.excerpt = this.submission.description.substring(0, 150).trim();
        if (this.submission.excerpt.length === 150) {
          this.submission.excerpt += '...';
        }
      }
      
      // Initialize keywords from existing SEO data, then fall back to submission/content tags
      if (this.seoConfig.keywords.length === 0) {
        if (this.submission.tags && this.submission.tags.length > 0) {
          // Filter out empty tags
          const cleanTags = this.submission.tags.filter((tag: string) => tag?.trim().length > 0);
          this.seoConfig.keywords = [...cleanTags];
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
        }
      }
      
      this.keywordsInput = this.seoConfig.keywords.join(', ');

      // Initialize content expansion state
      if (this.submission.contents) {
        // Expand all content items by default for better visibility during publishing
        this.contentExpanded = new Array(this.submission.contents.length).fill(true);
        this.allContentExpanded = true;
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

  // Clean content for editing (remove empty divs, preserve ALL line breaks)
  cleanContentForEditing(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div><\/div>/g, '')              // Remove empty div tags
      .replace(/<div>\s*<\/div>/g, '')           // Remove div tags with only whitespace
      .replace(/<div>/g, '')                     // Remove opening div tags
      .replace(/<\/div>/g, '<br>')               // Convert closing div tags to line breaks
      // PRESERVE ALL LINE BREAKS - Don't limit them at all when loading for editing
      // .replace(/(<br\s*\/?>\s*){4,}/g, '<br><br><br>')  // REMOVED: Don't limit br tags
      // DON'T convert &nbsp; here - ProseMirror editor handles this conversion internally
      // .replace(/&nbsp;/g, ' ')                   // REMOVED: ProseMirror handles this
      .replace(/&amp;/g, '&')                    // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/<([^>]+)\s+style\s*=\s*["'][^"']*["']([^>]*)>/gi, '<$1$2>') // Remove inline style attributes
      .replace(/<([^>]+)\s+class\s*=\s*["'][^"']*["']([^>]*)>/gi, '<$1$2>') // Remove class attributes that might have theme styles
      // PRESERVE user's intentional formatting - don't strip any br tags
      .replace(/^\s+|\s+$/g, '');                // Only trim whitespace, preserve ALL HTML formatting
  }

  // Clean content for preview (convert line breaks to HTML)
  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/\n/g, '<br>')          // Convert line breaks to br tags
      .replace(/\r/g, '');             // Remove carriage returns
  }

  // Add new content item to the submission
  addNewContent() {
    if (!this.submission) return;
    
    // Prevent adding more content if the type is other than poem
    if (this.submission.submissionType !== 'poem') {
      this.showError('Additional content sections can only be added to poems.');
      return;
    }
    
    if (!this.submission.contents) {
      this.submission.contents = [];
    }

    const newContent = {
      _id: this.generateTempId(), // Temporary ID for new content
      title: '',
      body: '',
      wordCount: 0,
      tags: [],
      footnotes: ''
    };

    this.submission.contents.push(newContent);
    
    // Update expansion state arrays
    this.contentExpanded.push(true); // Expand the new content by default
    
    this.showSuccess('New content section added. Don\'t forget to save your changes!');
  }

  // Remove content item from the submission
  deleteContent(index: number) {
    if (!this.submission?.contents || index < 0 || index >= this.submission.contents.length) {
      return;
    }

    const contentTitle = this.submission.contents[index].title || `Content ${index + 1}`;
    const confirmed = confirm(`Are you sure you want to delete "${contentTitle}"? This action cannot be undone.`);
    
    if (!confirmed) return;

    this.submission.contents.splice(index, 1);
    this.contentExpanded.splice(index, 1);
    
    // Update expansion state after removal
    this.updateAllContentExpandedState();
    
    this.showSuccess(`"${contentTitle}" has been deleted.`);
  }

  // Generate temporary ID for new content items
  private generateTempId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Prepare content for saving (clean up rich text editor output while preserving ALL line breaks)
  prepareContentForSaving(content: string): string {
    if (!content) return '';
    
    const result = content
      .replace(/<div><\/div>/g, '')                    // Remove empty div tags
      .replace(/<div>\s*<\/div>/g, '')                 // Remove div tags with only whitespace
      // PRESERVE ALL LINE BREAKS - Don't limit consecutive br tags for poetry/intentional spacing
      // Only remove truly excessive (10+ consecutive) line breaks to prevent abuse while preserving intentional spacing
      .replace(/(<br\s*\/?>\s*){11,}/g, '<br><br><br><br><br><br><br><br><br><br>')  // Limit to max 10 consecutive
      // DO NOT normalize whitespace - preserve line structure for poetry and formatted text
      .replace(/^\s+|\s+$/g, '');                      // Only trim whitespace, not HTML tags
    
    return result;
  }

  // Calculate word count for content
  calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Handle cover image file selection with compression
  async onCoverImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.validateImageFile(file, event.target)) return;

      try {
        this.showSuccess('Compressing cover image to WebP format...');
        const compressed = await compressImageForUpload(file, {
          targetSizeKB: 250,
          maxWidth: UPLOAD_CONFIG.MAX_DIMENSIONS.width,
          maxHeight: UPLOAD_CONFIG.MAX_DIMENSIONS.height
        });

        this.selectedCoverImageFile = compressed.file;

        // Create transient preview URL for the selected file so it appears in the gallery
        if (this.lastSelectedCoverPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl);
        }
        this.lastSelectedCoverPreviewUrl = URL.createObjectURL(this.selectedCoverImageFile);
        this.transientUploadedImages = [this.lastSelectedCoverPreviewUrl, ...this.transientUploadedImages];

        const originalSize = (file.size / 1024).toFixed(1);
        const compressedSize = (compressed.file.size / 1024).toFixed(1);
        this.showSuccess(
          `Cover image compressed: ${originalSize}KB → ${compressedSize}KB (${compressed.compressionRatio}% reduction)`
        );

        // Dismiss profile image reuse suggestion when user selects a different file
        this.showProfileImageReuse = false;
      } catch (error) {
        this.showError('Failed to compress image. Using original.');
        this.selectedCoverImageFile = file;

        if (this.lastSelectedCoverPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl);
        }
        this.lastSelectedCoverPreviewUrl = URL.createObjectURL(file);
        this.transientUploadedImages = [this.lastSelectedCoverPreviewUrl, ...this.transientUploadedImages];
      }
    }
  }

  // Handle social media image file selection with compression  
  async onSocialImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.validateImageFile(file, event.target)) return;

      try {
        this.showSuccess('Compressing social image to WebP format...');
        const compressed = await compressImageForUpload(file, {
          targetSizeKB: 250,
          maxWidth: UPLOAD_CONFIG.MAX_DIMENSIONS.width,
          maxHeight: UPLOAD_CONFIG.MAX_DIMENSIONS.height
        });

        this.selectedSocialImageFile = compressed.file;

        // Create transient preview URL for the selected social file
        if (this.lastSelectedSocialPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl);
        }
        this.lastSelectedSocialPreviewUrl = URL.createObjectURL(this.selectedSocialImageFile);
        this.transientUploadedImages = [this.lastSelectedSocialPreviewUrl, ...this.transientUploadedImages];

        const originalSize = (file.size / 1024).toFixed(1);
        const compressedSize = (compressed.file.size / 1024).toFixed(1);
        this.showSuccess(
          `Social image compressed: ${originalSize}KB → ${compressedSize}KB (${compressed.compressionRatio}% reduction)`
        );
      } catch (error) {
        this.showError('Failed to compress image. Using original.');
        this.selectedSocialImageFile = file;

        if (this.lastSelectedSocialPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl);
        }
        this.lastSelectedSocialPreviewUrl = URL.createObjectURL(file);
        this.transientUploadedImages = [this.lastSelectedSocialPreviewUrl, ...this.transientUploadedImages];
      }
    }
  }

  // Validate image file (shared validation logic)
  private validateImageFile(file: File, inputElement: HTMLInputElement): boolean {
    // Validate file size (2MB max)
    if (file.size > UPLOAD_CONFIG.MAX_IMAGE_SIZE) {
      this.showError('Image size must be less than 2MB');
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

        // Remove transient preview if present
        if (this.lastSelectedCoverPreviewUrl) {
          // Ensure the uploaded URL is present in gallery; revoke local URL
          const index = this.transientUploadedImages.indexOf(this.lastSelectedCoverPreviewUrl as string);
          if (index !== -1) this.transientUploadedImages.splice(index, 1);
          URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl as string);
          this.lastSelectedCoverPreviewUrl = null;
        }

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

        // Remove transient preview if present
        if (this.lastSelectedSocialPreviewUrl) {
          const index = this.transientUploadedImages.indexOf(this.lastSelectedSocialPreviewUrl as string);
          if (index !== -1) this.transientUploadedImages.splice(index, 1);
          URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl as string);
          this.lastSelectedSocialPreviewUrl = null;
        }

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
      errorMessage = 'Image file too large (max 2MB).';
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

  // Auto-fill excerpt from description or content
  autoFillExcerpt() {
    // Use description if available, otherwise use content
    if (this.submission?.description && this.submission?.description.trim()) {
      const excerpt = this.submission.description.substring(0, 150).trim();
      this.submission.excerpt = excerpt.length === 150 ? excerpt + '...' : excerpt;
      this.showSuccess('Excerpt auto-filled from description.');
    } else if (this.submission.contents && this.submission.contents.length > 0) {
      // Extract text from the first content item
      const firstContent = this.submission.contents[0];
      const plainText = this.extractPlainText(firstContent.body);
      
      // Create a short excerpt (first 150 characters for cards)
      const excerpt = plainText.substring(0, 150).trim();
      const finalExcerpt = excerpt.length === 150 ? excerpt + '...' : excerpt;
      
      this.submission.excerpt = finalExcerpt;
      this.showSuccess('Excerpt auto-filled from content.');
    } else {
      this.showError('No description or content available to generate excerpt from.');
    }
  }

  // Get auto-generated excerpt for display
  getAutoGeneratedExcerpt(): string {
    if (this.submission?.description && this.submission?.description.trim()) {
      const excerpt = this.submission.description.substring(0, 150).trim();
      return excerpt.length === 150 ? excerpt + '...' : excerpt;
    } else if (this.submission.contents && this.submission.contents.length > 0) {
      const firstContent = this.submission.contents[0];
      const plainText = this.extractPlainText(firstContent.body);
      const excerpt = plainText.substring(0, 150).trim();
      return excerpt.length === 150 ? excerpt + '...' : excerpt;
    }
    return 'No content available for preview';
  }

  // Enable custom excerpt editing
  enableCustomExcerpt() {
    // Set current auto-generated excerpt as starting point
    this.submission.excerpt = this.getAutoGeneratedExcerpt();
  }

  // Auto-fill meta description from content or description
  autoFillMetaDescription() {
    let sourceText = '';
    
    // Use existing description if available, otherwise use content
    if (this.submission?.description && this.submission?.description.trim()) {
      sourceText = this.submission?.description;
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

    // Separate existing and new content
    const existingContent = this.submission.contents.filter((content: any) => 
      content._id && !content._id.startsWith('temp_')
    );
    const newContent = this.submission.contents.filter((content: any) => 
      !content._id || content._id.startsWith('temp_')
    );

    // First, handle new content creation via backend
    if (newContent.length > 0) {
      this.createNewContentAndUpdateSubmission(existingContent, newContent);
    } else {
      // No new content, just update existing
      this.updateExistingSubmission();
    }
  }

  private createNewContentAndUpdateSubmission(existingContent: any[], newContent: any[]) {
    // Prepare all content (existing + new) for submission update
    const allContent = [
      ...existingContent.map((content: any) => ({
        _id: content._id,
        title: content.title,
        body: this.prepareContentForSaving(content.body),
        wordCount: this.calculateWordCount(content.body),
        tags: (content.tags || []).filter((tag: string) => tag?.trim().length > 0),
        footnotes: content.footnotes || ''
      })),
      ...newContent.map((content: any) => ({
        // Don't include _id for new content - backend will create it
        title: content.title || '',
        body: this.prepareContentForSaving(content.body || ''),
        wordCount: this.calculateWordCount(content.body || ''),
        tags: (content.tags || []).filter((tag: string) => tag?.trim().length > 0),
        footnotes: content.footnotes || ''
      }))
    ];

    // Collect all tags from content items to create submission-level tags
    const allContentTags = new Set<string>();
    allContent.forEach((content: any) => {
      if (content.tags && Array.isArray(content.tags)) {
        content.tags.forEach((tag: string) => {
          const cleanTag = tag?.trim();
          if (cleanTag && cleanTag.length > 0) {
            allContentTags.add(cleanTag);
          }
        });
      }
    });

    const updateData: any = {
      title: this.submission.title,
      description: this.submission?.description,
      excerpt: this.submission?.excerpt,
      tags: Array.from(allContentTags),
      contents: allContent
    };

    if (this.submission.imageUrl && this.submission.imageUrl.trim()) {
      updateData.imageUrl = this.submission.imageUrl;
    }

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        this.showSuccess('Changes saved successfully, including new content!');
        
        // Update local submission with response data to get real content IDs
        if (response.submission && response.submission.contents) {
          this.submission.contents = response.submission.contents;
          // Reset expansion state for updated content
          this.contentExpanded = new Array(this.submission.contents.length).fill(false);
          if (this.submission.contents.length > 0) {
            this.contentExpanded[0] = true;
          }
        }
      },
      error: (err) => {
        this.showError('Failed to save changes. Please try again.');
      }
    });
  }

  private updateExistingSubmission() {
    // Collect all tags from content items to create submission-level tags
    const allContentTags = new Set<string>();
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

    const updateData: any = {
      title: this.submission.title,
      description: this.submission?.description,
      excerpt: this.submission?.excerpt,
      tags: Array.from(allContentTags),
      contents: this.submission.contents.map((content: any) => ({
        _id: content._id,
        title: content.title,
        body: this.prepareContentForSaving(content.body),
        wordCount: this.calculateWordCount(content.body),
        tags: (content.tags || []).filter((tag: string) => tag?.trim().length > 0),
        footnotes: content.footnotes || ''
      }))
    };

    if (this.submission.imageUrl && this.submission.imageUrl.trim()) {
      updateData.imageUrl = this.submission.imageUrl;
    }

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        this.showSuccess('Changes saved successfully!');
      },
      error: (err) => {
        this.showError('Failed to save changes. Please try again.');
      }
    });
  }

  private saveChangesForPublish() {
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

    const updateData: any = {
      title: this.submission.title,
      description: this.submission?.description,
      excerpt: this.submission?.excerpt,
      tags: Array.from(allContentTags), // Use actual content tags, not SEO keywords
      contents: this.submission.contents.map((content: any) => {
        const contentData: any = {
          title: content.title,
          body: this.prepareContentForSaving(content.body),
          wordCount: this.calculateWordCount(content.body),
          tags: (content.tags || []).filter((tag: string) => tag?.trim().length > 0),
          footnotes: content.footnotes || ''
        };
        
        // Only include _id if it's not a temporary ID (new content shouldn't have _id)
        if (content._id && !content._id.startsWith('temp_')) {
          contentData._id = content._id;
        }
        
        return contentData;
      }),
      // Include SEO data in the main update request
      seo: {
        slug: this.seoConfig.slug.trim(),
        metaTitle: this.seoConfig.metaTitle,
        metaDescription: this.seoConfig.metaDescription,
        keywords: this.seoConfig.keywords,
        ogImage: this.seoConfig.ogImage,
        featuredOnHomepage: this.seoConfig.featuredPost
      }
    };

    // Only include imageUrl if it's not empty/null to avoid validation errors
    if (this.submission.imageUrl && this.submission.imageUrl.trim()) {
      updateData.imageUrl = this.submission.imageUrl;
    }

    return this.backendService.updateSubmission(this.submission._id, updateData);
  }

  saveAndPublish() {
    if (!this.isFormValid() || !this.submission) {
      return;
    }

    this.isPublishing = true;

    // Check if submission is already published
    // For already published posts, we should only update content, not republish
    const isAlreadyPublished = this.submission.status === SUBMISSION_STATUS.PUBLISHED || 
                               this.submission.publishedAt || 
                               this.submission.isPublished;

    // Prevent publishing if image fields contain transient blob/data URLs and no corresponding uploaded file exists
    if (!isAlreadyPublished) {
      const hasBlobImage = (this.submission.imageUrl && (this.submission.imageUrl.startsWith('blob:') || this.submission.imageUrl.startsWith('data:')))
        || (this.seoConfig.ogImage && (this.seoConfig.ogImage.startsWith('blob:') || this.seoConfig.ogImage.startsWith('data:')));

      // If there are blob URLs but no selected files to upload, block and ask user to upload
      if (hasBlobImage && !this.selectedCoverImageFile && !this.selectedSocialImageFile) {
        this.showError('Please upload the selected image(s) before publishing. Blob/local preview URLs cannot be used as live cover images.');
        this.isPublishing = false;
        return;
      }
    }

    if (isAlreadyPublished) {
      // For already published content, only save content changes via PATCH
      this.saveChangesForPublish()?.subscribe({
        next: (response) => {
          // Content updated successfully - no need to call publish API
          this.showSuccess(`"${this.submission.title}" has been updated successfully!`);
          this.isPublishing = false;
          
          // Redirect back to return URL with page parameter or default admin page
          setTimeout(() => {
            this.goBack();
          }, 2000);
        },
        error: (err) => {
          this.showError('Failed to save content changes. Please try again.');
          this.isPublishing = false;
        }
      });
    } else {
      // For first-time publishing, use the publish endpoint
      this.publishWithSEO();
    }
  }

  private async uploadPendingImagesIfAny(): Promise<void> {
    // Upload cover if selected
    try {
      if (this.selectedCoverImageFile && this.submission) {
        this.isUploadingCoverImage = true;
        const resp = await lastValueFrom(this.backendService.uploadSubmissionImage(this.submission._id, this.selectedCoverImageFile));
        this.submission.imageUrl = resp.imageUrl;
        this.selectedCoverImageFile = null;
        this.isUploadingCoverImage = false;
      }

      if (this.selectedSocialImageFile && this.submission) {
        this.isUploadingSocialImage = true;
        const resp2 = await lastValueFrom(this.backendService.uploadSubmissionImage(this.submission._id, this.selectedSocialImageFile));
        this.seoConfig.ogImage = resp2.imageUrl;
        this.selectedSocialImageFile = null;
        this.isUploadingSocialImage = false;
      }
    } catch (err) {
      // Surface upload error to user and rethrow so publish can stop
      this.isUploadingCoverImage = false;
      this.isUploadingSocialImage = false;
      this.showError('Failed to upload selected image(s). Please try again.');
      throw err;
    }
  }

  private publishWithSEO() {
    // First save the submission changes (description, excerpt, etc.), then publish with SEO
    const saveObservable = this.saveChangesForPublish();
    
    if (!saveObservable) {
      this.isPublishing = false;
      return;
    }

    saveObservable.subscribe({
      next: async (response) => {
        try {
          // If user selected local files but hasn't uploaded them yet, upload now before publishing
          await this.uploadPendingImagesIfAny();
        } catch (err) {
          this.isPublishing = false;
          return;
        }

        // Now that changes are saved and pending uploads completed, proceed with publishing
        const seoData = {
          slug: this.seoConfig.slug.trim(),
          metaTitle: this.seoConfig.metaTitle,
          metaDescription: this.seoConfig.metaDescription,
          keywords: this.seoConfig.keywords,
          ogImage: this.seoConfig.ogImage,
          featuredOnHomepage: this.seoConfig.featuredPost
        };

        // Use the SEO-enabled publishing endpoint
        this.backendService.publishSubmissionWithSEO(this.submission._id, seoData).subscribe({
          next: (publishResponse) => {
            const publishedUrl = publishResponse.url || `/post/${seoData.slug}`;
            this.showSuccess(`"${this.submission.title}" has been published successfully! Available at: ${publishedUrl}`);
            
            // Redirect back to return URL with page parameter or default admin page
            setTimeout(() => {
              this.goBack();
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
      },
      error: (err) => {
        this.showError('Failed to save submission changes before publishing. Please try again.');
        this.isPublishing = false;
      }
    });
  }

  goBack() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const returnPage = this.route.snapshot.queryParams['returnPage'];
    
    if (returnUrl && returnPage) {
      // Navigate back to the specific URL with the page parameter
      const urlParts = returnUrl.split('#');
      const path = urlParts[0];
      const fragment = urlParts[1];
      
      this.router.navigate([path], { 
        fragment: fragment,
        queryParams: { returnPage: returnPage }
      });
    } else if (returnUrl) {
      // Navigate back to the specific URL without page
      const urlParts = returnUrl.split('#');
      const path = urlParts[0];
      const fragment = urlParts[1];
      
      this.router.navigate([path], { fragment: fragment });
    } else {
      // Default fallback
      this.router.navigate(['/admin'], { fragment: 'publish' });
    }
  }

  getPublishButtonText(): string {
    const isAlreadyPublished = this.submission?.status === SUBMISSION_STATUS.PUBLISHED || 
                               this.submission?.publishedAt || 
                               this.submission?.isPublished;
    return isAlreadyPublished ? 'Save & Update' : 'Save & Publish';
  }

  getPublishingText(): string {
    const isAlreadyPublished = this.submission?.status === SUBMISSION_STATUS.PUBLISHED || 
                               this.submission?.publishedAt || 
                               this.submission?.isPublished;
    return isAlreadyPublished ? 'Updating...' : 'Publishing...';
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

  // Handle image deletion from editor
  onImageDelete(imageUrl: string) {
    if (!imageUrl) return;

    // Extract S3 key from URL
    // URL format: http://localhost:3000/uploads/temp/articles/filename.jpg
    // or https://cloudfront.net/uploads/temp/articles/filename.jpg
    const s3Key = this.extractS3KeyFromUrl(imageUrl);

    if (!s3Key) {
      console.error('❌ Could not extract S3 key from URL:', imageUrl);
      return;
    }

    console.log('🗑️ Deleting image with S3 key:', s3Key);

    // Call backend to delete image from S3
    this.backendService.deleteImageByS3Key(s3Key).subscribe({
      next: (response) => {
        console.log('✅ Image deleted from S3:', response);
        // Don't show toast as image is already removed from editor
      },
      error: (err: any) => {
        console.error('❌ Failed to delete image from S3:', err);
        // Silently fail - image is already removed from editor
      }
    });
  }

  // Extract S3 key from image URL
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      // Handle both local and CDN URLs
      // Local: http://localhost:3000/uploads/temp/articles/filename.jpg
      // CDN: https://cloudfront.net/uploads/temp/articles/filename.jpg

      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading slash and extract the S3 key
      // S3 key format: uploads/temp/articles/filename.jpg
      const s3Key = pathname.startsWith('/') ? pathname.substring(1) : pathname;

      return s3Key || null;
    } catch (error) {
      console.error('Error parsing image URL:', error);
      return null;
    }
  }

  // Load user profile to check for pending approval data
  loadUserProfile(userId: string) {
    console.log('🔧 Loading user profile for:', userId);
    this.backendService.getUserById(userId).subscribe({
      next: (response: any) => {
        console.log('🔧 User profile loaded:', response.user);
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

        // Check for profile image reuse opportunity (only for poems)
        this.checkProfileImageReuse();
      },
      error: () => {
        console.log('❌ Failed to load user profile');
        // Error handled silently - optional operation
      }
    });
  }

  // Check if user profile image can be reused for poem submissions
  checkProfileImageReuse() {
    console.log('🔧 Checking profile image reuse conditions:');
    console.log('🔧 Submission type:', this.submission?.submissionType);
    console.log('🔧 Has existing image:', !!this.submission?.imageUrl);
    console.log('🔧 User profile image:', this.userProfile?.profileImage);
    console.log('🔧 Available profile image:', this.availableProfileImage);
    console.log('🔧 Show reuse option:', this.showProfileImageReuse);

    // Only show profile image reuse option for poems without an existing image
    if (this.submission?.submissionType === 'poem' && 
        !this.submission?.imageUrl && 
        this.userProfile?.profileImage) {
      
      this.availableProfileImage = this.userProfile.profileImage;
      this.showProfileImageReuse = true;
      
      console.log('✅ Profile image reuse enabled!');
      this.showToast('Your profile image is available to reuse for this poem. Click "Use Profile Image" to avoid re-uploading.', 'info');
    } else {
      console.log('❌ Profile image reuse not enabled - conditions not met');
    }
  }

  // Use profile image as submission cover image
  useProfileImageAsCover() {
    if (!this.availableProfileImage) {
      this.showError('No profile image available to use.');
      return;
    }

    // Set the profile image as the submission's cover image
    this.submission.imageUrl = this.availableProfileImage;
    
    // Immediately save the change to persist it
    const updateData = {
      imageUrl: this.availableProfileImage
    };

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        // Hide the reuse suggestion since we've used it
        this.showProfileImageReuse = false;
        this.showSuccess('Profile image has been set as cover image and saved successfully!');
      },
      error: (err) => {
        // Revert the change if saving failed
        this.submission.imageUrl = '';
        this.showError('Failed to save profile image as cover. Please try again.');
      }
    });
  }

  // Dismiss profile image reuse suggestion
  dismissProfileImageReuse() {
    this.showProfileImageReuse = false;
  }

  // Approve user's bio and copy to main profile
  approveBio() {
    const updatedBio = this.profileApprovalData.tempBio;
    // TODO: Replace with direct user profile update if needed
    this.profileApprovalData.approvedBio = updatedBio;
    this.profileApprovalData.tempBio = '';
    this.showSuccess('Bio approved locally!');
    
    // Check if all approvals are done
    this.checkProfileApprovalComplete();
  }

  // Approve user's profile image
  approveProfileImage() {
    // TODO: Replace with direct user profile update if needed
    this.profileApprovalData.approvedImage = true;
    this.profileApprovalData.tempProfileImage = '';
    this.showSuccess('Profile image approved locally!');
    
    // Check if all approvals are done
    this.checkProfileApprovalComplete();
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

  // Extract all images from submission content
  getContentImages(): string[] {
    const images: string[] = [];
    const tempDiv = document.createElement('div');

    // Gather images from content bodies
    if (this.submission?.contents && this.submission.contents.length > 0) {
      this.submission.contents.forEach((content: any) => {
        if (content.body) {
          tempDiv.innerHTML = content.body;
          const imgElements = tempDiv.querySelectorAll('img');

          imgElements.forEach((img: HTMLImageElement) => {
            const src = img.getAttribute('src');
            if (src && !images.includes(src)) {
              images.push(src);
            }
          });
        }
      });
    }

    // Also include the current cover image and social (og) image so recently uploaded images are visible
    try {
      const cover = this.submission?.imageUrl;
      const og = this.seoConfig?.ogImage;

      if (cover && typeof cover === 'string' && !images.includes(cover)) {
        images.unshift(cover); // show cover first
      }
      if (og && typeof og === 'string' && !images.includes(og)) {
        images.unshift(og); // show social image near the front
      }
    } catch (e) {
      // noop
    }

    // Debug: log the extracted images
    if (images.length > 0) {
      console.log('📸 Content images found (including cover/og):', images);
    }

    return images;
  }

  // Handle image load error
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
  }

  // Use content image as cover
  useContentImageAsCover(imageUrl: string) {
    if (!imageUrl) {
      this.showError('No image URL provided.');
      return;
    }

    this.submission.imageUrl = imageUrl;

    // Immediately save the change to persist it
    const updateData = {
      imageUrl: imageUrl
    };

    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: (response) => {
        this.showSuccess('Content image has been set as cover image and saved successfully!');
      },
      error: (err) => {
        // Revert the change if saving failed
        this.submission.imageUrl = '';
        this.showError('Failed to save content image as cover. Please try again.');
      }
    });
  }

  // Use content image as social media image
  useContentImageAsSocial(imageUrl: string) {
    if (!imageUrl) {
      this.showError('No image URL provided.');
      return;
    }

    this.seoConfig.ogImage = imageUrl;
    this.showSuccess('Content image set as social media image.');
  }
}
