import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownOption } from './dropdown-option';

@Component({
  selector: 'app-dropdown-multi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left" (click)="$event.stopPropagation()">
      <button
        class="inline-flex items-center justify-between px-4 py-2 border rounded-md bg-white hover:bg-gray-50 w-56"
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen"
        [attr.aria-haspopup]="true"
        [disabled]="disabled"
      >
        <span class="truncate">{{ selectedCountLabel }}</span>
        <svg class="w-4 h-4 ml-2 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path d="M6 8l4 4 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      @if (isOpen) {
        <div class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
          <div class="py-1 max-h-56 overflow-auto">
            @for (opt of options; track opt.value) {
              <label class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="form-checkbox" [checked]="isSelected(opt)" (change)="toggleOption(opt)" />
                <span class="truncate">{{ opt.label }}</span>
              </label>
            }
            @if (options.length === 0) {
              <div class="px-4 py-2 text-sm text-gray-500">No options</div>
            }
          </div>

          <div class="px-3 py-2 border-t bg-gray-50 flex justify-end gap-2">
            <button class="px-3 py-1 text-sm rounded" (click)="clear()">Clear</button>
            <button class="px-3 py-1 text-sm rounded bg-primary text-white" (click)="apply()">Apply</button>
          </div>
        </div>
      }
    </div>
  `
})
export class DropdownMultiComponent {
  @Input() options: DropdownOption[] = [];
  @Input() disabled = false;

  private _selected: any[] = [];
  @Input()
  get selected() { return this._selected.slice(); }
  set selected(v: any[]) {
    this._selected = Array.isArray(v) ? v.slice() : [];
    this.selectedChange.emit(this.selected.slice());
  }
  @Output() selectedChange = new EventEmitter<any[]>();

  isOpen = false;
  working = new Set<any>();

  get selectedCountLabel() {
    if (!this._selected || this._selected.length === 0) return 'Select options';
    return `${this._selected.length} selected`;
  }

  toggle() {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.working = new Set(this._selected);
    }
  }

  isSelected(opt: DropdownOption) {
    return this.working.has(opt.value) || this._selected.includes(opt.value);
  }

  toggleOption(opt: DropdownOption) {
    if (this.working.has(opt.value)) {
      this.working.delete(opt.value);
    } else {
      this.working.add(opt.value);
    }
    // Emit intermediate selection immediately so host can react without clicking Apply
    this.selectedChange.emit(Array.from(this.working));
  }

  apply() {
    this._selected = Array.from(this.working);
    this.selectedChange.emit(this.selected.slice());
    this.isOpen = false;
  }

  clear() {
    this.working.clear();
    this._selected = [];
    this.selectedChange.emit(this.selected.slice());
  }

  @HostListener('document:click')
  closeOnOutside() {
    this.isOpen = false;
  }
}
