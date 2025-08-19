
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
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    const newValue = value || '';
    
    // Only update DOM if value actually changed and editor is not focused
    if (newValue !== this.content) {
      this.content = newValue;
      if (this.editor && document.activeElement !== this.editor.nativeElement) {
        this.editor.nativeElement.innerHTML = this.content;
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
      // Insert a line break instead of creating new div/p elements
      document.execCommand('insertHTML', false, '<br><br>');
      return;
    }
    
    // Handle Shift+Enter for single line break
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
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
    
    // Trigger content change
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private removeColorStyles(html: string): string {
    // Remove color-related CSS properties from style attributes
    return html
      .replace(/style\s*=\s*"[^"]*color[^"]*"/gi, '') // Remove style attributes containing 'color'
      .replace(/style\s*=\s*'[^']*color[^']*'/gi, '') // Handle single quotes
      .replace(/color\s*:\s*[^;]+;?/gi, '') // Remove color: declarations
      .replace(/background-color\s*:\s*[^;]+;?/gi, '') // Remove background-color: declarations
      .replace(/background\s*:\s*[^;]+;?/gi, '') // Remove background: declarations
      .replace(/style\s*=\s*["'][^"']*["']/gi, (match) => {
        // Clean up empty or whitespace-only style attributes
        const styleContent = match.replace(/style\s*=\s*["']([^"']*)["']/i, '$1').trim();
        return styleContent ? match : '';
      });
  }

  private sanitizeClipboardHTML(html: string): string {
    // Create a temporary div to parse HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Allow only basic formatting tags
    const allowedTags = ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'span'];
    const allowedAttributes = ['class']; // Remove 'style' to strip color and other inline styles
    
    this.cleanElement(tempDiv, allowedTags, allowedAttributes);
    
    return tempDiv.innerHTML;
  }
  
  private cleanElement(element: Element, allowedTags: string[], allowedAttributes: string[]): void {
    // Convert to array to avoid live NodeList issues
    const children = Array.from(element.children);
    
    children.forEach(child => {
      const tagName = child.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // Replace disallowed tags with their content
        const span = document.createElement('span');
        span.innerHTML = child.innerHTML;
        child.parentNode?.replaceChild(span, child);
        this.cleanElement(span, allowedTags, allowedAttributes);
      } else {
        // Clean attributes
        const attributes = Array.from(child.attributes);
        attributes.forEach(attr => {
          if (!allowedAttributes.includes(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
        });
        
        // Remove any style attributes that might contain color information
        child.removeAttribute('style');
        
        // Recursively clean child elements
        this.cleanElement(child, allowedTags, allowedAttributes);
      }
    });
    
    // Also clean text nodes to remove any color spans that might have been converted
    const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(textNode => {
      if (textNode.parentElement?.style) {
        textNode.parentElement.removeAttribute('style');
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

  private async uploadToS3(file: File): Promise<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('submissionType', 'article'); // Default to article
    formData.append('alt', '');
    formData.append('caption', '');

    return this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.UPLOADS.IMAGE}`, formData, { headers }).toPromise();
  }

  private insertS3ImageIntoEditor(imageData: any): void {
    const imageId = `img-${Date.now()}`;
    
    const imageHtml = `<div class="image-container my-4" contenteditable="false">
      <img id="${imageId}" src="${imageData.url}" alt="${imageData.alt || 'Uploaded image'}" class="max-w-full h-auto rounded-lg shadow-sm" />
    </div>`;
    
    // Insert at current cursor position or at the end
    if (document.getSelection()?.rangeCount) {
      const range = document.getSelection()!.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = imageHtml;
      range.insertNode(div.firstChild!);
    } else {
      this.editor.nativeElement.innerHTML += imageHtml;
    }
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  private insertImageIntoEditor(compressedImage: CompressedImage): void {
    const imageId = `img-${Date.now()}`;
    const imageHtml = `<div class="image-container my-4" contenteditable="false">
      <img id="${imageId}" src="${compressedImage.dataUrl}" alt="Uploaded image" class="max-w-full h-auto rounded-lg shadow-sm" />
      <div class="image-info text-xs text-gray-500 mt-1">
        Size: ${ImageCompressionUtil.formatFileSize(compressedImage.compressedSize)} 
        (${compressedImage.compressionRatio}% compressed)
      </div>
    </div>`;
    
    // Insert at current cursor position or at the end
    if (document.getSelection()?.rangeCount) {
      const range = document.getSelection()!.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = imageHtml;
      range.insertNode(div.firstChild!);
    } else {
      this.editor.nativeElement.innerHTML += imageHtml;
    }
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
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
}