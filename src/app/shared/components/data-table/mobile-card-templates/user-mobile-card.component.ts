import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction } from '../data-table.component';

@Component({
  selector: 'app-user-mobile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-start space-x-4">
      <!-- Avatar -->
      <div class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
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
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900 truncate">{{ user.name || user.username }}</h3>
            <p class="text-sm text-gray-500 truncate">{{ user.email }}</p>
          </div>
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            [class]="user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'reviewer' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'">
            {{ user.role | titlecase }}
          </span>
        </div>
        
        <div class="mt-2 flex items-center justify-between">
          <div class="text-xs text-gray-500">
            Joined {{ user.createdAt | date:'MMM d, y' }} • {{ user.acceptedSubmissions || 0 }} published
          </div>
        </div>
        
        <div class="mt-3 flex items-center space-x-3">
          <!-- Role Selector -->
          <select
            [value]="user.role"
            (change)="onRoleChange.emit({user, event: $event})"
            [disabled]="user.role === 'admin' || changingRoles?.has(user._id)"
            class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50">
            <option value="user">User</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin" disabled>Admin</option>
          </select>
          
          <!-- Action Buttons -->
          @for (action of actions; track action.label) {
            <button
              (click)="action.handler(user)"
              class="text-xs font-medium text-blue-700 hover:text-blue-900">
              {{ action.label }}
            </button>
          }
        </div>
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