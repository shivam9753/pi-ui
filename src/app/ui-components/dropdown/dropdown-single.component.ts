import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownOption } from './dropdown-option';

@Component({
  selector: 'app-dropdown-single',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left" (click)="$event.stopPropagation()">
      <button
        class="inline-flex items-center justify-between px-4 py-2 border rounded-md bg-white hover:bg-gray-50 w-48"
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen"
        [attr.aria-haspopup]="true"
        [disabled]="disabled"
      >
        <span class="truncate">{{ selectedLabel || placeholder }}</span>
        <svg class="w-4 h-4 ml-2 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path d="M6 8l4 4 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      @if (isOpen) {
        <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
          <div class="py-1 max-h-56 overflow-auto">
            @for (opt of options; track opt.value) {
              <button
                class="w-full text-left px-4 py-2 hover:bg-gray-50"
                (click)="select(opt)"
                type="button">
                {{ opt.label }}
              </button>
            }
            @if (options.length === 0) {
              <div class="px-4 py-2 text-sm text-gray-500">No options</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DropdownSingleComponent {
  @Input() options: DropdownOption[] = [];
  @Input() placeholder = 'Select';
  @Input() disabled = false;

  private _value: any = null;
  @Input()
  get value() { return this._value; }
  set value(v: any) {
    this._value = v;
    this.valueChange.emit(this._value);
  }
  @Output() valueChange = new EventEmitter<any>();

  isOpen = false;

  get selectedLabel(): string | null {
    const found = this.options.find(o => o.value === this._value);
    return found ? String(found.label) : null;
  }

  toggle() {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
  }

  select(opt: DropdownOption) {
    this._value = opt.value;
    this.valueChange.emit(this._value);
    this.isOpen = false;
  }

  @HostListener('document:click')
  closeOnOutside() {
    this.isOpen = false;
  }
}
