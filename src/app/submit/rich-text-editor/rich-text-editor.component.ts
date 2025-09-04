
import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild, AfterViewInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ImageCompressionUtil, CompressedImage } from '../../shared/utils/image-compression.util';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../shared/constants/api.constants';
import { ThemingService } from '../../services/theming.service';

@Component({
  selector: 'app-rich-text-editor',
  imports: [],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;
  
  @Input() placeholder: string = 'Write your content here...';
  @Input() allowImages: boolean = false;
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUpload = new EventEmitter<CompressedImage>();

  content: string = '';
  wordCount: number = 0;
  currentAlignment: string = 'left';
  uploadedImages: CompressedImage[] = [];
  temporaryImages: string[] = []; // Track temporary S3 URLs for cleanup
  isImageUploading: boolean = false;
  uploadStatus: string = 'Preparing upload...';
  
  private onChange = (value: string) => {};
  private onTouched = () => {};
  private http = inject(HttpClient);
  public themingService = inject(ThemingService);

  ngAfterViewInit(): void {
    // Initialize editor content after view is ready
    if (this.content && this.editor) {
      this.editor.nativeElement.innerHTML = this.content;
    }
    
    // Prevent browser from creating default paragraphs
    if (this.editor) {
      // Set default paragraph separator to br instead of div/p
      try {
        document.execCommand('defaultParagraphSeparator', false, 'br');
      } catch (e) {
        // Some browsers don't support this, ignore silently
      }
      
      // Set up event listeners for caption editing
      this.setupCaptionEventListeners();
      
      // Add delete buttons to existing images
      this.addDeleteButtonsToExistingImages();
      
      // Make instance available for delete functionality
      (window as any).richTextEditorInstance = this;
    }
    
    this.setupPageUnloadCleanup();
  }

  ngOnDestroy(): void {
    // Cleanup temporary images when component is destroyed
    this.cleanupTemporaryImages();
  }

  private setupCaptionEventListeners(): void {
    // Handle caption editing events
    this.editor.nativeElement.addEventListener('click', (event: any) => {
      const target = event.target;
      if (target && target.tagName === 'FIGCAPTION') {
        // Allow editing of captions
        setTimeout(() => {
          target.focus();
        }, 0);
      }
    });

    // Handle caption content changes
    this.editor.nativeElement.addEventListener('input', (event: any) => {
      const target = event.target;
      if (target && target.tagName === 'FIGCAPTION') {
        // Trigger content change when caption is edited
        this.onContentChange({ target: this.editor.nativeElement } as any);
      }
    });
  }

  private setupImageEventListeners(imageId: string): void {
    const figure = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"]`);
    if (!figure) return;
    
    // Delete button
    const deleteBtn = figure.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteImage(imageId);
      });
    }
    
    // Width toggle button
    const widthBtn = figure.querySelector('.width-btn');
    if (widthBtn) {
      widthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleImageWidth(imageId);
      });
    }
    
    // Caption button
    const captionBtn = figure.querySelector('.caption-btn');
    if (captionBtn) {
      captionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.focusCaption(imageId);
      });
    }
  }

  private addDeleteButtonsToExistingImages(): void {
    // Find all existing images (img tags or figure elements)
    const images = this.editor.nativeElement.querySelectorAll('img');
    
    images.forEach((img: any) => {
      // Skip if already has new-style toolbar
      if (img.closest('.image-figure')?.querySelector('.image-toolbar')) {
        return;
      }
      
      // Create unique ID for existing image
      const imageId = `existing-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const imageUrl = img.src;
      const alt = img.alt || 'Image';
      
      // Get existing caption if any
      let existingCaption = '';
      const existingFigure = img.closest('figure');
      if (existingFigure) {
        const figcaption = existingFigure.querySelector('figcaption');
        if (figcaption) {
          existingCaption = figcaption.textContent || '';
        }
      }
      
      // Create new Substack-like figure structure
      const figureHtml = `<figure class="image-figure" contenteditable="false" data-image-id="${imageId}" data-image-url="${imageUrl}" data-width="full">
        <div class="image-wrapper">
          <div class="image-container">
            <img src="${imageUrl}" alt="${alt}" class="image-content" />
            <div class="image-toolbar">
              <div class="image-toolbar-group">
                <button type="button" class="image-toolbar-btn width-btn" data-action="width" data-image-id="${imageId}" title="Change width">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#ffffff" style="stroke: #ffffff;"/>
                  </svg>
                </button>
                <button type="button" class="image-toolbar-btn caption-btn" data-action="caption" data-image-id="${imageId}" title="Edit caption">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#ffffff" style="stroke: #ffffff;"/>
                  </svg>
                </button>
                <button type="button" class="image-toolbar-btn delete-btn" data-action="delete" data-image-id="${imageId}" title="Delete image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="#ffffff" style="stroke: #ffffff;"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <figcaption class="image-caption" contenteditable="true" data-placeholder="Write a caption...">${existingCaption}</figcaption>
        </div>
      </figure>`;
      
      // Replace the old image/figure with new structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = figureHtml;
      const newFigure = tempDiv.firstChild as Element;
      
      if (existingFigure) {
        existingFigure.parentNode?.replaceChild(newFigure, existingFigure);
      } else {
        img.parentNode?.replaceChild(newFigure, img);
      }
      
      // Set up event listeners for the new structure
      setTimeout(() => {
        this.setupImageEventListeners(imageId);
      }, 0);
    });
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    const newValue = value || '';
    
    // Only update DOM if value actually changed and editor is not focused
    if (newValue !== this.content) {
      this.content = newValue;
      if (this.editor && document.activeElement !== this.editor.nativeElement) {
        this.editor.nativeElement.innerHTML = this.content;
        // Add delete buttons to any existing images
        setTimeout(() => {
          this.addDeleteButtonsToExistingImages();
        }, 0);
      }
      this.updateWordCount();
    }
  }
  
  // Removed complex selection code that was causing issues

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.editor) {
      this.editor.nativeElement.contentEditable = (!isDisabled).toString();
    }
  }

  onContentChange(event: Event): void {
    const target = event.target as HTMLDivElement;
    this.content = target.innerHTML;
    this.updateWordCount();
    this.onChange(this.content);
    this.contentChange.emit(this.content);
    this.onTouched();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle Enter key for proper line break insertion
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Insert a single line break and trigger content change
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        this.onContentChange({ target: this.editor.nativeElement } as any);
      }
      return;
    }
    
    // Handle Shift+Enter for double line break (paragraph break)
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br1 = document.createElement('br');
        const br2 = document.createElement('br');
        range.deleteContents();
        range.insertNode(br1);
        range.setStartAfter(br1);
        range.insertNode(br2);
        range.setStartAfter(br2);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        this.onContentChange({ target: this.editor.nativeElement } as any);
      }
      return;
    }
    
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          this.toggleFormat('bold');
          break;
        case 'i':
          event.preventDefault();
          this.toggleFormat('italic');
          break;
        case 'u':
          event.preventDefault();
          this.toggleFormat('underline');
          break;
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    // Try to get HTML content first, fallback to plain text
    let content = clipboardData.getData('text/html');
    
    if (!content) {
      // If no HTML, get plain text and handle line breaks properly for poetry
      const plainText = clipboardData.getData('text/plain');
      
      // Handle different line break patterns
      content = plainText
        .replace(/\r\n/g, '\n') // Normalize Windows line breaks
        .replace(/\r/g, '\n')   // Normalize Mac line breaks
        .split('\n')            // Split into lines
        .map(line => line.trim() === '' ? '<br>' : this.escapeHtml(line)) // Empty lines become <br>, content lines are escaped
        .join('<br>');          // Join with single <br> tags
    } else {
      // Clean up HTML content - remove unwanted tags and attributes
      content = this.sanitizeClipboardHTML(content);
    }
    
    // Additional step: Remove any remaining color-related inline styles
    content = this.removeColorStyles(content);
    
    if (!content) return;
    
    // Insert content at cursor position using modern approach
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Insert each child node
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      range.insertNode(fragment);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end of editor
      this.editor.nativeElement.innerHTML += content;
    }
    
    // Apply theme styles to newly pasted content
    this.applyThemeStyles();
    
    // Trigger content change
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }
  
  private applyThemeStyles(): void {
    // Force all elements to use our theme styles after paste
    if (this.editor) {
      const allElements = this.editor.nativeElement.querySelectorAll('*');
      allElements.forEach((element: any) => {
        // Remove any remaining inline styles
        element.removeAttribute('style');
        
        // Remove font-related attributes
        const formattingAttrs = ['color', 'face', 'size', 'bgcolor', 'font-family', 'font-size', 'font-weight'];
        formattingAttrs.forEach(attr => element.removeAttribute(attr));
      });
      
      // Ensure the editor content itself has our theme class
      this.editor.nativeElement.classList.add('editor-content');
    }
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private removeColorStyles(html: string): string {
    // Remove all font and color-related CSS properties from style attributes
    return html
      .replace(/style\s*=\s*"[^"]*"/gi, (match) => {
        // Extract style content
        const styleContent = match.replace(/style\s*=\s*"([^"]*)"/i, '$1');
        // Remove all formatting-related styles while preserving line breaks
        const cleanedStyle = styleContent
          .replace(/color\s*:\s*[^;]+;?/gi, '')
          .replace(/background-color\s*:\s*[^;]+;?/gi, '')
          .replace(/background\s*:\s*[^;]+;?/gi, '')
          .replace(/font-family\s*:\s*[^;]+;?/gi, '')
          .replace(/font-size\s*:\s*[^;]+;?/gi, '')
          .replace(/font-weight\s*:\s*[^;]+;?/gi, '')
          .replace(/line-height\s*:\s*[^;]+;?/gi, '')
          .replace(/text-decoration\s*:\s*[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';') // Remove double semicolons
          .replace(/^\s*;\s*|\s*;\s*$/g, '') // Remove leading/trailing semicolons
          .trim();
        
        return cleanedStyle ? `style="${cleanedStyle}"` : '';
      })
      .replace(/style\s*=\s*'[^']*'/gi, (match) => {
        // Handle single quotes too
        const styleContent = match.replace(/style\s*=\s*'([^']*)'/i, '$1');
        const cleanedStyle = styleContent
          .replace(/color\s*:\s*[^;]+;?/gi, '')
          .replace(/background-color\s*:\s*[^;]+;?/gi, '')
          .replace(/background\s*:\s*[^;]+;?/gi, '')
          .replace(/font-family\s*:\s*[^;]+;?/gi, '')
          .replace(/font-size\s*:\s*[^;]+;?/gi, '')
          .replace(/font-weight\s*:\s*[^;]+;?/gi, '')
          .replace(/line-height\s*:\s*[^;]+;?/gi, '')
          .replace(/text-decoration\s*:\s*[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';')
          .replace(/^\s*;\s*|\s*;\s*$/g, '')
          .trim();
        
        return cleanedStyle ? `style='${cleanedStyle}'` : '';
      });
  }

  private sanitizeClipboardHTML(html: string): string {
    // Create a temporary div to parse HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Allow only basic formatting tags, but remove font-specific tags
    const allowedTags = ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'span'];
    const allowedAttributes = ['class']; // Remove 'style' and other formatting attributes
    
    this.cleanElement(tempDiv, allowedTags, allowedAttributes);
    
    return tempDiv.innerHTML;
  }
  
  private cleanElement(element: Element, allowedTags: string[], allowedAttributes: string[]): void {
    // Convert to array to avoid live NodeList issues
    const children = Array.from(element.children);
    
    children.forEach(child => {
      const tagName = child.tagName.toLowerCase();
      
      // Remove font-specific tags entirely, replacing with their content
      const fontTags = ['font', 'small', 'big', 'tt', 'strike', 'del'];
      
      if (fontTags.includes(tagName)) {
        // Replace font tags with just their text content
        const textNode = document.createTextNode(child.textContent || '');
        child.parentNode?.replaceChild(textNode, child);
        return; // Skip processing this element further
      }
      
      if (!allowedTags.includes(tagName)) {
        // Replace other disallowed tags with span to preserve content
        const span = document.createElement('span');
        span.innerHTML = child.innerHTML;
        child.parentNode?.replaceChild(span, child);
        this.cleanElement(span, allowedTags, allowedAttributes);
      } else {
        // Clean all attributes except allowed ones
        const attributes = Array.from(child.attributes);
        attributes.forEach(attr => {
          const attrName = attr.name.toLowerCase();
          if (!allowedAttributes.includes(attrName)) {
            child.removeAttribute(attr.name);
          }
        });
        
        // Specifically remove formatting-related attributes
        const formattingAttributes = ['style', 'color', 'face', 'size', 'bgcolor', 'font-family', 'font-size'];
        formattingAttributes.forEach(attr => {
          child.removeAttribute(attr);
        });
        
        // Recursively clean child elements
        this.cleanElement(child, allowedTags, allowedAttributes);
      }
    });
    
    // Clean text nodes - ensure parent elements don't have formatting styles
    const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(textNode => {
      if (textNode.parentElement) {
        // Remove any remaining style attributes
        textNode.parentElement.removeAttribute('style');
        
        // Remove font-related attributes from parent
        const formattingAttributes = ['color', 'face', 'size', 'bgcolor'];
        formattingAttributes.forEach(attr => {
          textNode.parentElement!.removeAttribute(attr);
        });
      }
    });
  }

  toggleFormat(command: string): void {
    document.execCommand(command, false);
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  setAlignment(alignment: string): void {
    this.currentAlignment = alignment;
    
    // Use document.execCommand for line-specific alignment
    try {
      if (alignment === 'justify') {
        document.execCommand('justifyFull', false);
      } else {
        document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
      }
    } catch (error) {
      console.warn('Alignment command failed:', error);
    }
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  clearFormatting(): void {
    // Remove all formatting
    document.execCommand('removeFormat', false);
    this.currentAlignment = 'left';
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  isFormatActive(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  private updateWordCount(): void {
    // Get plain text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Count words
    this.wordCount = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Get plain text for form validation
  getPlainText(): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.content;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  // Get word count
  getWordCount(): number {
    return this.wordCount;
  }

  // Image upload methods
  triggerImageUpload(): void {
    if (!this.allowImages) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.handleImageUpload(file);
      }
    };
    
    input.click();
  }

  async handleImageUpload(file: File): Promise<void> {
    if (!ImageCompressionUtil.isValidImageFile(file)) {
      alert('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for S3
      alert('Image size must be less than 10MB');
      return;
    }

    this.isImageUploading = true;
    this.uploadStatus = 'Compressing image...';

    try {
      // Update status during upload
      this.uploadStatus = 'Uploading to S3...';
      
      // Upload directly to S3 via backend
      const uploadResult = await this.uploadToS3(file);
      
      if (uploadResult.success) {
        // Insert image into editor using S3 URL
        this.insertS3ImageIntoEditor(uploadResult.image);
        
        // Create CompressedImage object for compatibility
        const compressedImage: CompressedImage = {
          file: file,
          dataUrl: uploadResult.image.url,
          originalSize: uploadResult.image.originalSize || file.size,
          compressedSize: uploadResult.image.size,
          compressionRatio: uploadResult.image.compressionRatio || 0
        };
        
        // Store for later use
        this.uploadedImages.push(compressedImage);
        
        // Emit to parent component
        this.imageUpload.emit(compressedImage);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
      
    } catch (error: any) {
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'You must be logged in to upload images.';
      } else if (error.status === 413) {
        errorMessage = 'Image file is too large. Please try a smaller image.';
      } else if (error.status === 404) {
        errorMessage = 'Image upload service not found. Please contact support.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
      
      alert(errorMessage);
    } finally {
      this.isImageUploading = false;
    }
  }

  private async uploadToS3(file: File, caption: string = ''): Promise<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('submissionType', 'article'); // Default to article
    formData.append('alt', '');
    formData.append('caption', caption);
    formData.append('temporary', 'true'); // Mark as temporary upload

    return this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.UPLOADS.IMAGE}`, formData, { headers }).toPromise();
  }

  private insertS3ImageIntoEditor(imageData: any): void {
    // Track temporary image for potential cleanup
    this.temporaryImages.push(imageData.url);
    
    // Insert image without prompt - caption can be added inline
    this.insertImageWithCaption(imageData.url, imageData.alt || 'Uploaded image', '');
  }

  private insertImageWithCaption(imageUrl: string, alt: string, caption: string): void {
    const imageId = `img-${Date.now()}`;
    
    // Create Substack-like figure element with better controls
    const figureHtml = `<figure class="image-figure" contenteditable="false" data-image-id="${imageId}" data-image-url="${imageUrl}" data-width="full">
      <div class="image-wrapper">
        <div class="image-container">
          <img src="${imageUrl}" alt="${alt}" class="image-content" />
          <div class="image-toolbar">
            <div class="image-toolbar-group">
              <button type="button" class="image-toolbar-btn width-btn" data-action="width" data-image-id="${imageId}" title="Change width">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#ffffff" style="stroke: #ffffff;"/>
                </svg>
              </button>
              <button type="button" class="image-toolbar-btn caption-btn" data-action="caption" data-image-id="${imageId}" title="Edit caption">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#ffffff" style="stroke: #ffffff;"/>
                </svg>
              </button>
              <button type="button" class="image-toolbar-btn delete-btn" data-action="delete" data-image-id="${imageId}" title="Delete image">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" style="stroke: #ffffff; color: #ffffff; stroke-width: 2;">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="#ffffff" style="stroke: #ffffff;"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        ${caption ? `<figcaption class="image-caption" contenteditable="true">${caption}</figcaption>` : '<figcaption class="image-caption" contenteditable="true" data-placeholder="Write a caption..."></figcaption>'}
      </div>
    </figure>`;
    
    // Insert with proper spacing
    this.insertContentAtCursor(figureHtml);
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
    
    // Set up event listeners for all buttons
    setTimeout(() => {
      this.setupImageEventListeners(imageId);
    }, 0);
  }

  private insertContentAtCursor(htmlContent: string): void {
    // Ensure we're working within the correct editor element
    const editorElement = this.editor.nativeElement;
    
    // Focus the editor first to ensure proper selection
    editorElement.focus();
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Verify that the selection is within our editor element
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode as Element;
      }
      
      // If selection is not within our editor, create a new range at the end of editor
      if (!editorElement.contains(container as Node)) {
        range.selectNodeContents(editorElement);
        range.collapse(false); // Collapse to end
      }
      
      // Ensure we're not inside another figure
      const figure = (container as Element).closest?.('.image-figure');
      if (figure && editorElement.contains(figure)) {
        range.setStartAfter(figure);
        range.collapse(true);
      }
      
      // Add line breaks before and after for proper spacing
      const beforeBr = document.createElement('br');
      const afterBr = document.createElement('br');
      
      // Create and insert the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const contentNode = tempDiv.firstChild!;
      
      range.insertNode(afterBr);
      range.insertNode(contentNode);
      range.insertNode(beforeBr);
      
      // Position cursor after the figure
      range.setStartAfter(afterBr);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end of editor with proper spacing
      if (editorElement.innerHTML.trim() === '') {
        editorElement.innerHTML = htmlContent + '<br>';
      } else {
        editorElement.innerHTML += '<br>' + htmlContent + '<br>';
      }
      
      // Set cursor after the inserted content
      const range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  private insertImageIntoEditor(compressedImage: CompressedImage): void {
    // Show caption input modal
    const caption = prompt('Enter image caption (optional):');
    
    this.insertImageWithCaption(compressedImage.dataUrl, 'Uploaded image', caption || '');
  }

  onDragOver(event: DragEvent): void {
    if (!this.allowImages) return;
    event.preventDefault();
    event.stopPropagation();
    this.editor.nativeElement.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editor.nativeElement.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    if (!this.allowImages) return;
    event.preventDefault();
    event.stopPropagation();
    this.editor.nativeElement.classList.remove('drag-over');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleImageUpload(files[0]);
    }
  }

  getUploadedImages(): CompressedImage[] {
    return this.uploadedImages;
  }

  // Enhanced image management methods
  editImageCaption(imageId: string): void {
    const figure = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"]`);
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption) {
        const currentCaption = figcaption.textContent || '';
        const newCaption = prompt('Edit image caption:', currentCaption);
        
        if (newCaption !== null) {
          figcaption.textContent = newCaption;
          this.onContentChange({ target: this.editor.nativeElement } as any);
        }
      }
    }
  }

  deleteImage(imageId: string): void {
    const figure = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"]`);
    if (figure && confirm('Are you sure you want to remove this image?')) {
      const imageUrl = figure.getAttribute('data-image-url');
      
      // Remove from DOM first
      figure.remove();
      this.onContentChange({ target: this.editor.nativeElement } as any);
      
      // If it's an S3 image, we should delete it from S3 too
      if (imageUrl && (imageUrl.includes('amazonaws.com') || imageUrl.includes('cloudfront.net'))) {
        this.deleteImageFromS3(imageUrl).catch(error => {
          console.warn('Failed to delete image from S3:', error);
          // Don't show error to user since image is already removed from editor
        });
      }
    }
  }

  toggleImageWidth(imageId: string): void {
    const figure = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"]`);
    if (!figure) return;
    
    const currentWidth = figure.getAttribute('data-width') || 'full';
    let newWidth: string;
    
    switch (currentWidth) {
      case 'full':
        newWidth = 'wide';
        break;
      case 'wide':
        newWidth = 'normal';
        break;
      case 'normal':
        newWidth = 'small';
        break;
      default:
        newWidth = 'full';
    }
    
    figure.setAttribute('data-width', newWidth);
    figure.className = `image-figure image-width-${newWidth}`;
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  focusCaption(imageId: string): void {
    const figure = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"]`);
    if (!figure) return;
    
    const caption = figure.querySelector('figcaption');
    if (caption) {
      caption.focus();
      // Select all text in caption if it has placeholder content
      if (caption.textContent === '' || caption.hasAttribute('data-placeholder')) {
        const range = document.createRange();
        range.selectNodeContents(caption);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }
  
  private async deleteImageFromS3(imageUrl: string): Promise<void> {
    try {
      const jwtToken = localStorage.getItem('jwt_token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      });

      // Extract S3 key from URL
      const urlParts = imageUrl.split('/');
      const s3Key = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)
      
      await this.http.delete(`${environment.apiBaseUrl}/images/delete`, {
        headers,
        body: { s3Key }
      }).toPromise();
      
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      throw error;
    }
  }

  // Get all images with their captions for form submission
  getImagesWithCaptions(): {imageId: string, src: string, alt: string, caption: string}[] {
    const figures = this.editor.nativeElement.querySelectorAll('figure[data-image-id]');
    const images: {imageId: string, src: string, alt: string, caption: string}[] = [];
    
    figures.forEach((figure: any) => {
      const img = figure.querySelector('img');
      const figcaption = figure.querySelector('figcaption');
      
      if (img) {
        images.push({
          imageId: figure.getAttribute('data-image-id'),
          src: img.src,
          alt: img.alt || '',
          caption: figcaption ? figcaption.textContent || '' : ''
        });
      }
    });
    
    return images;
  }

  // Orphaned image cleanup methods
  private setupPageUnloadCleanup(): void {
    // Cleanup on page unload (user leaves without submitting)
    window.addEventListener('beforeunload', () => {
      this.cleanupTemporaryImages();
    });
    
    // Also cleanup on visibility change (mobile browsers)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cleanupTemporaryImages();
      }
    });
  }

  private cleanupTemporaryImages(): void {
    if (this.temporaryImages.length > 0) {
      // Send cleanup request to backend (non-blocking)
      const jwtToken = localStorage.getItem('jwt_token');
      if (jwtToken) {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${jwtToken}`
        });
        
        // Use sendBeacon for reliability during page unload
        const cleanupData = { imageUrls: this.temporaryImages };
        const blob = new Blob([JSON.stringify(cleanupData)], { type: 'application/json' });
        
        try {
          navigator.sendBeacon(`${environment.apiBaseUrl}/api/uploads/cleanup-temp-images`, blob);
        } catch (error) {
          // Fallback to regular HTTP request
          this.http.post(`${environment.apiBaseUrl}/api/uploads/cleanup-temp-images`, cleanupData, { headers })
            .toPromise()
            .catch(() => {
              // Ignore errors during cleanup
            });
        }
      }
      
      // Clear the tracked images
      this.temporaryImages = [];
    }
  }

  // Public method to mark images as permanent (called when submission is successful)
  markImagesAsPermanent(): void {
    const imageUrls = this.getImageUrls();
    
    if (imageUrls.length > 0) {
      const jwtToken = localStorage.getItem('jwt_token');
      if (jwtToken) {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${jwtToken}`
        });
        
        const confirmData = { imageUrls: imageUrls.map(img => img.src) };
        this.http.post(`${environment.apiBaseUrl}/api/uploads/confirm-images`, confirmData, { headers })
          .toPromise()
          .then(() => {
            // Images are now permanent, clear temporary tracking
            this.temporaryImages = [];
          })
          .catch((error) => {
            console.warn('Failed to confirm images as permanent:', error);
          });
      }
    }
  }

  // Get all image URLs currently in the editor
  private getImageUrls(): {src: string, imageId: string}[] {
    const figures = this.editor.nativeElement.querySelectorAll('figure[data-image-id] img');
    const urls: {src: string, imageId: string}[] = [];
    
    figures.forEach((img: any) => {
      const figure = img.closest('figure');
      urls.push({
        src: img.src,
        imageId: figure?.getAttribute('data-image-id') || ''
      });
    });
    
    return urls;
  }
}