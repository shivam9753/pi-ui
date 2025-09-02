
import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild, AfterViewInit, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ImageCompressionUtil, CompressedImage } from '../../shared/utils/image-compression.util';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../shared/constants/api.constants';

@Component({
  selector: 'app-rich-text-editor',
  imports: [],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;
  
  @Input() placeholder: string = 'Write your content here...';
  @Input() allowImages: boolean = false;
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUpload = new EventEmitter<CompressedImage>();

  content: string = '';
  wordCount: number = 0;
  currentAlignment: string = 'left';
  uploadedImages: CompressedImage[] = [];
  isImageUploading: boolean = false;
  uploadStatus: string = 'Preparing upload...';
  
  private onChange = (value: string) => {};
  private onTouched = () => {};
  private http = inject(HttpClient);

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

  private setupDeleteButtonListener(imageId: string): void {
    const deleteBtn = this.editor.nativeElement.querySelector(`[data-image-id="${imageId}"] .delete-btn`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteImage(imageId);
      });
    }
  }

  private addDeleteButtonsToExistingImages(): void {
    // Find all existing images (img tags or figure elements)
    const images = this.editor.nativeElement.querySelectorAll('img');
    
    images.forEach((img: any) => {
      // Skip if already has controls
      if (img.parentElement?.classList.contains('image-figure') && 
          img.parentElement?.querySelector('.image-controls')) {
        return;
      }
      
      // Create unique ID for existing image
      const imageId = `existing-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const imageUrl = img.src;
      
      // If image is not wrapped in figure, wrap it
      if (!img.parentElement?.classList.contains('image-figure')) {
        const figure = document.createElement('figure');
        figure.className = 'image-figure';
        figure.contentEditable = 'false';
        figure.setAttribute('data-image-id', imageId);
        figure.setAttribute('data-image-url', imageUrl);
        
        // Create image container and controls
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        const controls = document.createElement('div');
        controls.className = 'image-controls';
        controls.innerHTML = `<button type="button" class="image-control-btn delete-btn" data-image-id="${imageId}" title="Delete Image">×</button>`;
        
        // Wrap the image
        img.parentNode?.insertBefore(figure, img);
        imageContainer.appendChild(img);
        imageContainer.appendChild(controls);
        figure.appendChild(imageContainer);
        
        // Add existing caption if any (look for nearby text)
        const nextSibling = figure.nextSibling;
        if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent?.trim()) {
          const caption = document.createElement('figcaption');
          caption.contentEditable = 'true';
          caption.textContent = nextSibling.textContent.trim();
          figure.appendChild(caption);
          nextSibling.remove();
        } else {
          // Add empty caption
          const caption = document.createElement('figcaption');
          caption.contentEditable = 'true';
          caption.setAttribute('data-placeholder', 'Add caption...');
          figure.appendChild(caption);
        }
        
        // Set up delete button listener
        this.setupDeleteButtonListener(imageId);
      } else {
        // Image is already in figure, just add controls if missing
        const figure = img.parentElement;
        if (!figure.querySelector('.image-controls')) {
          figure.setAttribute('data-image-id', imageId);
          figure.setAttribute('data-image-url', imageUrl);
          
          // Check if image is directly in figure or in a container
          let imageContainer = figure.querySelector('.image-container');
          if (!imageContainer) {
            imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            const img = figure.querySelector('img');
            if (img) {
              figure.insertBefore(imageContainer, img);
              imageContainer.appendChild(img);
            }
          }
          
          const controls = document.createElement('div');
          controls.className = 'image-controls';
          controls.innerHTML = `<button type="button" class="image-control-btn delete-btn" data-image-id="${imageId}" title="Delete Image">×</button>`;
          
          imageContainer.appendChild(controls);
          this.setupDeleteButtonListener(imageId);
        }
      }
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

    return this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.UPLOADS.IMAGE}`, formData, { headers }).toPromise();
  }

  private insertS3ImageIntoEditor(imageData: any): void {
    // Show caption input modal
    const caption = prompt('Enter image caption (optional):');
    
    this.insertImageWithCaption(imageData.url, imageData.alt || 'Uploaded image', caption || '');
  }

  private insertImageWithCaption(imageUrl: string, alt: string, caption: string): void {
    const imageId = `img-${Date.now()}`;
    
    // Create proper figure element with caption support and delete controls
    const figureHtml = `<figure class="image-figure" contenteditable="false" data-image-id="${imageId}" data-image-url="${imageUrl}">
      <div class="image-container">
        <img src="${imageUrl}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-sm mx-auto block" />
        <div class="image-controls">
          <button type="button" class="image-control-btn delete-btn" data-image-id="${imageId}" title="Delete Image">×</button>
        </div>
      </div>
      ${caption ? `<figcaption contenteditable="true">${caption}</figcaption>` : '<figcaption contenteditable="true" data-placeholder="Add caption..."></figcaption>'}
    </figure>`;
    
    // Insert at current cursor position with NO paragraph separation
    this.insertContentAtCursor(figureHtml);
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
    
    // Set up delete button event listener
    setTimeout(() => {
      this.setupDeleteButtonListener(imageId);
    }, 0);
  }

  private insertContentAtCursor(htmlContent: string): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Create and insert the content without any extra spacing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const contentNode = tempDiv.firstChild!;
      
      range.insertNode(contentNode);
      range.setStartAfter(contentNode);
      
      // Position cursor after the inserted content
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end without extra spacing
      this.editor.nativeElement.innerHTML += htmlContent;
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
}