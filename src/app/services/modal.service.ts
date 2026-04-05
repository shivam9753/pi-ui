import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ModalButton, ModalComponent, ModalDialogData } from '../modal/modal.component';

export interface ModalConfig {
  title?: string;
  message?: string;
  buttons?: ModalButton[];
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP: Record<string, string> = {
  sm: '360px',
  md: '480px',
  lg: '640px',
  xl: '800px'
};

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialogRef: MatDialogRef<ModalComponent> | null = null;

  constructor(private readonly dialog: MatDialog) {}

  open(config: ModalConfig): Promise<void> {
    return new Promise((resolve) => {
      const data: ModalDialogData = {
        title: config.title,
        message: config.message,
        showCloseButton: config.showCloseButton ?? true,
        buttons: config.buttons
      };

      this.dialogRef = this.dialog.open(ModalComponent, {
        data,
        width: SIZE_MAP[config.size ?? 'md'],
        maxWidth: '95vw',
        disableClose: !(config.closeOnBackdrop ?? true),
        panelClass: 'app-modal-panel'
      });

      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
        resolve();
      });
    });
  }

  close() {
    this.dialogRef?.close();
    this.dialogRef = null;
  }

  // Convenience methods
  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.open({
        title,
        message,
        buttons: [
          {
            label: 'Cancel',
            variant: 'tertiary',
            action: () => {
              this.close();
              resolve(false);
            }
          },
          {
            label: 'Confirm',
            variant: 'primary',
            action: () => {
              this.close();
              resolve(true);
            }
          }
        ]
      });
    });
  }

  alert(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      this.open({
        title,
        message,
        buttons: [
          {
            label: 'OK',
            variant: 'primary',
            action: () => {
              this.close();
              resolve();
            }
          }
        ]
      });
    });
  }
}
