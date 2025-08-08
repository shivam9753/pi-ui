import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild, AfterViewInit, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ImageCompressionUtil, CompressedImage } from '../../shared/utils/image-compression.util';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-rich-text-editor',
  imports: [CommonModule],
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
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  toggleFormat(command: string): void {
    document.execCommand(command, false);
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  setAlignment(alignment: string): void {
    this.currentAlignment = alignment;
    
    // Apply alignment using CSS class
    const editor = this.editor.nativeElement;
    editor.className = editor.className.replace(/text-(left|center|right|justify)/g, '');
    editor.classList.add(`text-${alignment}`);
    
    // Also apply justify alignment command for better compatibility
    if (alignment === 'justify') {
      document.execCommand('justifyFull', false);
    } else {
      document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
    }
    
    this.onContentChange({ target: this.editor.nativeElement } as any);
  }

  clearFormatting(): void {
    // Remove all formatting
    document.execCommand('removeFormat', false);
    this.currentAlignment = 'left';
    
    // Reset editor classes
    const editor = this.editor.nativeElement;
    editor.className = editor.className.replace(/text-(left|center|right|justify)/g, '');
    editor.classList.add('text-left');
    
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
      console.error('Image upload failed:', error);
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

    return this.http.post(`${environment.apiBaseUrl}/images/upload`, formData, { headers }).toPromise();
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