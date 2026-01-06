
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guidelines-overlay',
  imports: [CommonModule],
  templateUrl: './guidelines-overlay.component.html',
  styleUrl: './guidelines-overlay.component.css'
})
export class GuidelinesOverlayComponent {
  @Input() isInline: boolean = false;
  @Output() close = new EventEmitter<void>();
  
  activeTab: 'green' | 'red' = 'green';

  closeOverlay(event: any): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  switchTab(tab: 'green' | 'red'): void {
    this.activeTab = tab;
  }
}
