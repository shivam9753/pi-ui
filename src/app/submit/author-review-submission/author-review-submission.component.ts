import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-author-review-submission',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './author-review-submission.component.html',
  styleUrl: './author-review-submission.component.css'
})
export class AuthorReviewSubmissionComponent {
  @Input() form!: FormGroup;
  @Input() selectedType: string = '';
  @Input() contents: any[] = [];
  @Input() totalWordCount: number = 0;
  
  @Output() prevStep = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() editContent = new EventEmitter<void>();

  checklist = {
    allConfirmed: false
  };

  getTypeDisplayName(): string {
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
    return this.getTypeDisplayName();
  }

  getWordCount(index: number): number {
    const content = this.contents[index];
    const body = content.get('body')?.value || '';
    return this.countWords(body);
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  getContentPreview(content: string): string {
    if (!content) return '';
    const cleaned = this.cleanContent(content);
    const maxLength = 500;
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
  }

  // Clean content for display (convert div tags to line breaks)
  cleanContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/<div>/g, '')           // Remove opening div tags
      .replace(/<\/div>/g, '\n')       // Convert closing div tags to line breaks
      .replace(/<br\s*\/?>/g, '\n')    // Convert br tags to line breaks
      .replace(/&nbsp;/g, ' ')         // Convert non-breaking spaces
      .replace(/&amp;/g, '&')          // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();                         // Remove leading/trailing whitespace
  }

  isContentTruncated(content: string): boolean {
    if(!content) return false;
    return content.length > 500;
  }

  parseTags(tagString: string): string[] {
    return tagString
      ? tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];
  }

  isReadyToSubmit(): boolean {
    return this.checklist.allConfirmed && this.form.valid;
  }

  goBack(): void {
    this.prevStep.emit();
  }

  saveAsDraft(): void {
    // This would be handled by parent component
    console.log('Save as draft');
  }

  submitWork(): void {
    if (this.isReadyToSubmit()) {
      this.submit.emit();
    }
  }
}
