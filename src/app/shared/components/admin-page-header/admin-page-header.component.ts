import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AdminPageStat {
  label: string;
  value: string | number;
  color: string;
}

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-page-header.component.html'
})
export class AdminPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() stats: AdminPageStat[] = [];
  @Input() loading = false;
  
  @Output() onRefresh = new EventEmitter<void>();
}