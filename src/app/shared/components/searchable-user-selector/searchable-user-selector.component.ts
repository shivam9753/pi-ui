import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface User {
  _id: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-searchable-user-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableUserSelectorComponent),
      multi: true
    }
  ],
  template: `
    <div class="relative">
      <!-- Input field that shows selected user or allows search -->
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (focus)="onInputFocus()"
        (blur)="onInputBlur()"
        (input)="onSearchChange()"
        [placeholder]="placeholder"
        [class]="inputClass"
        [disabled]="disabled"
        autocomplete="off"
      />
      
      <!-- Clear button -->
      @if (selectedUser && !disabled) {
        <button
          type="button"
          (mousedown)="clearSelection($event)"
          class="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      }
      
      <!-- Dropdown arrow -->
      <button
        type="button"
        (mousedown)="toggleDropdown($event)"
        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
        [disabled]="disabled">
        <svg class="w-4 h-4 transition-transform" [class.rotate-180]="isOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Dropdown list -->
      @if (isOpen && !disabled) {
        <div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          <!-- Loading state -->
          @if (loading) {
            <div class="px-4 py-3 text-sm text-gray-500">Loading users...</div>
          }
          
          <!-- No results -->
          @if (!loading && filteredUsers.length === 0) {
            <div class="px-4 py-3 text-sm text-gray-500">
              @if (searchTerm) {
                No users found matching "{{ searchTerm }}"
              } @else {
                No users available
              }
            </div>
          }
          
          <!-- User list -->
          @if (!loading && filteredUsers.length > 0) {
            @for (user of filteredUsers; track user._id) {
              <button
                type="button"
                (click)="selectUser(user)"
                class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                [class.bg-primary-light]="selectedUser?._id === user._id">
                <div class="font-medium text-gray-900">{{ user.name }}</div>
                <div class="text-sm text-gray-500">{{ user.email }}</div>
              </button>
            }
          }
          
          <!-- Show more indicator -->
          @if (!loading && filteredUsers.length >= maxDisplayCount && allUsers.length > maxDisplayCount) {
            <div class="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
              Showing {{ filteredUsers.length }} of {{ allUsers.length }} users. Type to search for more.
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class SearchableUserSelectorComponent implements OnInit, ControlValueAccessor {
  @Input() users: User[] = [];
  @Input() placeholder = 'Select a user...';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() inputClass = 'w-full px-4 py-2 pr-8 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-neutral-300';
  @Input() maxDisplayCount = 50; // Show max 50 users initially

  @Output() userSelected = new EventEmitter<User>();
  @Output() userCleared = new EventEmitter<void>();
  @Output() searchQuery = new EventEmitter<string>();

  selectedUser: User | null = null;
  searchTerm = '';
  isOpen = false;
  filteredUsers: User[] = [];
  allUsers: User[] = [];

  private onChange = (value: string | null) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.allUsers = [...this.users];
    this.updateFilteredUsers();
  }

  ngOnChanges() {
    this.allUsers = [...this.users];
    this.updateFilteredUsers();
  }

  onInputFocus() {
    this.isOpen = true;
    if (this.selectedUser) {
      this.searchTerm = '';
      this.updateFilteredUsers();
    }
  }

  onInputBlur() {
    // Delay closing to allow click events on dropdown items
    setTimeout(() => {
      this.isOpen = false;
      // If user is selected, show their name; otherwise clear the search term
      if (this.selectedUser) {
        this.searchTerm = `${this.selectedUser.name} (${this.selectedUser.email})`;
      } else if (!this.searchTerm.trim()) {
        this.searchTerm = '';
      }
    }, 150);
    this.onTouched();
  }

  onSearchChange() {
    console.log('🔤 onSearchChange called with searchTerm:', this.searchTerm);
    
    this.updateFilteredUsers();
    if (!this.isOpen) {
      this.isOpen = true;
    }
    
    // Emit search query to parent component for API search
    console.log('📡 About to emit searchQuery with:', this.searchTerm);
    this.searchQuery.emit(this.searchTerm);
    console.log('✅ searchQuery emitted');
    
    // Clear selection if user is typing
    if (this.selectedUser && this.searchTerm !== `${this.selectedUser.name} (${this.selectedUser.email})`) {
      this.selectedUser = null;
      this.onChange(null);
      this.userCleared.emit();
    }
  }

  toggleDropdown(event: Event) {
    event.preventDefault();
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen && this.selectedUser) {
        this.searchTerm = '';
        this.updateFilteredUsers();
      }
    }
  }

  selectUser(user: User) {
    this.selectedUser = user;
    this.searchTerm = `${user.name} (${user.email})`;
    this.isOpen = false;
    this.onChange(user._id);
    this.userSelected.emit(user);
  }

  clearSelection(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedUser = null;
    this.searchTerm = '';
    this.isOpen = false;
    this.onChange(null);
    this.userCleared.emit();
    this.updateFilteredUsers();
  }

  private updateFilteredUsers() {
    const searchLower = this.searchTerm.toLowerCase();
    
    if (!searchLower) {
      // Show first N users when no search term
      this.filteredUsers = this.allUsers.slice(0, this.maxDisplayCount);
    } else {
      // Filter users based on name or email
      this.filteredUsers = this.allUsers
        .filter(user => 
          user.name.toLowerCase().includes(searchLower) || 
          user.email.toLowerCase().includes(searchLower)
        )
        .slice(0, this.maxDisplayCount); // Limit results
    }
  }

  // ControlValueAccessor implementation
  writeValue(userId: string | null): void {
    if (userId) {
      const user = this.allUsers.find(u => u._id === userId);
      if (user) {
        this.selectedUser = user;
        this.searchTerm = `${user.name} (${user.email})`;
      }
    } else {
      this.selectedUser = null;
      this.searchTerm = '';
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}