import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="tag-input-container">
      <!-- Tags Display -->
      <div class="flex flex-wrap gap-2 mb-3" *ngIf="tags.length > 0">
        <span
          *ngFor="let tag of tags; trackBy: trackByTag; let i = index"
          class="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full"
        >
          {{ tag }}
          <button
            type="button"
            (click)="removeTag(i)"
            class="flex items-center justify-center w-4 h-4 ml-1 text-orange-600 hover:text-orange-800 hover:bg-orange-200 rounded-full transition-colors"
            [attr.aria-label]="'Remove tag ' + tag"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </span>
      </div>

      <!-- Input Field -->
      <div class="relative">
        <input
          #tagInput
          type="text"
          [(ngModel)]="currentInput"
          (keydown)="onKeyDown($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          [placeholder]="placeholder"
          class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors duration-200"
          [class.border-red-400]="hasError"
        />
        
        <!-- Helper Text -->
        <p class="text-xs text-gray-500 mt-2" *ngIf="!hasError">
          {{ helperText }}
        </p>
        
        <!-- Error Text -->
        <p class="text-xs text-red-500 mt-2" *ngIf="hasError">
          {{ errorText }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .tag-input-container {
      width: 100%;
    }
    
    input:focus {
      outline: none;
    }
  `]
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Add tags and press Enter...';
  @Input() helperText = 'Press Enter to add a tag, or separate multiple tags with commas';
  @Input() maxTags = 10;
  @Input() allowDuplicates = false;
  @Input() minTagLength = 2;
  @Input() maxTagLength = 50;

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() tagAdded = new EventEmitter<string>();
  @Output() tagRemoved = new EventEmitter<string>();

  tags: string[] = [];
  currentInput = '';
  hasError = false;
  errorText = '';

  private onChange = (value: string[]) => {};
  private onTouched = () => {};

  trackByTag(index: number, tag: string): string {
    return tag;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    } else if (event.key === 'Backspace' && this.currentInput === '' && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
    }
  }

  onBlur(): void {
    if (this.currentInput.trim()) {
      this.addTag();
    }
    this.onTouched();
  }

  onFocus(): void {
    this.clearError();
  }

  addTag(): void {
    const input = this.currentInput.trim();
    
    if (!input) return;

    // Handle comma-separated tags
    const newTags = input.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    for (const tag of newTags) {
      if (!this.validateTag(tag)) continue;
      
      if (!this.allowDuplicates && this.tags.includes(tag)) {
        this.showError(`Tag "${tag}" already exists`);
        continue;
      }

      if (this.tags.length >= this.maxTags) {
        this.showError(`Maximum ${this.maxTags} tags allowed`);
        break;
      }

      this.tags.push(tag);
      this.tagAdded.emit(tag);
    }

    this.currentInput = '';
    this.updateValue();
  }

  removeTag(index: number): void {
    if (index >= 0 && index < this.tags.length) {
      const removedTag = this.tags[index];
      this.tags.splice(index, 1);
      this.tagRemoved.emit(removedTag);
      this.updateValue();
      this.clearError();
    }
  }

  private validateTag(tag: string): boolean {
    if (tag.length < this.minTagLength) {
      this.showError(`Tag must be at least ${this.minTagLength} characters`);
      return false;
    }
    
    if (tag.length > this.maxTagLength) {
      this.showError(`Tag must be less than ${this.maxTagLength} characters`);
      return false;
    }

    // Basic validation - no special characters except hyphens and underscores
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(tag)) {
      this.showError('Tags can only contain letters, numbers, spaces, hyphens, and underscores');
      return false;
    }

    return true;
  }

  private showError(message: string): void {
    this.hasError = true;
    this.errorText = message;
    setTimeout(() => this.clearError(), 3000);
  }

  private clearError(): void {
    this.hasError = false;
    this.errorText = '';
  }

  private updateValue(): void {
    this.onChange(this.tags);
    this.tagsChange.emit(this.tags);
  }

  // ControlValueAccessor implementation
  writeValue(value: string[] | string | null): void {
    if (value === null || value === undefined) {
      this.tags = [];
    } else if (typeof value === 'string') {
      // Handle comma-separated string input
      this.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else if (Array.isArray(value)) {
      this.tags = [...value];
    } else {
      this.tags = [];
    }
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}