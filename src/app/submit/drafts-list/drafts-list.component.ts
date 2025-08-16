
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CommonUtils, StringUtils } from '../../shared/utils';

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
    return CommonUtils.truncateText(content, 100);
  }

  formatDate(date: Date): string {
    return CommonUtils.formatDateWithRelativeTime(date);
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
