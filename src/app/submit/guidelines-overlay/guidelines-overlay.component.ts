
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-guidelines-overlay',
  imports: [],
  templateUrl: './guidelines-overlay.component.html',
  styleUrl: './guidelines-overlay.component.css'
})
export class GuidelinesOverlayComponent {
  @Input() isInline: boolean = false;
  @Output() close = new EventEmitter<void>();

  closeOverlay(event: any): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
