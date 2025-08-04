// admin-user-management.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';


interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'reviewer' | 'admin';
  profileImage?: string;
  bio?: string;
  createdAt: string;
  stats?: {
    totalPublished: number;
    totalViews: number;
    totalLikes: number;
    followers: number;
    following: number;
  };
}

interface UserStats {
  users: number;
  reviewers: number;
  admins: number;
}

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
  userStats: UserStats = { users: 0, reviewers: 0, admins: 0 };
  
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
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadUserStats();
  }

  min(a: number, b: number): number {
  return Math.min(a, b);
}

  async loadUsers() {
    this.loading = true;
    
    try {
      const params = new URLSearchParams({
        limit: this.pageSize.toString(),
        skip: ((this.currentPage - 1) * this.pageSize).toString()
      });

      if (this.selectedRole) {
        params.append('role', this.selectedRole);
      }

      let url = `${environment.apiBaseUrl}/users`;
      
      // Use search endpoint if there's a search query
      if (this.searchQuery.trim()) {
        url = `${environment.apiBaseUrl}/users/search`;
        params.append('q', this.searchQuery.trim());
      }

      // Get JWT token from localStorage
      const jwtToken = localStorage.getItem('jwt_token');
      const headers: { [key: string]: string } = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};

      const response = await this.http.get<any>(`${url}?${params.toString()}`, { headers }).toPromise() as any;
      
      if (this.searchQuery.trim()) {
        this.users = response.users || [];
        this.totalUsers = this.users.length; // Search doesn't return total count
        this.totalPages = 1;
      } else {
        this.users = response.users || [];
        this.totalUsers = response.pagination?.total || 0;
        this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
      }

    } catch (error) {
      console.error('Error loading users:', error);
      this.showMessage('error', 'Failed to load users. Please try again.');
      this.users = [];
    } finally {
      this.loading = false;
    }
  }

  async loadUserStats() {
    try {
      // Get JWT token from localStorage
      const jwtToken = localStorage.getItem('jwt_token');
      const headers: { [key: string]: string } = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};

      // Use single API call for user stats instead of multiple calls
      const statsResponse = await this.http.get<any>(`${environment.apiBaseUrl}/users/stats`, { headers }).toPromise() as any;
      
      if (statsResponse) {
        this.userStats = {
          users: statsResponse.users || 0,
          reviewers: statsResponse.reviewers || 0,
          admins: statsResponse.admins || 0
        };
        this.totalUsers = statsResponse.total || 0;
      }

    } catch (error) {
      console.error('Error loading user stats:', error);
      // Fallback to old method if stats endpoint doesn't exist
      this.loadUserStatsLegacy();
    }
  }

  // Fallback method using multiple API calls (legacy)
  private async loadUserStatsLegacy() {
    try {
      const jwtToken = localStorage.getItem('jwt_token');
      const headers: { [key: string]: string } = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};

      const [usersResponse, reviewersResponse, adminsResponse] = await Promise.all([
        this.http.get<any>(`${environment.apiBaseUrl}/users?role=user&limit=0`, { headers }).toPromise() as Promise<any>,
        this.http.get<any>(`${environment.apiBaseUrl}/users?role=reviewer&limit=0`, { headers }).toPromise() as Promise<any>,
        this.http.get<any>(`${environment.apiBaseUrl}/users?role=admin&limit=0`, { headers }).toPromise() as Promise<any>
      ]);

      this.userStats = {
        users: usersResponse.pagination?.total || 0,
        reviewers: reviewersResponse.pagination?.total || 0,
        admins: adminsResponse.pagination?.total || 0
      };

    } catch (error) {
      console.error('Error loading user stats (legacy):', error);
    }
  }

  async changeUserRole(user: User, event: any) {
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

    try {
      // Get JWT token from localStorage
      const jwtToken = localStorage.getItem('jwt_token');
      const headers: { [key: string]: string } = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};

      await this.http.patch(`${environment.apiBaseUrl}/users/${user._id}/role`, { role: newRole }, { headers }).toPromise() as Promise<any>;
      
      // Update the user locally
      user.role = newRole;
      
      this.showMessage('success', `User role updated to ${newRole} successfully.`);
      
      // Reload stats
      this.loadUserStats();

    } catch (error) {
      console.error('Error changing user role:', error);
      this.showMessage('error', 'Failed to update user role. Please try again.');
      
      // Reset the select to original value
      event.target.value = user.role;
      
    } finally {
      this.changingRoles.delete(user._id);
    }
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