
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { TagInputComponent } from '../../utilities/tag-input/tag-input.component';
import { CompressedImage } from '../../shared/utils/image-compression.util';

@Component({
  selector: 'app-content-editor',
  imports: [ReactiveFormsModule, FormsModule, RichTextEditorComponent, TagInputComponent],
  templateUrl: './content-editor.component.html',
  styleUrl: './content-editor.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ContentEditorComponent {
  @Input() selectedType: string = '';
  @Input() contents: any[] = [];
  @Input() formArray!: FormArray;
  
  @Output() contentsChanged = new EventEmitter<any[]>();
  @Output() prevStep = new EventEmitter<void>();
  @Output() nextStep = new EventEmitter<void>();
  @Output() imageUploaded = new EventEmitter<{contentIndex: number, image: CompressedImage}>();

  uploadedImages: Map<number, CompressedImage[]> = new Map();

  constructor(private fb: FormBuilder) {}

  // Note: updateContentField removed - now using reactive forms directly with [formControl]

  addContent(): void {
    if (this.selectedType === 'poem' && this.contents.length < 5) {
      // Create new content group
      const newContentGroup = this.createContentGroup();
      this.formArray.push(newContentGroup);
      this.emitContentsChanged();
    }
  }
  
  createContentGroup(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      tags: [''],
      footnotes: ['']
    });
  }

  removeContent(index: number): void {
    if (this.contents.length > 1) {
      this.formArray.removeAt(index);
      this.emitContentsChanged();
    }
  }

  emitContentsChanged(): void {
    const contentsValue = this.formArray.value;
    this.contentsChanged.emit(contentsValue);
  }

  isContentValid(): boolean {
    return this.formArray.controls.every(content => 
      content.get('title')?.valid && content.get('body')?.valid
    );
  }

  getTotalWordCount(): number {
    return this.formArray.controls.reduce((total, content) => {
      const body = content.get('body')?.value || '';
      return total + this.countWords(body);
    }, 0);
  }

  getWordCount(index: number): number {
    const content = this.formArray.at(index);
    const body = content.get('body')?.value || '';
    return this.countWords(body);
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  getContentTypeDisplayName(): string {
    const typeMap: { [key: string]: string } = {
      'poem': 'Poems',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    return typeMap[this.selectedType] || 'Content';
  }

  getSingleContentTypeDisplayName(): string {
    const typeMap: { [key: string]: string } = {
      'poem': 'Poem',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    return typeMap[this.selectedType] || 'Content';
  }

  getContentItemDisplayName(index: number): string {
    if (this.selectedType === 'poem') {
      return `Poem ${index}`;
    }
    return this.getSingleContentTypeDisplayName();
  }

  getContentPlaceholder(): string {
    const placeholders: { [key: string]: string } = {
      'poem': `Write your poem here...

Remember:
• Each line should express your thoughts
• Feel free to experiment with form and structure
• Let your creativity flow`,
      'article': `Write your article here...

Structure your article with:
• Clear introduction
• Well-organized body paragraphs
• Strong conclusion`,
      'cinema_essay': `Write your cinema essay here...

Consider including:
• Film analysis and critique
• Cinematographic elements
• Cultural context and impact`,
      'prose': `Write your prose here...

This could be:
• A short story
• Creative non-fiction
• Narrative piece`
    };
    return placeholders[this.selectedType] || 'Write your content here...';
  }

  goBack(): void {
    this.prevStep.emit();
  }

  continue(): void {
    this.nextStep.emit();
  }

  shouldAllowImages(): boolean {
    return true; // Allow images for all submission types
  }

  onImageUpload(image: CompressedImage, contentIndex: number): void {
    if (!this.uploadedImages.has(contentIndex)) {
      this.uploadedImages.set(contentIndex, []);
    }
    
    this.uploadedImages.get(contentIndex)!.push(image);
    this.imageUploaded.emit({ contentIndex, image });
  }

  getContentImages(contentIndex: number): CompressedImage[] {
    return this.uploadedImages.get(contentIndex) || [];
  }

  getAllUploadedImages(): {contentIndex: number, images: CompressedImage[]}[] {
    const result: {contentIndex: number, images: CompressedImage[]}[] = [];
    this.uploadedImages.forEach((images, contentIndex) => {
      if (images.length > 0) {
        result.push({ contentIndex, images });
      }
    });
    return result;
  }
}
