import { Injectable, ComponentRef, ViewContainerRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ToastNotificationComponent } from '../shared/components/toast-notification/toast-notification.component';

export interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  details?: string;
  duration?: number;
  autoClose?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastContainer?: ViewContainerRef;
  private toastRefs: ComponentRef<ToastNotificationComponent>[] = [];

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  setContainer(container: ViewContainerRef) {
    this.toastContainer = container;
  }

  show(config: ToastConfig) {
    if (!this.toastContainer) {
      // Fallback: create toast programmatically
      this.showProgrammaticToast(config);
      return;
    }

    const componentRef = this.toastContainer.createComponent(ToastNotificationComponent);
    
    // Set inputs
    componentRef.instance.message = config.message;
    componentRef.instance.type = config.type || 'info';
    componentRef.instance.details = config.details || '';
    componentRef.instance.duration = config.duration || 5000;
    componentRef.instance.autoClose = config.autoClose !== false;
    componentRef.instance.isVisible = true;

    // Handle close event
    componentRef.instance.closed.subscribe(() => {
      this.removeToast(componentRef);
    });

    this.toastRefs.push(componentRef);

    // Auto-remove after duration + animation time
    setTimeout(() => {
      if (this.toastRefs.includes(componentRef)) {
        this.removeToast(componentRef);
      }
    }, (config.duration || 5000) + 500);
  }

  showSuccess(message: string, details?: string) {
    this.show({ message, type: 'success', details });
  }

  showError(message: string, details?: string) {
    this.show({ message, type: 'error', details, duration: 8000 });
  }

  showWarning(message: string, details?: string) {
    this.show({ message, type: 'warning', details });
  }

  showInfo(message: string, details?: string) {
    this.show({ message, type: 'info', details });
  }

  private showProgrammaticToast(config: ToastConfig) {
    // Create component programmatically
    const componentRef = createComponent(ToastNotificationComponent, {
      environmentInjector: this.injector
    });

    // Set inputs
    componentRef.instance.message = config.message;
    componentRef.instance.type = config.type || 'info';
    componentRef.instance.details = config.details || '';
    componentRef.instance.duration = config.duration || 5000;
    componentRef.instance.autoClose = config.autoClose !== false;
    componentRef.instance.isVisible = true;

    // Handle close event
    componentRef.instance.closed.subscribe(() => {
      this.removeToast(componentRef);
    });

    // Add to DOM
    document.body.appendChild(componentRef.location.nativeElement);
    this.appRef.attachView(componentRef.hostView);
    
    this.toastRefs.push(componentRef);

    // Auto-remove after duration + animation time
    setTimeout(() => {
      if (this.toastRefs.includes(componentRef)) {
        this.removeToast(componentRef);
      }
    }, (config.duration || 5000) + 500);
  }

  private removeToast(componentRef: ComponentRef<ToastNotificationComponent>) {
    const index = this.toastRefs.indexOf(componentRef);
    if (index > -1) {
      this.toastRefs.splice(index, 1);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }
  }

  clearAll() {
    this.toastRefs.forEach(ref => this.removeToast(ref));
  }
}