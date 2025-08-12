
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

export interface Draft {
  id: string;
  title: string;
  submissionType: string;
  contents: any[];
  description: string;
  lastModified: Date;
  wordCount: number;
}

@Component({
  selector: 'app-drafts-list',
  imports: [EmptyStateComponent],
  templateUrl: './drafts-list.component.html',
  styleUrl: './drafts-list.component.css'
})

export class DraftsListComponent {
  @Input() drafts: Draft[] = [];
  @Input() isInline: boolean = false;
  @Output() loadDraft = new EventEmitter<Draft>();
  @Output() deleteDraft = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() createNew = new EventEmitter<void>();

  draftToDelete: Draft | null = null;

  trackByDraftId(index: number, draft: Draft): string {
    return draft.id;
  }

  getTypeDisplayName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'poem': 'Poem',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay',
      'prose': 'Prose'
    };
    return typeMap[type] || type;
  }

  getContentPreview(content: string): string {
    if (!content) return 'No content';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffInHours = (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  confirmDelete(draft: Draft): void {
    this.draftToDelete = draft;
  }

  cancelDelete(): void {
    this.draftToDelete = null;
  }

  executeDelete(): void {
    if (this.draftToDelete) {
      this.deleteDraft.emit(this.draftToDelete.id);
      this.draftToDelete = null;
    }
  }

  onCreateNewDraft(): void {
    this.createNew.emit();
    this.close.emit();
  }

  closeOverlay(event: any): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
