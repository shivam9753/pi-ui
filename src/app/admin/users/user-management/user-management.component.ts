// admin-user-management.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, UserStats } from '../../../services/user.service';

interface Message {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-user-management',
  imports: [DatePipe, TitleCasePipe, CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  totalUsers = 0;
  userStats: UserStats = { users: 0, reviewers: 0, admins: 0, total: 0 };
  
  // Filters and search
  selectedRole = '';
  sortBy = 'createdAt';
  searchQuery = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // State management
  loading = false;
  changingRoles = new Set<string>();
  message: Message | null = null;
  
  // Debouncing
  private searchTimeout: any;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  min(a: number, b: number): number {
  return Math.min(a, b);
}

  loadUsers() {
    this.loading = true;
    
    if (this.searchQuery.trim()) {
      // Use search endpoint
      this.userService.searchUsers({
        q: this.searchQuery.trim(),
        limit: this.pageSize,
        skip: (this.currentPage - 1) * this.pageSize,
        sortBy: this.sortBy,
        order: 'desc'
      }).subscribe({
        next: (response) => {
          this.users = response.users || [];
          this.totalUsers = this.users.length; // Search doesn't return total count
          this.totalPages = 1;
          // Don't update stats during search
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching users:', error);
          this.showMessage('error', error.message || 'Failed to search users. Please try again.');
          this.users = [];
          this.loading = false;
        }
      });
    } else {
      // Use main users endpoint with stats
      this.userService.getAllUsers({
        limit: this.pageSize,
        skip: (this.currentPage - 1) * this.pageSize,
        role: this.selectedRole || undefined,
        sortBy: this.sortBy,
        order: 'desc',
        includeStats: true
      }).subscribe({
        next: (response) => {
          this.users = response.users || [];
          this.totalUsers = response.pagination?.total || 0;
          this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
          
          // Update stats if included in response
          if (response.stats) {
            this.userStats = {
              users: response.stats.users || 0,
              reviewers: response.stats.reviewers || 0,
              admins: response.stats.admins || 0,
              total: response.stats.total || 0
            };
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.showMessage('error', error.message || 'Failed to load users. Please try again.');
          this.users = [];
          this.loading = false;
        }
      });
    }
  }


  changeUserRole(user: User, event: any) {
    const newRole = event.target.value as 'user' | 'reviewer' | 'admin';
    
    if (newRole === user.role) {
      return; // No change needed
    }

    if (user.role === 'admin') {
      this.showMessage('error', 'Admin roles cannot be changed.');
      event.target.value = user.role; // Reset the select
      return;
    }

    if (newRole === 'admin') {
      this.showMessage('error', 'Cannot promote users to admin role.');
      event.target.value = user.role; // Reset the select
      return;
    }

    this.changingRoles.add(user._id);

    this.userService.updateUserRole(user._id, newRole).subscribe({
      next: (response) => {
        // Update the user locally
        user.role = newRole;
        
        this.showMessage('success', `User role updated to ${newRole} successfully.`);
        
        // Reload users and stats
        this.loadUsers();
        this.changingRoles.delete(user._id);
      },
      error: (error) => {
        console.error('Error changing user role:', error);
        this.showMessage('error', error.message || 'Failed to update user role. Please try again.');
        
        // Reset the select to original value
        event.target.value = user.role;
        this.changingRoles.delete(user._id);
      }
    });
  }

  onRoleFilterChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  onSearch() {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadUsers();
    }, 500);
  }

  viewUserProfile(user: User) {
    this.router.navigate(['/profile', user._id]);
  }

  // Pagination methods
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  // Utility methods
  trackByUserId(index: number, user: User): string {
    return user._id;
  }

  showMessage(type: 'success' | 'error', text: string) {
    this.message = { type, text };
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.clearMessage();
      }, 5000);
    }
  }

  clearMessage() {
    this.message = null;
  }

  // Helper for template
  Math() {
    return Math;
  }

  ngOnDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}