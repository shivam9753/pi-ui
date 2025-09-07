import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCasePipe } from '@angular/common';

export interface UserAction {
  label: string;
  color: 'primary' | 'warning' | 'success' | 'danger' | 'secondary';
  handler: (user: any) => void;
  condition?: (user: any) => boolean;
}

@Component({
  selector: 'app-user-mobile-card',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  template: `
    <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div class="flex items-start space-x-4">
        <!-- Avatar -->
        <div class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          @if (user.profileImage) {
            <img
              [src]="user.profileImage"
              [alt]="user.username || user.name"
              class="w-12 h-12 rounded-full object-cover" />
          } @else {
            <span class="text-white font-medium">
              {{ getUserInitial() }}
            </span>
          }
        </div>
        
        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-gray-900 truncate">{{ user.name || user.username }}</h3>
              <p class="text-sm text-gray-500 truncate">{{ user.email }}</p>
            </div>
            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              [ngClass]="getRoleBadgeClass()">
              {{ user.role | titlecase }}
            </span>
          </div>
          
          <div class="mb-3 text-xs text-gray-500">
            Joined {{ getFormattedDate() }} • {{ user.acceptedSubmissions || 0 }} published
          </div>
          
          <div class="flex items-center justify-between">
            <!-- Role Selector -->
            @if (showRoleSelector) {
              <select
                [value]="user.role"
                (change)="onRoleChange($event)"
                [disabled]="user.role === 'admin' || isChangingRole"
                class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="user">User</option>
                <option value="writer">Writer</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin" disabled>Admin</option>
              </select>
            }
            
            <!-- Action Buttons -->
            <div class="flex items-center space-x-2 ml-auto">
              @for (action of visibleActions; track action.label) {
                <button
                  (click)="action.handler(user)"
                  [class]="getActionButtonClass(action.color)"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200">
                  {{ action.label }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class UserMobileCardComponent {
  @Input() user: any = {};
  @Input() actions: UserAction[] = [];
  @Input() showRoleSelector: boolean = true;
  @Input() isChangingRole: boolean = false;
  
  @Output() roleChange = new EventEmitter<{user: any, newRole: string}>();

  get visibleActions(): UserAction[] {
    return this.actions.filter(action => !action.condition || action.condition(this.user));
  }

  getUserInitial(): string {
    const name = this.user.name || this.user.username || '';
    return name.charAt(0).toUpperCase();
  }

  getFormattedDate(): string {
    if (!this.user.createdAt) return '';
    return new Date(this.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getRoleBadgeClass(): string {
    const role = this.user.role;
    const baseClasses = 'inline-flex items-center';
    
    const roleColors: { [key: string]: string } = {
      'admin': 'bg-red-100 text-red-800 border border-red-200',
      'reviewer': 'bg-blue-100 text-blue-800 border border-blue-200',
      'writer': 'bg-purple-100 text-purple-800 border border-purple-200',
      'user': 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    
    return `${baseClasses} ${roleColors[role] || roleColors['user']}`;
  }

  getActionButtonClass(color: string): string {
    const baseClasses = 'font-medium transition-colors duration-200';
    
    const colorClasses: { [key: string]: string } = {
      'primary': 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200',
      'warning': 'text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200',
      'success': 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200',
      'danger': 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200',
      'secondary': 'text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200'
    };
    
    return `${baseClasses} ${colorClasses[color] || colorClasses['secondary']}`;
  }

  onRoleChange(event: any): void {
    const newRole = event.target.value;
    this.roleChange.emit({ user: this.user, newRole });
  }
}