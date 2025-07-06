import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-dynamic-table',
  imports: [CommonModule],
  templateUrl: './dynamic-table.component.html',
  styleUrl: './dynamic-table.component.css'
})
export class DynamicTableComponent {
  // Array of objects - data rows
  @Input() data: any[] = [];

  // Optional: specify columns (keys) to show and headers (labels)
  @Input() columns: { key: string; label: string }[] = [];

  // If columns input is empty, use keys from first object
  getDisplayedColumns() {
    if (this.columns.length > 0) {
      return this.columns;
    }
    if (this.data.length > 0) {
      return Object.keys(this.data[0]).map(key => ({ key, label: this.capitalize(key) }));
    }
    return [];
  }

  capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
