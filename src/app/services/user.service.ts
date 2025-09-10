import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../shared/constants/api.constants';
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

    return this.apiService.get<UsersResponse>(API_ENDPOINTS.USERS, queryParams);
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

    return this.apiService.get<SearchUsersResponse>(API_ENDPOINTS.USERS_NESTED.SEARCH, queryParams);
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<{ user: User }> {
    return this.apiService.get<{ user: User }>(API_ENDPOINTS.USERS_NESTED.BY_ID(userId));
  }

  /**
   * Get user profile with stats
   */
  getUserProfile(userId: string): Observable<UserProfileResponse> {
    return this.apiService.get<UserProfileResponse>(API_ENDPOINTS.USERS_NESTED.PROFILE_BY_ID(userId));
  }

  /**
   * Create new user (admin only)
   */
  createUser(userData: {
    name: string;
    username: string;
    email: string;
    bio?: string;
    role?: string;
  }): Observable<{ success: boolean; message: string; user: { id: string; name: string; username: string; email: string; tempPassword: string } }> {
    return this.apiService.post<{ success: boolean; message: string; user: { id: string; name: string; username: string; email: string; tempPassword: string } }>(API_ENDPOINTS.ADMIN.CREATE_USER, userData);
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, userData: Partial<User>): Observable<{ message: string; user: User }> {
    return this.apiService.put<{ message: string; user: User }>(API_ENDPOINTS.USERS_NESTED.UPDATE(userId), userData);
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
    return this.apiService.upload<{ success: boolean; message: string; imageUrl: string; user: User }>(API_ENDPOINTS.ADMIN.UPLOAD_PROFILE_IMAGE(userId), formData);
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(userId: string, role: 'user' | 'reviewer' | 'admin' | 'writer'): Observable<{ message: string; user: User }> {
    return this.apiService.patch<{ message: string; user: User }>(API_ENDPOINTS.USERS_NESTED.UPDATE_ROLE(userId), { role });
  }

  /**
   * Change user password
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>(API_ENDPOINTS.USERS_NESTED.CHANGE_PASSWORD(userId), {
      currentPassword,
      newPassword
    });
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(userId: string): Observable<{ message: string; deletedSubmissions: number; deletedContent: number }> {
    return this.apiService.delete<{ message: string; deletedSubmissions: number; deletedContent: number }>(API_ENDPOINTS.USERS_NESTED.DELETE(userId));
  }

  /**
   * Check if user is first-time submitter
   */
  checkFirstTimeSubmitter(userId: string): Observable<{ isFirstTime: boolean }> {
    return this.apiService.get<{ isFirstTime: boolean }>(API_ENDPOINTS.USERS_NESTED.SUBMISSION_HISTORY(userId));
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

    return this.apiService.get<UserPublishedWorksResponse>(API_ENDPOINTS.USERS_NESTED.PUBLISHED_WORKS(userId), queryParams);
  }

}