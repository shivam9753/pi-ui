import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  User,
  UserProfile,
  UserListItem,
  CreateUserPayload,
  UpdateUserPayload,
  UsersResponse,
  SearchUsersResponse,
  UserProfileResponse,
  UserPublishedWorksResponse,
  UserStats
} from '../models';

// Legacy User interface for backward compatibility
export interface LegacyUser {
  _id: string;
  id: string; // Alias for _id for backward compatibility (always present)
  username: string;
  name: string; // Display name for backward compatibility (always present)
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

// Legacy interfaces - keeping for backward compatibility
export interface LegacyUserStats {
  users: number;
  reviewers: number;
  admins: number;
  total: number;
}

export interface LegacyPaginationInfo {
  limit: number;
  skip: number;
  hasMore: boolean;
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private apiService: ApiService) {}

  /**
   * Get all users with optional stats
   */
  getAllUsers(params: {
    limit?: number;
    skip?: number;
    role?: string;
    sortBy?: string;
    order?: string;
    includeStats?: boolean;
  } = {}): Observable<UsersResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.role) queryParams.role = params.role;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;
    if (params.includeStats) queryParams.includeStats = 'true';

    return this.apiService.get<UsersResponse>('/users', queryParams);
  }

  /**
   * Search users
   */
  searchUsers(params: {
    q: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
  }): Observable<SearchUsersResponse> {
    const queryParams: any = {
      q: params.q
    };
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<SearchUsersResponse>('/users/search', queryParams);
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<{ user: User }> {
    return this.apiService.get<{ user: User }>(`/users/${userId}`);
  }

  /**
   * Get user profile with stats
   */
  getUserProfile(userId: string): Observable<UserProfileResponse> {
    return this.apiService.get<UserProfileResponse>(`/users/${userId}/profile`);
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, userData: Partial<User>): Observable<{ message: string; user: User }> {
    return this.apiService.put<{ message: string; user: User }>(`/users/${userId}`, userData);
  }

  /**
   * Update user (alias for updateUserProfile for admin use)
   */
  updateUser(userId: string, userData: Partial<User>): Observable<{ message: string; user: User }> {
    return this.updateUserProfile(userId, userData);
  }

  /**
   * Upload user profile image (admin only)
   */
  uploadUserProfileImage(userId: string, formData: FormData): Observable<{ success: boolean; message: string; imageUrl: string; user: User }> {
    return this.apiService.post<{ success: boolean; message: string; imageUrl: string; user: User }>(`/admin/users/${userId}/upload-profile-image`, formData);
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(userId: string, role: 'user' | 'reviewer' | 'admin' | 'curator'): Observable<{ message: string; user: User }> {
    return this.apiService.patch<{ message: string; user: User }>(`/users/${userId}/role`, { role });
  }

  /**
   * Change user password
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>(`/users/${userId}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(userId: string): Observable<{ message: string; deletedSubmissions: number; deletedContent: number }> {
    return this.apiService.delete<{ message: string; deletedSubmissions: number; deletedContent: number }>(`/users/${userId}`);
  }

  /**
   * Check if user is first-time submitter
   */
  checkFirstTimeSubmitter(userId: string): Observable<{ isFirstTime: boolean }> {
    return this.apiService.get<{ isFirstTime: boolean }>(`/users/${userId}/submission-history`);
  }

  /**
   * Get user's published works
   */
  getUserPublishedWorks(userId: string, params: {
    limit?: number;
    skip?: number;
    type?: string;
    sortBy?: string;
    order?: string;
  } = {}): Observable<UserPublishedWorksResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.type) queryParams.type = params.type;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<UserPublishedWorksResponse>(`/users/${userId}/published-works`, queryParams);
  }

  /**
   * Approve user bio (admin only)
   */
  approveUserBio(userId: string, approvedBio: string): Observable<{ message: string; user: User }> {
    return this.apiService.post<{ message: string; user: User }>(`/users/${userId}/approve-bio`, { approvedBio });
  }

  /**
   * Approve user profile image (admin only)
   */
  approveUserProfileImage(userId: string): Observable<{ message: string; user: User }> {
    return this.apiService.post<{ message: string; user: User }>(`/users/${userId}/approve-profile-image`, {});
  }
}