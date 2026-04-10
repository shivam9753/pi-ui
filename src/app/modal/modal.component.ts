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
            <button class="modal-close-btn ml-auto shrink-0" (click)="dialogRef.close()">
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
            @if (button.variant === 'primary' || button.variant === 'destructive') {
              <button mat-flat-button
                [class.mat-warn]="button.variant === 'destructive'"
                [disabled]="button.disabled ?? false"
                [type]="button.type || 'button'"
                (click)="button.action()">
                {{ button.label }}
              </button>
            } @else if (button.variant === 'tertiary') {
              <button mat-stroked-button
                [disabled]="button.disabled ?? false"
                [type]="button.type || 'button'"
                (click)="button.action()">
                {{ button.label }}
              </button>
            } @else {
              <button mat-button
                [disabled]="button.disabled ?? false"
                [type]="button.type || 'button'"
                (click)="button.action()">
                {{ button.label }}
              </button>
            }
          }
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [`
    .modal-dialog-container { min-width: 320px; }
    mat-dialog-content { padding-top: 4px !important; padding-bottom: 8px !important; }
    mat-dialog-actions { padding-top: 8px !important; gap: 8px; }
    .modal-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      margin: 0;
      line-height: 1;
      color: var(--text-tertiary, #6b7280);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-close-btn:hover {
      color: var(--text-primary, #111827);
    }
  `]
})
export class ModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalDialogData
  ) {}
}