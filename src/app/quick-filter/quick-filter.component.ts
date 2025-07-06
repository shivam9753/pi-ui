import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface QuickFilterOption {
  id: string;
  label: string;
  value: any;
}

@Component({
  selector: 'app-quick-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-filter.component.html',
  styleUrl: './quick-filter.component.css'
})
export class QuickFilterComponent {
  @Input() options: QuickFilterOption[] = [];
  @Input() selectedOption: QuickFilterOption | null = null;
  @Input() showDropdown: boolean = false;
  @Input() dropdownOptions: QuickFilterOption[] = [];
  @Input() dropdownLabel: string = 'Select';
  @Input() selectedDropdownOption: QuickFilterOption | null = null;
  
  @Output() optionSelected = new EventEmitter<QuickFilterOption>();
  @Output() dropdownOptionSelected = new EventEmitter<QuickFilterOption>();
  
  isDropdownOpen = false;

  selectOption(option: QuickFilterOption) {
    this.selectedOption = option;
    this.optionSelected.emit(option);
  }

  selectDropdownOption(option: QuickFilterOption) {
    this.selectedDropdownOption = option;
    this.isDropdownOpen = false;
    this.dropdownOptionSelected.emit(option);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getButtonClass(option: QuickFilterOption): string {
    const baseClass = 'px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200';
    if (this.selectedOption?.id === option.id) {
      return `${baseClass} bg-blue-600 text-white`;
    }
    return `${baseClass} text-gray-700 hover:bg-gray-100`;
  }
}