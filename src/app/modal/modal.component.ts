import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalButton {
  label: string;
  action: () => void;
  class?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements OnInit, OnDestroy{

  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() buttons: ModalButton[] = [];
  @Input() showCloseButton: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  
  @Output() closed = new EventEmitter<void>();

  ngOnInit() {
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  ngOnChanges() {
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
    document.body.style.overflow = '';
  }

  onBackdropClick(event: Event) {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }

  getButtonClass(button: ModalButton, index: number): string {
    const baseClass = "inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    if (button.class) {
      return `${baseClass} ${button.class}`;
    }
    
    // Default styling for primary (last) and secondary buttons
    if (index === this.buttons.length - 1) {
      return `${baseClass} ml-3 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent`;
    } else {
      return `${baseClass} mr-3 bg-white text-gray-900 hover:bg-gray-50 focus:ring-blue-500 border-gray-300`;
    }
  }
}




