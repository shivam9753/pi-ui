import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ModalButton, ModalComponent } from './modal/modal.component';

export interface ModalConfig {
  title?: string;
  message?: string;
  buttons?: ModalButton[];
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalRef: ComponentRef<ModalComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  open(config: ModalConfig): Promise<void> {
    return new Promise((resolve) => {
      // Create component
      this.modalRef = createComponent(ModalComponent, {
        environmentInjector: this.injector
      });

      // Set inputs
      Object.assign(this.modalRef.instance, config);
      this.modalRef.instance.isOpen = true;

      // Listen for close event
      this.modalRef.instance.closed.subscribe(() => {
        this.close();
        resolve();
      });

      // Attach to DOM
      this.appRef.attachView(this.modalRef.hostView);
      document.body.appendChild(this.modalRef.location.nativeElement);
    });
  }

  close() {
    if (this.modalRef) {
      this.appRef.detachView(this.modalRef.hostView);
      this.modalRef.destroy();
      this.modalRef = null;
    }
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
            action: () => {
              this.close();
              resolve(false);
            }
          },
          {
            label: 'Confirm',
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
