import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-overlay.component.html',
  styles: [
    `:host { display: block; }`
  ]
})
export class SearchOverlayComponent {
  @Input() placeholder: string = 'Search';
  @Input() showClose: boolean = false;
  @Output() search = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  onSubmit(value: string, e?: Event) {
    if (e) e.preventDefault();
    const q = (value || '').trim();
    if (q) this.search.emit(q);
  }

  onClose() {
    this.close.emit();
  }
}
