// admin-user-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { UserListItem, User } from '../../../models';
import { compressImageForUpload } from '../../../shared/utils/image-compression.util';
import { UPLOAD_CONFIG } from '../../../shared/constants/api.constants';
import { AdminPageHeaderComponent, AdminPageStat } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { 
  DataTableComponent, 
  TableColumn, 
  TableAction, 
  PaginationConfig,
  USER_TABLE_COLUMNS,
  createUserActions,
  USER_BADGE_CONFIG,
  ConsistentUserMobileCardComponent,
  UserAction
} from '../../../shared/components';
import { SimpleSubmissionFilterComponent, SimpleFilterOptions } from '../../../shared/components/simple-submission-filter/simple-submission-filter.component';


interface Message {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule, 
    FormsModule, 
    AdminPageHeaderComponent,
    DataTableComponent,
    SimpleSubmissionFilterComponent,
    ConsistentUserMobileCardComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  // Table configuration
  columns: TableColumn[] = USER_TABLE_COLUMNS;
  actions: TableAction[] = [];
  consistentUserActions: UserAction[] = [];
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
  userStats = { users: 0, writers: 0, reviewers: 0, admins: 0, total: 0 };
  
  // Stats for AdminPageHeader
  stats: AdminPageStat[] = [];
  
  // Filter properties
  currentFilters: SimpleFilterOptions = {};
  
  // Legacy filters for backward compatibility
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
    
    // Setup consistent actions for mobile user cards
    this.consistentUserActions = [
      {
        label: 'Edit',
        color: 'primary',
        handler: (user) => this.openEditModal(user)
      },
      {
        label: 'View Profile',
        color: 'secondary',
        handler: (user) => this.viewUserProfile(user)
      }
    ];
  }
  
  // Handle role change from consistent user card
  onUserRoleChange(event: {user: any, newRole: string}) {
    // Create a fake event object that matches the expected format
    const fakeEvent = { target: { value: event.newRole } };
    this.changeUserRole(event.user, fakeEvent);
  }

  min(a: number, b: number): number {
  return Math.min(a, b);
}

  loadUsers() {
    this.loading = true;
    
    // Use currentFilters if available, fallback to legacy filters
    const searchQuery = this.currentFilters.search || this.searchQuery;
    const roleFilter = this.currentFilters.status || this.selectedRole;
    const sortBy = this.currentFilters.sortBy || this.sortBy;
    const order = this.currentFilters.order || 'desc';
    
    if (searchQuery && searchQuery.trim()) {
      // Use search endpoint
      this.userService.searchUsers({
        q: searchQuery.trim(),
        limit: this.pageSize,
        skip: (this.currentPage - 1) * this.pageSize,
        sortBy: sortBy,
        order: order
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
        role: roleFilter || undefined,
        sortBy: sortBy,
        order: order,
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
              writers: (response.stats as any).writers || 0,
              reviewers: response.stats.reviewers || 0,
              admins: response.stats.admins || 0,
              total: response.stats.total || 0
            };
            this.calculateUserStats();
          } else {
            // If no stats from server, calculate basic stats from loaded users
            this.calculateBasicUserStats();
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
    const newRole = event.target.value as 'user' | 'writer' | 'reviewer' | 'admin';
    
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
      
      // Validate file size (2MB max for original)
      if (file.size > UPLOAD_CONFIG.MAX_IMAGE_SIZE) {
        this.showMessage('error', 'Original image size must be less than 2MB');
        return;
      }
      
      try {
        // Compress to WebP format with 250KB target
        this.showMessage('success', 'Compressing image to WebP format...');
        const compressed = await compressImageForUpload(file, {
          targetSizeKB: 250,
          maxWidth: UPLOAD_CONFIG.MAX_DIMENSIONS.width,
          maxHeight: UPLOAD_CONFIG.MAX_DIMENSIONS.height
        });
        
        this.selectedFile = compressed.file;
        this.previewUrl = compressed.dataUrl;
        
        // Show compression info
        const originalSize = (file.size / 1024).toFixed(1);
        const compressedSize = (compressed.file.size / 1024).toFixed(1);
        this.showMessage(
          'success',
          `WebP compressed: ${originalSize}KB → ${compressedSize}KB (${compressed.compressionRatio}% reduction)`
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
      let updatedUser: any = null;
      
      // Update user profile
      const updateResponse = await this.userService.updateUser(this.editingUser._id, {
        name: this.editUserForm.name,
        email: this.editUserForm.email,
        bio: this.editUserForm.bio
      }).toPromise();
      
      updatedUser = updateResponse?.user || this.editingUser;
      
      // Update role if changed
      if (this.editUserForm.role !== this.editingUser.role) {
        const roleResponse = await this.userService.updateUserRole(this.editingUser._id, this.editUserForm.role as any).toPromise();
        updatedUser = roleResponse?.user || updatedUser;
      }
      
      // Upload image if selected
      if (this.selectedFile) {
        const imageResponse = await this.uploadUserImage(this.editingUser._id);
        if (imageResponse?.user) {
          updatedUser = imageResponse.user;
        }
      }
      
      // Update the local user in the array immediately
      if (updatedUser) {
        const userIndex = this.users.findIndex(u => u._id === this.editingUser!._id);
        if (userIndex !== -1) {
          this.users[userIndex] = {
            ...this.users[userIndex],
            name: updatedUser.name,
            email: updatedUser.email,
            bio: updatedUser.bio,
            role: updatedUser.role,
            profileImage: updatedUser.profileImage
          };
        }
      }
      
      this.showMessage('success', 'User updated successfully');
      this.closeEditModal();
      
      // Optional: Also refresh from server to ensure consistency
      this.loadUsers();
    } catch (error: any) {
      this.showMessage('error', error.error?.message || 'Failed to update user');
    } finally {
      this.loading = false;
    }
  }

  async uploadUserImage(userId: string) {
    if (!this.selectedFile) return null;
    
    this.uploadingImage = true;
    
    try {
      const formData = new FormData();
      formData.append('profileImage', this.selectedFile);
      
      const response = await this.userService.uploadUserProfileImage(userId, formData).toPromise();
      return response;
    } catch (error) {
      this.showMessage('error', 'Profile updated but image upload failed');
      throw error;
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

  // Filter methods
  onFilterChange(filters: SimpleFilterOptions) {
    this.currentFilters = filters;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadUsers();
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

  // Calculate stats for AdminPageHeader from backend stats
  calculateUserStats() {
    const totalUsers = this.userStats.total || 0;
    const regularUsers = this.userStats.users || 0;
    const writers = this.userStats.writers || 0;
    const reviewers = this.userStats.reviewers || 0;
    const admins = this.userStats.admins || 0;

    this.stats = [
      {
        label: 'Total Users',
        value: totalUsers.toLocaleString(),
        color: '#3b82f6'
      },
      {
        label: 'Regular Users',
        value: regularUsers.toLocaleString(),
        color: '#10b981'
      },
      {
        label: 'Writers',
        value: writers.toLocaleString(),
        color: '#f59e0b'
      },
      {
        label: 'Reviewers',
        value: reviewers.toLocaleString(),
        color: '#ef4444'
      },
      {
        label: 'Admins',
        value: admins.toLocaleString(),
        color: '#8b5cf6'
      }
    ];
  }

  // Calculate basic stats from currently loaded users when backend stats are not available
  calculateBasicUserStats() {
    const totalUsers = this.users.length;
    const roleCounts = this.users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as any);

    this.stats = [
      {
        label: 'Total Users',
        value: totalUsers.toLocaleString(),
        color: '#3b82f6'
      },
      {
        label: 'Regular Users',
        value: (roleCounts.user || 0).toLocaleString(),
        color: '#10b981'
      },
      {
        label: 'Writers',
        value: (roleCounts.writer || 0).toLocaleString(),
        color: '#f59e0b'
      },
      {
        label: 'Reviewers',
        value: (roleCounts.reviewer || 0).toLocaleString(),
        color: '#ef4444'
      },
      {
        label: 'Admins',
        value: (roleCounts.admin || 0).toLocaleString(),
        color: '#8b5cf6'
      }
    ];
  }

}