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
  // Primary submission-level SEO keyword (single value)
  primaryKeyword?: string;
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

  // Persisted uploaded images (public URLs returned by backend) that should appear in gallery
  uploadedImages: string[] = [];

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
    featuredPost: false,
    primaryKeyword: ''
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
        // Primary keyword at submission level
        this.seoConfig.primaryKeyword = this.submission.seo.primaryKeyword || this.submission.title || '';
      } else {
        // Generate initial values if no SEO data exists
        this.seoConfig.slug = this.generateSlugFromTitle(this.submission.title);
        this.seoConfig.metaTitle = this.submission.title;
        this.seoConfig.metaDescription = this.submission?.description || '';
        this.seoConfig.ogImage = '';
        this.seoConfig.featuredPost = false;
        this.seoConfig.primaryKeyword = this.submission.title || '';
      }

      // Ensure each content has a content-level SEO keyword (defaults to content title)
      if (this.submission.contents && Array.isArray(this.submission.contents)) {
        this.submission.contents = this.submission.contents.map((content: any) => ({
          ...content,
          // Preserve existing content.seo.keyword if present, otherwise default to title
          seoKeyword: (content.seo && content.seo.keyword) ? content.seo.keyword : (content.title || ''),
          // Per-content meta title/description for editor inputs (default from content.seo or content itself)
          metaTitle: (content.seo && content.seo.metaTitle) ? content.seo.metaTitle : (content.title || ''),
          metaDescription: (content.seo && content.seo.metaDescription) ? content.seo.metaDescription : ((this.extractPlainText(content.body) || '').substring(0, 160).trim())
        }));
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
        // Collect tags from content items
        const allContentTags = new Set<string>();
        if (this.submission.contents) {
          this.submission.contents.forEach((content: any) => {
            if (content.tags && Array.isArray(content.tags)) {
              content.tags.forEach((tag: any) => {
                const cleanTag = (typeof tag === 'string') ? tag.trim() : (tag?.name || '').trim();
                if (cleanTag && cleanTag.length > 0) {
                  allContentTags.add(cleanTag);
                }
              });
            }
          });
        }
        this.seoConfig.keywords = Array.from(allContentTags);
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
    console.log('[Publish] onCoverImageSelect triggered, file:', file);
    if (file) {
      if (!this.validateImageFile(file, event.target)) {
        console.log('[Publish] onCoverImageSelect - validation failed');
        return;
      }

      try {
        this.showSuccess('Compressing cover image to WebP format...');
        console.log('[Publish] Compressing cover image...', { name: file.name, size: file.size });
        const compressed = await compressImageForUpload(file, {
          targetSizeKB: 250,
          maxWidth: UPLOAD_CONFIG.MAX_DIMENSIONS.width,
          maxHeight: UPLOAD_CONFIG.MAX_DIMENSIONS.height
        });

        console.log('[Publish] Compression complete', { originalSize: file.size, compressedSize: compressed.file.size, compressionRatio: compressed.compressionRatio });
        this.selectedCoverImageFile = compressed.file;

        // Create transient preview URL for the selected file so it appears in the gallery
        if (this.lastSelectedCoverPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl);
        }
        this.lastSelectedCoverPreviewUrl = URL.createObjectURL(this.selectedCoverImageFile);
        this.transientUploadedImages = [this.lastSelectedCoverPreviewUrl, ...this.transientUploadedImages];

        // Dismiss profile image reuse suggestion when user selects a different file
        this.showProfileImageReuse = false;

        // Immediately upload the compressed cover image to backend so it becomes a public URL
        if (this.submission && this.selectedCoverImageFile) {
          this.isUploadingCoverImage = true;
          console.log('[Publish] Starting cover image upload to backend for submission:', this.submission._id);
          this.backendService.uploadSubmissionImage(this.submission._id, this.selectedCoverImageFile).subscribe({
             next: (response: any) => {
               console.log('[Publish] Cover upload response:', response);
              const url = this.normalizeImageUrl(response?.imageUrl || response?.submission?.imageUrl || '');
              console.log('[Publish] Normalized cover image URL:', url);
              if (url) {
                // Attempt to verify the returned public URL is actually reachable.
                this.verifyImageAccessible(url).then(isAccessible => {
                  console.log('[Publish] verifyImageAccessible (cover) =>', isAccessible, url);
                  if (isAccessible) {
                    if (!this.uploadedImages.includes(url)) this.uploadedImages.unshift(url);
                    // set as current cover preview (do not auto-save as cover, let user choose)
                    this.submission.imageUrl = url;
                  } else {
                    console.warn('[Publish] Uploaded image URL is not reachable:', url);
                    if (!this.uploadedImages.includes(url)) this.uploadedImages.unshift(url);
                    this.showToast('Image uploaded but public URL not reachable yet. Keeping local preview.', 'info');
                  }
                }).catch(err => {
                  console.warn('verifyImageAccessible error (cover):', err);
                });
              }
               this.selectedCoverImageFile = null;
               this.isUploadingCoverImage = false;

               // Remove transient preview if present and revoke URL
               if (this.lastSelectedCoverPreviewUrl) {
                 const index = this.transientUploadedImages.indexOf(this.lastSelectedCoverPreviewUrl as string);
                 if (index !== -1) this.transientUploadedImages.splice(index, 1);
                 try { URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl as string); } catch (e) {}
                 this.lastSelectedCoverPreviewUrl = null;
               }
             },
             error: (err) => {
               console.error('[Publish] Cover upload error:', err);
               this.handleUploadError(err);
               this.isUploadingCoverImage = false;
             }
           });
         }
      } catch (error) {
        console.error('[Publish] Compression failed for cover image, using original file:', error);
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
    console.log('[Publish] onSocialImageSelect triggered, file:', file);
    if (file) {
      if (!this.validateImageFile(file, event.target)) {
        console.log('[Publish] onSocialImageSelect - validation failed');
        return;
      }

      try {
        this.showSuccess('Compressing social image to WebP format...');
        console.log('[Publish] Compressing social image...', { name: file.name, size: file.size });
        const compressed = await compressImageForUpload(file, {
          targetSizeKB: 250,
          maxWidth: UPLOAD_CONFIG.MAX_DIMENSIONS.width,
          maxHeight: UPLOAD_CONFIG.MAX_DIMENSIONS.height
        });

        console.log('[Publish] Social compression complete', { originalSize: file.size, compressedSize: compressed.file.size, compressionRatio: compressed.compressionRatio });
        this.selectedSocialImageFile = compressed.file;

        // Create transient preview URL for the selected social file
        if (this.lastSelectedSocialPreviewUrl) {
          URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl);
        }
        this.lastSelectedSocialPreviewUrl = URL.createObjectURL(this.selectedSocialImageFile);
        this.transientUploadedImages = [this.lastSelectedSocialPreviewUrl, ...this.transientUploadedImages];

        // Immediately upload the compressed social image so it becomes a public URL
        if (this.submission && this.selectedSocialImageFile) {
          this.isUploadingSocialImage = true;
          console.log('[Publish] Starting social image upload to backend for submission:', this.submission._id);
          this.backendService.uploadSubmissionImage(this.submission._id, this.selectedSocialImageFile).subscribe({
             next: (response: any) => {
               console.log('[Publish] Social upload response:', response);
              const url = this.normalizeImageUrl(response?.imageUrl || response?.submission?.seo?.ogImage || response?.submission?.imageUrl || '');
              console.log('[Publish] Normalized social image URL:', url);
              if (url) {
                this.verifyImageAccessible(url).then(isAccessible => {
                  console.log('[Publish] verifyImageAccessible (social) =>', isAccessible, url);
                  if (isAccessible) {
                    if (!this.uploadedImages.includes(url)) this.uploadedImages.unshift(url);
                    this.seoConfig.ogImage = url;
                  } else {
                    console.warn('[Publish] Uploaded social image URL not reachable:', url);
                    if (!this.uploadedImages.includes(url)) this.uploadedImages.unshift(url);
                    this.showToast('Social image uploaded but public URL not reachable yet. Keeping local preview.', 'info');
                  }
                }).catch(err => console.warn('verifyImageAccessible error (social):', err));
              }
               this.selectedSocialImageFile = null;
               this.isUploadingSocialImage = false;

               if (this.lastSelectedSocialPreviewUrl) {
                 const index = this.transientUploadedImages.indexOf(this.lastSelectedSocialPreviewUrl as string);
                 if (index !== -1) this.transientUploadedImages.splice(index, 1);
                 try { URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl as string); } catch (e) {}
                 this.lastSelectedSocialPreviewUrl = null;
               }
             },
             error: (err) => {
               console.error('[Publish] Social upload error:', err);
               this.handleUploadError(err);
               this.isUploadingSocialImage = false;
             }
           });
         }
      } catch (error) {
        console.error('[Publish] Compression failed for social image, using original file:', error);
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
        // Normalize returned URL to avoid localhost references in prod
        this.submission.imageUrl = this.normalizeImageUrl(response.imageUrl);

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
        // Update SEO config with new social media image URL (normalize to avoid localhost)
        this.seoConfig.ogImage = this.normalizeImageUrl(response.imageUrl);

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

  // Normalize backend-returned image URLs: replace localhost with current origin ONLY in production
  private normalizeImageUrl(url: string): string {
    if (!url || typeof url !== 'string') return url;
    try {
      // If it's a blob/data url, we should not normalize here (should be uploaded instead)
      if (url.startsWith('blob:') || url.startsWith('data:')) return url;
      const parsed = new URL(url);
      const host = parsed.host || '';

      // Only rewrite localhost URLs when running in production (non-localhost origin)
      // Don't rewrite in development where both frontend and backend use localhost
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        const isRunningOnLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
        const urlIsLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

        if (urlIsLocalhost && !isRunningOnLocalhost) {
          // Production case: rewrite localhost URLs to use production origin
          const newUrl = `${currentOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
          console.warn(`[Publish] Rewriting returned image URL from ${url} to ${newUrl}`);
          return newUrl;
        }
      }

      // Development case: keep localhost URLs as-is (e.g., localhost:3000 stays localhost:3000)
      return url;
    } catch (e) {
      return url;
    }
  }

  // Verify that an image URL is reachable (loads successfully) before using it as a live preview
  private verifyImageAccessible(url: string, timeoutMs: number = 5000): Promise<boolean> {
    return new Promise(resolve => {
      if (!url || typeof url !== 'string') return resolve(false);
      try {
        const img = new Image();
        let settled = false;
        const onSuccess = () => { if (!settled) { settled = true; cleanup(); resolve(true); } };
        const onFail = () => { if (!settled) { settled = true; cleanup(); resolve(false); } };
        const cleanup = () => {
          img.onload = null; img.onerror = null; try { clearTimeout(timer); } catch(e){}
        };
        img.onload = onSuccess;
        img.onerror = onFail;
        img.src = url;
        const timer = setTimeout(() => { if (!settled) { settled = true; cleanup(); resolve(false); } }, timeoutMs);
      } catch (e) {
        return resolve(false);
      }
    });
  }

  // Extract plain text from HTML content (used for auto-generated descriptions/excerpts)
  private extractPlainText(html: string): string {
    if (!html) return '';
    try {
      // If running in Node/SSR, document won't exist — use simple regex-based stripping
      if (typeof document === 'undefined') {
        let text = html.replace(/<[^>]+>/g, ' ');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        return text.replace(/\s+/g, ' ').trim();
      }

      const div = document.createElement('div');
      div.innerHTML = html;
      const text = div.textContent || div.innerText || '';
      // Normalize non-breaking spaces and trim
      return text.replace(/\u00A0/g, ' ').trim();
    } catch (e) {
      return '';
    }
  }

  // Centralized upload error handler to show friendly messages
  private handleUploadError(err: any): void {
    console.error('Upload error:', err);
    const message = err?.error?.message || err?.message || 'Failed to upload image. Please try again.';
    this.showError(message);
  }

  // Upload any selected local images before publishing. Updates submission and SEO fields with returned public URLs.
  private async uploadPendingImagesIfAny(): Promise<void> {
    if (!this.submission) return;

    try {
      // Upload cover image if selected
      if (this.selectedCoverImageFile) {
        console.log('[Publish] uploadPendingImagesIfAny - uploading cover image', this.selectedCoverImageFile);
        const resp: any = await lastValueFrom(this.backendService.uploadSubmissionImage(this.submission._id, this.selectedCoverImageFile));
        console.log('[Publish] uploadPendingImagesIfAny - cover upload response:', resp);
        const imageUrl = resp?.imageUrl || resp?.submission?.imageUrl || resp?.image?.url || '';
        console.log('[Publish] uploadPendingImagesIfAny - cover returned imageUrl:', imageUrl);
        this.submission.imageUrl = this.normalizeImageUrl(imageUrl);
        this.selectedCoverImageFile = null;
      }

      // Upload social image if selected
      if (this.selectedSocialImageFile) {
        console.log('[Publish] uploadPendingImagesIfAny - uploading social image', this.selectedSocialImageFile);
        const resp: any = await lastValueFrom(this.backendService.uploadSubmissionImage(this.submission._id, this.selectedSocialImageFile));
        console.log('[Publish] uploadPendingImagesIfAny - social upload response:', resp);
        const socUrl = resp?.imageUrl || resp?.submission?.seo?.ogImage || resp?.submission?.imageUrl || resp?.image?.url || '';
        console.log('[Publish] uploadPendingImagesIfAny - social returned imageUrl:', socUrl);
        this.seoConfig.ogImage = this.normalizeImageUrl(socUrl);
        this.selectedSocialImageFile = null;
      }
    } catch (e: any) {
      console.error('[Publish] uploadPendingImagesIfAny error:', e);
      // Re-throw to let caller handle UI state
      throw e;
    }
  }

  // Auto-fill helpers
  autoFillDescription() {
    if (!this.submission) return;
    const first = this.submission.contents && this.submission.contents[0];
    const text = first ? this.extractPlainText(first.body) : (this.submission.description || '');
    this.submission.description = text.substring(0, 300).trim();
    this.showSuccess('Description auto-filled');
  }

  autoFillMetaDescription() {
    if (!this.submission) return;
    const first = this.submission.contents && this.submission.contents[0];
    const text = first ? this.extractPlainText(first.body) : (this.submission.description || '');
    this.seoConfig.metaDescription = text.substring(0, 160).trim();
    this.showSuccess('Meta description auto-filled');
  }

  autoFillExcerpt() {
    if (!this.submission) return;
    this.submission.excerpt = this.getAutoGeneratedExcerpt();
    this.showSuccess('Excerpt reset to auto');
  }

  getAutoGeneratedExcerpt(): string {
    if (!this.submission) return '';
    if (this.submission.excerpt && this.submission.excerpt.length > 0) return this.submission.excerpt;
    if (this.submission.description && this.submission.description.length > 0) return this.submission.description.substring(0, 150).trim();
    const first = this.submission.contents && this.submission.contents[0];
    const text = first ? this.extractPlainText(first.body) : '';
    return (text || '').substring(0, 150).trim();
  }

  // Toggle custom excerpt editing (template invokes this method)
  isCustomExcerptEnabled = false;
  enableCustomExcerpt() {
    this.isCustomExcerptEnabled = true;
    this.showToast('You can now customize the excerpt.', 'info');
  }

  // Image action helpers used by template buttons
  useCoverImageAsSocial() {
    if (!this.submission || !this.submission.imageUrl) {
      this.showError('No cover image to use.');
      return;
    }
    if (this.submission.imageUrl.startsWith('blob:') || this.submission.imageUrl.startsWith('data:')) {
      this.showError('Please upload the cover image before using it as social image.');
      return;
    }
    this.seoConfig.ogImage = this.normalizeImageUrl(this.submission.imageUrl);
    this.showSuccess('Cover image set as social image.');
  }

  removeCoverImage() {
    if (!this.submission) return;
    const prev = this.submission.imageUrl;
    this.submission.imageUrl = '';
    // Attempt to delete on backend silently
    this.backendService.deleteSubmissionImage(this.submission._id).subscribe({
      next: () => {
        this.showSuccess('Cover image removed');
      },
      error: (err) => {
        console.warn('Failed to delete cover image on backend:', err);
      }
    });
    // revoke transient preview if it matches
    if (this.lastSelectedCoverPreviewUrl) {
      try { URL.revokeObjectURL(this.lastSelectedCoverPreviewUrl); } catch(e){}
      this.lastSelectedCoverPreviewUrl = null;
    }
  }

  removeSocialImage() {
    this.seoConfig.ogImage = '';
    this.showSuccess('Social image removed');
    if (this.lastSelectedSocialPreviewUrl) {
      try { URL.revokeObjectURL(this.lastSelectedSocialPreviewUrl); } catch(e){}
      this.lastSelectedSocialPreviewUrl = null;
    }
  }

  useSocialImageAsCover() {
    if (!this.seoConfig.ogImage) {
      this.showError('No social image available to set as cover.');
      return;
    }
    if (this.seoConfig.ogImage.startsWith('blob:') || this.seoConfig.ogImage.startsWith('data:')) {
      this.showError('Please upload the social image before using it as cover.');
      return;
    }
    this.submission.imageUrl = this.normalizeImageUrl(this.seoConfig.ogImage);
    this.showSuccess('Social image set as cover.');
  }

  // Template image error handler (fallback image)
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+Image Error</dGV4dD48L3N2Zz4=';
  }

  // Use an image from content/gallery as the cover and persist immediately
  useContentImageAsCover(imageUrl: string) {
    if (!imageUrl) {
      this.showError('No image URL provided.');
      return;
    }
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      this.showError('This is a local preview URL. Please upload this image first before using it as the cover.');
      return;
    }

    const normalized = this.normalizeImageUrl(imageUrl);
    this.submission.imageUrl = normalized;

    // Persist the change immediately
    const updateData = { imageUrl: normalized };
    this.backendService.updateSubmission(this.submission._id, updateData).subscribe({
      next: () => {
        this.showSuccess('Cover image set and saved.');
      },
      error: (err) => {
        console.error('Failed to save cover image:', err);
        this.showError('Failed to save cover image.');
      }
    });
  }

  // Use an image from content/gallery as the social (og) image and persist immediately
  useContentImageAsSocial(imageUrl: string) {
    if (!imageUrl) {
      this.showError('No image URL provided.');
      return;
    }
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      this.showError('This is a local preview URL. Please upload this image first before using it as the social image.');
      return;
    }

    const normalized = this.normalizeImageUrl(imageUrl);
    this.seoConfig.ogImage = normalized;

    // Persist SEO change
    this.backendService.updateSEOConfiguration(this.submission._id, { ogImage: normalized }).subscribe({
      next: () => {
        this.showSuccess('Social image set and saved.');
      },
      error: (err) => {
        console.error('Failed to save social image:', err);
        this.showError('Failed to save social image.');
      }
    });
  }

  goBack() {
    // Navigate back to admin submissions list
    try {
      this.router.navigate(['/admin/submissions']);
    } catch (e) {
      window.history.back();
    }
  }

  // Validate minimal form requirements for publishing
  isFormValid(): boolean {
    if (!this.submission) return false;
    // require title and slug at minimum
    if (!this.submission.title || !this.seoConfig.slug) return false;
    return true;
  }

  getPublishButtonText(): string {
    return this.submission && this.submission.status === 'published' ? 'Republish' : 'Publish';
  }

  getPublishingText(): string {
    return 'Publishing...';
  }

  // Save changes locally (patch submission)
  saveChanges() {
    if (!this.submission) return;
    const updatePayload: any = {
      title: this.submission.title,
      description: this.submission.description,
      excerpt: this.submission.excerpt
    };
    this.backendService.updateSubmission(this.submission._id, updatePayload).subscribe({
      next: () => this.showSuccess('Changes saved'),
      error: (err) => this.showError('Failed to save changes')
    });
  }

  // Publish flow: upload pending images then call backend publish endpoint
  async saveAndPublish() {
    if (!this.submission) return;
    if (!this.isFormValid()) {
      this.showError('Please fill required fields before publishing.');
      return;
    }

    this.isPublishing = true;
    try {
      // Ensure any selected images are uploaded first so URLs are available
      await this.uploadPendingImagesIfAny();

      // Build perContentTags map from current UI inputs (do not persist yet)
      const perContentTags: Record<string, string[]> = {};
      if (this.submission.contents && Array.isArray(this.submission.contents)) {
        this.submission.contents.forEach((c: any) => {
          if (c.tags && Array.isArray(c.tags)) {
            perContentTags[c._id] = c.tags.map((t: string) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
          }
        });
      }

      // Build per-content meta (title + description + primaryKeyword) to persist into content.seo
      const perContentMeta: Record<string, { metaTitle?: string; metaDescription?: string; primaryKeyword?: string }> = {};
      if (this.submission.contents && Array.isArray(this.submission.contents)) {
        this.submission.contents.forEach((c: any) => {
          const metaTitle = (c.metaTitle && String(c.metaTitle).trim()) ? String(c.metaTitle).trim() : (c.title || '');
          const metaDescription = (c.metaDescription && String(c.metaDescription).trim()) ? String(c.metaDescription).trim() : (this.extractPlainText(c.body) || '').substring(0, 160).trim();

          // Prefer explicit content-level primary keyword (in perContentMeta or seo), then seoKeyword, then generated value
          const primaryKeyword = (c.seo && c.seo.primaryKeyword) ? String(c.seo.primaryKeyword).trim()
            : (c.seoKeyword && String(c.seoKeyword).trim()) ? String(c.seoKeyword).trim()
            : (c.title || '');

          perContentMeta[c._id] = { metaTitle, metaDescription, primaryKeyword };
        });
      }

      // Build per-content titles map so backend can persist title edits on publish
      const perContentTitles: Record<string, string> = {};
      if (this.submission.contents && Array.isArray(this.submission.contents)) {
        this.submission.contents.forEach((c: any) => {
          if (c && c._id && typeof c.title === 'string') {
            perContentTitles[c._id] = String(c.title).trim();
          }
        });
      }
+
      // Build SEO payload using a submissionMeta object for submission-level SEO fields
      const payload: any = {
        // Submission fields to persist
        title: this.submission.title,
        description: this.submission.description,
        excerpt: this.submission.excerpt,

        // Submission-level SEO grouped under submissionMeta
        submissionMeta: {
          slug: this.seoConfig.slug,
          metaTitle: this.seoConfig.metaTitle || this.submission?.title,
          metaDescription: this.seoConfig.metaDescription || this.submission?.description,
          primaryKeyword: (this.seoConfig.primaryKeyword || this.submission?.title || '').trim(),
          ogImage: this.seoConfig.ogImage || this.submission.imageUrl || ''
        },

        // Per-content metadata and tags
        perContentMeta,
        perContentTags,
        perContentTitles
      };

      // Call publish endpoint which creates canonical Tag docs and updates Content.tags to Tag._id
      await lastValueFrom(this.backendService.publishSubmissionWithSEO(this.submission._id, payload));

      this.showSuccess('Submission published successfully');
      this.isPublishing = false;
      // Navigate back to submissions list
      this.router.navigate(['/admin/submissions']);
    } catch (e: any) {
      console.error('Publish
