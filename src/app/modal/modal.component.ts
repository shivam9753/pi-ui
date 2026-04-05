import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ModalButton {
  label: string;
  action: () => void;
  class?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalDialogData {
  title?: string;
  message?: string;
  buttons?: ModalButton[];
  showCloseButton?: boolean;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="modal-dialog-container">
      <!-- Header -->
      @if (data.title || data.showCloseButton) {
        <div mat-dialog-title class="flex items-center justify-between gap-4 pb-2">
          @if (data.title) {
            <span class="text-base font-semibold text-themed leading-snug">{{ data.title }}</span>
          }
          @if (data.showCloseButton !== false) {
            <button mat-icon-button class="!w-8 !h-8 !min-w-0 -mr-1 shrink-0 text-themed-tertiary" (click)="dialogRef.close()">
              <mat-icon class="!text-lg">close</mat-icon>
            </button>
          }
        </div>
      }

      <!-- Body -->
      @if (data.message) {
        <mat-dialog-content>
          <p class="text-sm text-themed-secondary whitespace-pre-line leading-relaxed">{{ data.message }}</p>
        </mat-dialog-content>
      }

      <!-- Actions -->
      @if (data.buttons && data.buttons.length) {
        <mat-dialog-actions align="end">
          @for (button of data.buttons; track button.label) {
            <button
              [attr.mat-flat-button]="button.variant === 'primary' || button.variant === 'destructive' ? '' : null"
              [attr.mat-tonal-button]="button.variant === 'secondary' || !button.variant ? '' : null"
              [attr.mat-stroked-button]="button.variant === 'tertiary' ? '' : null"
              [class.mat-warn]="button.variant === 'destructive'"
              [disabled]="button.disabled ?? false"
              [type]="button.type || 'button'"
              (click)="button.action()">
              {{ button.label }}
            </button>
          }
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [`
    .modal-dialog-container { min-width: 320px; }
    mat-dialog-content { padding-top: 4px !important; padding-bottom: 8px !important; }
    mat-dialog-actions { padding-top: 8px !important; gap: 8px; }
  `]
})
export class ModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalDialogData
  ) {}
}