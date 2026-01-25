import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction } from '../data-table.component';

@Component({
  selector: 'app-user-mobile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-4">
      <!-- Avatar -->
      <div class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
        @if (user.profileImage) {
          <img
            [src]="user.profileImage"
            [alt]="user.username"
            class="w-12 h-12 rounded-full object-cover" />
        } @else {
          <span class="text-white font-medium">
            {{ (user.name || user.username).charAt(0).toUpperCase() }}
          </span>
        }
      </div>

      <!-- User Info -->
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-gray-900 truncate">{{ user.name || user.username }}</h3>
        <p class="text-sm text-gray-500 truncate">{{ user.email }}</p>
      </div>

      <!-- Primary Action (Edit) -->
      <div class="flex-shrink-0 ml-2">
        @if (actions && actions.length > 0) {
          <button
            (click)="actions[0].handler(user)"
            class="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-white hover:opacity-95">
            {{ actions[0].label }}
          </button>
        }
      </div>
    </div>
  `
})
export class UserMobileCardComponent {
  @Input() user: any;
  @Input() actions: TableAction[] = [];
  @Input() changingRoles?: Set<string>;
  @Input() onRoleChange: any;
}