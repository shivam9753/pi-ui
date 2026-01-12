import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface AdminPageStat {
  label: string;
  value: string | number;
  color: string;
}

export interface NavItem {
  label: string;
  route?: string;
  children?: NavItem[];
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

  // New: optional nav items that can contain children (dropdown)
  @Input() navItems: NavItem[] = [];

  @Output() onRefresh = new EventEmitter<void>();

  // track which dropdown (by index) is open, null when none
  openDropdownIndex: number | null = null;

  constructor(private router: Router) {}

  toggleDropdown(index: number) {
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  closeDropdowns() {
    this.openDropdownIndex = null;
  }

  navigateTo(route?: string) {
    if (!route) return;
    this.closeDropdowns();
    this.router.navigate([route]);
  }
}