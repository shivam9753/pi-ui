// admin-user-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { UserListItem, User } from '../../../models';
import { compressImageToAVIF } from '../../../shared/utils/image-compression.util';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { 
  DataTableComponent, 
  TableColumn, 
  TableAction, 
  PaginationConfig,
  USER_TABLE_COLUMNS,
  createUserActions,
  USER_BADGE_CONFIG
} from '../../../shared/components';


interface Message {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-user-management',
  imports: [
    DatePipe, 
    TitleCasePipe, 
    CommonModule, 
    FormsModule, 
    AdminPageHeaderComponent,
    DataTableComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  // Table configuration
  columns: TableColumn[] = USER_TABLE_COLUMNS;
  actions: TableAction[] = [];
  badgeConfig = USER_BADGE_CONFIG;
  selectedUsers: UserListItem[] = [];
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0
  };
  users: UserListItem[] = [];
  totalUsers = 0;
  userStats = { users: 0, reviewers: 0, admins: 0, total: 0 };
  
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
  
  // Edit user modal
  showEditModal = false;
  editingUser: UserListItem | null = null;
  editUserForm = {
    name: '',
    email: '',
    bio: '',
    role: ''
  };
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadingImage = false;
  
  // Debouncing
  private searchTimeout: any;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupTableActions();
    this.loadUsers();
  }

  setupTableActions() {
    this.actions = createUserActions(
      (user) => this.openEditModal(user),
      (user) => this.viewUserProfile(user)
    );
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
          
          // Update pagination config
          this.updatePaginationConfig();
          
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
          this.showMessage('error', error.message || 'Failed to load users. Please try again.');
          this.users = [];
          this.loading = false;
        }
      });
    }
  }


  changeUserRole(user: UserListItem, event: any) {
    const newRole = event.target.value as 'user' | 'curator' | 'reviewer' | 'admin';
    
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

  viewUserProfile(user: UserListItem) {
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
  trackByUserId(index: number, user: UserListItem): string {
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

  // Edit user methods
  openEditModal(user: UserListItem) {
    this.editingUser = { ...user };
    this.editUserForm = {
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      role: user.role || ''
    };
    this.selectedFile = null;
    this.previewUrl = null;
    this.showEditModal = true;
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingUser = null;
    this.selectedFile = null;
    this.previewUrl = null;
    
    // Restore body scrolling when modal is closed
    document.body.style.overflow = '';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showMessage('error', 'Please select an image file');
        return;
      }
      
      // Validate file size (5MB max for original)
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('error', 'Original image size must be less than 5MB');
        return;
      }
      
      try {
        // Compress to AVIF format
        this.showMessage('success', 'Compressing image to AVIF format...');
        const compressed = await compressImageToAVIF(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85
        });
        
        this.selectedFile = compressed.file;
        this.previewUrl = compressed.dataUrl;
        
        // Show compression info
        const originalSize = (file.size / 1024).toFixed(1);
        const compressedSize = (compressed.file.size / 1024).toFixed(1);
        this.showMessage(
          'success',
          `Image compressed: ${originalSize}KB → ${compressedSize}KB (${compressed.compressionRatio}% reduction)`
        );
      } catch (error) {
        this.showMessage('error', 'Failed to compress image. Using original.');
        
        // Fallback to original file
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  async saveUserChanges() {
    if (!this.editingUser) return;
    
    this.loading = true;
    
    try {
      // Update user profile
      const updateResponse = await this.userService.updateUser(this.editingUser._id, {
        name: this.editUserForm.name,
        email: this.editUserForm.email,
        bio: this.editUserForm.bio
      }).toPromise();
      
      // Update role if changed
      if (this.editUserForm.role !== this.editingUser.role) {
        await this.userService.updateUserRole(this.editingUser._id, this.editUserForm.role as any).toPromise();
      }
      
      // Upload image if selected
      if (this.selectedFile) {
        await this.uploadUserImage(this.editingUser._id);
      }
      
      this.showMessage('success', 'User updated successfully');
      this.closeEditModal();
      this.loadUsers();
    } catch (error: any) {
      this.showMessage('error', error.error?.message || 'Failed to update user');
    } finally {
      this.loading = false;
    }
  }

  async uploadUserImage(userId: string) {
    if (!this.selectedFile) return;
    
    this.uploadingImage = true;
    
    try {
      const formData = new FormData();
      formData.append('profileImage', this.selectedFile);
      
      await this.userService.uploadUserProfileImage(userId, formData).toPromise();
    } catch (error) {
      this.showMessage('error', 'Profile updated but image upload failed');
    } finally {
      this.uploadingImage = false;
    }
  }

  updatePaginationConfig() {
    this.paginationConfig = {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      pageSize: this.pageSize,
      totalItems: this.totalUsers
    };
  }

  onTablePageChange(page: number) {
    this.currentPage = page;
    this.loadUsers();
  }

  onTableSort(event: {column: string, direction: 'asc' | 'desc'}) {
    this.sortBy = event.column;
    this.loadUsers();
  }

  onSelectionChange(selectedUsers: UserListItem[]) {
    this.selectedUsers = selectedUsers;
  }

  onRoleChange(data: {user: UserListItem, event: any}) {
    this.changeUserRole(data.user, data.event);
  }

  ngOnDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Restore body scrolling if component is destroyed while modal is open
    document.body.style.overflow = '';
  }

  // New methods for mobile-optimized filters
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.onSearch();
  }

  onRoleFilterChangeFromFilter(value: string): void {
    this.selectedRole = value;
    this.onRoleFilterChange();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedRole = '';
    this.loadUsers();
  }

}