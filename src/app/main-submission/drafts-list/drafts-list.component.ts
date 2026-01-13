import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CommonUtils, StringUtils } from '../../shared/utils';
import { ButtonComponent } from '../../ui-components/button/button.component';
import { CardComponent } from '../../ui-components/card/card.component';
import { ThemingService } from '../../services/theming.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';
import { SimpleAlertComponent } from '../../ui-components/simple-alert/simple-alert.component';

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
  imports: [CommonModule, EmptyStateComponent, ButtonComponent, CardComponent, SimpleAlertComponent],
  templateUrl: './drafts-list.component.html',
  styleUrls: ['./drafts-list.component.css']
})
export class DraftsListComponent {
  constructor(private htmlSanitizer: HtmlSanitizerService, public themingService: ThemingService) {}
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

  /**
   * Return a sanitized, truncated excerpt for a draft's preview.
   * Uses HtmlSanitizerService to strip HTML and entities before truncation.
   */
  getSanitizedExcerpt(draft: Draft, maxLength: number = 150): string {
    const source = (draft.contents && draft.contents.length > 0) ? draft.contents[0].body : (draft.description || '');
    // First run the cleaner to convert entities and remove easy tags,
    // then defensively strip any remaining literal tags (handles escaped HTML cases),
    // finally truncate the plain text.
    const cleanedOnce = this.htmlSanitizer.cleanHtml(source);
    const noTags = cleanedOnce.replace(/<[^>]*>/g, '');
    // Truncate without re-running cleanHtml (already plain text)
    if (!noTags) return '';
    if (noTags.length <= maxLength) return noTags;
    return noTags.substring(0, maxLength).trim() + '...';
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
