import { Component, Input, Output, EventEmitter, forwardRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
      @if (tags.length > 0) {
        <div class="flex flex-wrap gap-2 mb-3">
          @for (tag of tags; track trackByTag(i, tag); let i = $index) {
            <span
              class="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full"
              >
              {{ displayTagName(tag) }}
              <button
                type="button"
                (click)="removeTag(i)"
                class="flex items-center justify-center w-4 h-4 ml-1 text-primary hover:text-amber-800 hover:bg-amber-100 rounded-full transition-colors"
                [attr.aria-label]="'Remove tag ' + tag"
                >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </span>
          }
        </div>
      }
    
      <!-- Input Field -->
      <div class="relative">
        <input
          #tagInput
          type="text"
          [(ngModel)]="currentInput"
          (keydown)="onKeyDown($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          (input)="onInput($event)"
          [placeholder]="placeholder"
          class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-neutral-300 transition-colors duration-200"
          [class.border-red-400]="hasError"
          />
    
        <!-- Helper Text -->
        @if (!hasError) {
          <p class="text-xs text-gray-500 mt-2">
            {{ helperText }}
          </p>
        }
    
        <!-- Error Text -->
        @if (hasError) {
          <p class="text-xs text-red-500 mt-2">
            {{ errorText }}
          </p>
        }
      </div>

      <!-- Suggestions Dropdown -->
      @if (suggestions.length > 0) {
        <div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          <button
            *ngIf="suggestions.length === 0"
            type="button"
            class="flex items-center justify-center w-full px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-t-lg hover:bg-gray-200"
            disabled
            >
            No suggestions found
          </button>
    
          @for (suggestion of suggestions; track trackBySuggestion(i, suggestion); let i = $index) {
            <button
              type="button"
              (mousedown)="onSuggestionMouseDown()"
              (click)="selectSuggestion(suggestion)"
              class="flex items-center justify-between w-full px-4 py-2 text-sm text-left rounded-lg transition-colors"
              [ngClass]="{
                'bg-primary/10 text-primary': isSuggestionSelected(i),
                'hover:bg-gray-100': !isSuggestionSelected(i)
              }"
              >
              {{ displayTagName(suggestion) }}
              <!-- Add an icon or indicator for selection if needed -->
            </button>
          }
        </div>
      }
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
export class TagInputComponent implements ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Add tags and press Enter...';
  @Input() helperText = 'Press Enter to add a tag, or separate multiple tags with commas';
  @Input() maxTags = 10;
  @Input() allowDuplicates = false;
  @Input() minTagLength = 2;
  @Input() maxTagLength = 50;

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() tagAdded = new EventEmitter<string>();
  @Output() tagRemoved = new EventEmitter<string>();

  // Allow tag objects as well as strings
  tags: any[] = [];
  currentInput = '';
  hasError = false;
  errorText = '';

  // Autocomplete suggestions
  suggestions: any[] = [];
  private readonly search$ = new Subject<string>();
  private readonly searchMinChars = 1;
  private readonly searchDebounceMs = 250;
  private readonly searchSub: any;

  private onChange = (value: string[]) => {};
  private onTouched = () => {};
  private ignoreBlurAdd = false;

  constructor(private readonly http: HttpClient) {
    // wire up search stream
    this.searchSub = this.search$
      .pipe(
        debounceTime(this.searchDebounceMs),
        distinctUntilChanged(),
        switchMap(q => this.fetchTags(q))
      )
      .subscribe(results => {
        this.suggestions = results || [];
      });
  }

  trackByTag(index: number, tag: any): string {
    if (!tag) return String(index);
    if (typeof tag === 'string') return tag;
    if (tag._id) return String(tag._id);
    if (tag.name) return String(tag.name);
    if (tag.slug) return String(tag.slug);
    return `tag_${index}`;
  }

  trackBySuggestion(index: number, suggestion: any): string {
    if (!suggestion) return String(index);
    if (typeof suggestion === 'string') return suggestion;
    if (suggestion._id) return String(suggestion._id);
    if (suggestion.name) return String(suggestion.name);
    if (suggestion.slug) return String(suggestion.slug);
    return `sugg_${index}`;
  }

  isSuggestionSelected(index: number): boolean {
    return false; // keyboard navigation not implemented yet
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    } else if (event.key === 'Backspace' && this.currentInput === '' && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
    }
  }
  
  // Triggered by native input event to reliably read updated value
  onInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value?.trim();
    if (q && q.length >= this.searchMinChars) {
      this.search$.next(q);
    } else {
      this.suggestions = [];
    }
  }

  // Helper used in template to display tag name when tag may be an object
  displayTagName(tag: any): string {
    if (!tag) return '';
    if (typeof tag === 'string') return tag;
    if (typeof tag === 'object') {
      if (tag.name && String(tag.name).trim()) return String(tag.name).trim();
      if (tag.tag && String(tag.tag).trim()) return String(tag.tag).trim();
      if (tag.slug && String(tag.slug).trim()) return String(tag.slug).trim().replaceAll('-', ' ');
      if (tag._id) return String(tag._id);
    }
    return '';
  }

  onBlur(): void {
    if (this.ignoreBlurAdd) {
      // user is interacting with suggestions — don't convert typed input to tag
      this.onTouched();
      // let click handler run and then clear suggestions shortly after
      setTimeout(() => (this.suggestions = []), 200);
      this.ignoreBlurAdd = false;
      return;
    }

    if (this.currentInput.trim()) {
      this.addTag();
    }
    this.onTouched();
    // hide suggestions on blur
    setTimeout(() => (this.suggestions = []), 150);
  }

  // Called on mousedown before blur so we can avoid auto-adding the typed input
  onSuggestionMouseDown(): void {
    this.ignoreBlurAdd = true;
  }

  // Called when the input receives focus
  public onFocus(): void {
    this.clearError();
  }
  
  addTag(): void {
    const input = this.currentInput.trim();
    
    if (!input) return;

    // Handle comma-separated tags
    const newTags = input.split(',').map(tag => tag.trim()).filter(Boolean);
    
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
    // clear suggestions after adding
    this.suggestions = [];
  }

  // Select a suggestion from dropdown
  selectSuggestion(tag: any): void {
    // push full object when available; otherwise push string name
    const toAdd = typeof tag === 'string' ? tag : (tag.name || tag.tag || tag.slug || tag._id || JSON.stringify(tag));
    if (!this.allowDuplicates && this.tags.includes(toAdd)) return;
    this.tags.push(toAdd);
    this.tagAdded.emit(toAdd);
    this.updateValue();
    this.currentInput = '';
    this.suggestions = [];
  }

  // Remove tag at index
  removeTag(index: number): void {
    if (index >= 0 && index < this.tags.length) {
      const removedTag = this.tags[index];
      this.tags.splice(index, 1);
      const removedValue = typeof removedTag === 'string' ? removedTag : (removedTag.name || removedTag.tag || removedTag.slug || removedTag._id || '');
      this.tagRemoved.emit(removedValue);
      this.updateValue();
      this.clearError();
    }
  }

  private fetchTags(q: string) {
    if (!q || String(q).trim().length < this.searchMinChars) return of([]);
    const encoded = encodeURIComponent(q);
    // Use backend search endpoint which returns { success, tags: [...] }
    console.debug('[TagInput] fetchTags', q);
    return this.http.get<any>(`${environment.apiBaseUrl}/api/tags/search?q=${encoded}&limit=10`).pipe(
      switchMap((resp: any) => {
        if (!resp) return of([]);
        // backend returns tags array under resp.tags (each has tag, slug, tagId)
        const list = Array.isArray(resp.tags) ? resp.tags : [];
        return of(list);
      }),
      catchError(err => {
        console.warn('[TagInput] fetchTags error', err);
        return of([]);
      })
    );
  }

  private validateTag(tag: string): boolean {
    if (!tag) return false;
    const len = tag.length;
    if (len < this.minTagLength || len > this.maxTagLength) {
      this.showError(`Tag must be between ${this.minTagLength} and ${this.maxTagLength} characters`);
      return false;
    }
    this.clearError();
    return true;
  }

  private showError(message: string): void {
    this.hasError = true;
    this.errorText = message;
  }

  private clearError(): void {
    this.hasError = false;
    this.errorText = '';
  }

  private updateValue(): void {
    const normalized = this.tags.map(t => (typeof t === 'string' ? t : (t.name || t.tag || t.slug || t._id || ''))).filter(Boolean);
    this.onChange(normalized);
    this.tagsChange.emit(normalized);
  }

  // ControlValueAccessor methods
  writeValue(value: any[]): void {
    if (value) {
      this.tags = Array.isArray(value) ? value : [value];
    } else {
      this.tags = [];
    }
    this.currentInput = '';
    this.clearError();
    // this.updateValue();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implement if needed
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
  }
}