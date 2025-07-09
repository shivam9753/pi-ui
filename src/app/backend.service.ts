import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UpdateStatusPayload {
  status: 'accepted' | 'rejected';
  reviewerId?: string;
  reviewNotes?: string;
}

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  profileImage?: string;
  role: 'user' | 'reviewer' | 'admin';
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  stats: {
    totalPublished: number;
    totalViews: number;
    totalLikes: number;
    followers: number;
    following: number;
  };
  preferences: {
    showEmail: boolean;
    showStats: boolean;
    allowMessages: boolean;
  };
  createdAt: string;
  updatedAt: string;
  // Additional computed fields from aggregation
  totalSubmissions?: number;
  acceptedSubmissions?: number;
  pendingSubmissions?: number;
  rejectedSubmissions?: number;
}

export interface PublishedWork {
  _id: string;
  title: string;
  submissionType: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  excerpt: string;
  readingTime: number;
  tags: string[];
  imageUrl?: string;
  content?: string;
}


@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private API_URL = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  // Get all submissions with optional filtering
  getSubmissions(type?: string, status?: string): Observable<any> {
    let url = `${this.API_URL}/submissions`;
    const params = [];

    if (type) params.push(`type=${type}`);
    if (status) params.push(`status=${status}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<any>(url);
  }

  getPendingSubmissions(params?: any): Observable<any> {
    // This should call SUBMISSION route, not review route
    return this.http.get(`${this.API_URL}/submissions?status=pending_review&${params}`);
  }

  getApprovedSubmissions(params?: any): Observable<any> {
    return this.http.get(`${this.API_URL}/submissions?status=accepted&${params}`);
  }
  // Get published content (accepted submissions)
  getPublishedContent(type?: string): Observable<any> {
    let url = `${this.API_URL}/submissions/published`;
    if (type) {
      url += `?type=${type}`;
    }
    return this.http.get<any>(url);
  }

  // Get featured content
  getFeaturedContent(type?: string): Observable<any> {
    let url = `${this.API_URL}/featured`;
    if (type) {
      url += `?type=${type}`;
    }
    return this.http.get<any>(url);
  }

  // Get submission with contents
  getSubmissionWithContents(id: string): Observable<any> {
    return this.http.get(`${this.API_URL}/submissions/${id}/contents`);
  }

  // Submit new submission
  submitNewSubmission(submission: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/submissions`, submission);
  }

  uploadSubmissionImage(submissionId: string, imageFile: File): Observable<any> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${user.id}`
    });
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.http.post(`${this.API_URL}/submissions/${submissionId}/upload-image`, formData, { headers });
  }

  getPublishedContentById(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/submissions/published/${id}`);
  }

  // Get all content
  getContent(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/content`);
  }



  // Method 3: If you need to generate a simple token from user data
  private getAuthHeaders(): HttpHeaders {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.id) {
      throw new Error('User not authenticated');
    }

    // For now, just use user ID - replace with proper JWT later
    const token = user.id;

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  approveSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    const headers = this.getAuthHeaders();
    return this.http.post(
      `${this.API_URL}/reviews/${submissionId}/approve`,
      reviewData,
      { headers }
    );
  }

  // Alternative: If you want to explicitly pass user info in the request body
  approveSubmissionWithUserInfo(submissionId: string, reviewData: { reviewNotes: string }) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = this.getAuthHeaders();

    const requestBody = {
      ...reviewData,
      reviewerId: user._id,
      reviewerName: user.username
    };

    return this.http.post(
      `${this.API_URL}/reviews/${submissionId}/approve`,
      requestBody,
      { headers }
    );
  }

  // Reject submission
  rejectSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    const headers = this.getAuthHeaders();
    return this.http.post(
      `${this.API_URL}/reviews/${submissionId}/reject`,
      reviewData,
      { headers }
    );
  }

  // Get review details for a submission
  getReviewDetails(submissionId: string) {
    const headers = this.getAuthHeaders();
    return this.http.get(
      `${this.API_URL}/reviews/${submissionId}`,
      { headers }
    );
  }

  updateSubmission(submissionId: string, updateData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/submissions/${submissionId}`, updateData, { headers });
  }
  
  // 2. Update submission status (for publishing)
  updateSubmissionStatus(submissionId: string, status: string): Observable<any> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${user.id}`,
      'Content-Type': 'application/json'
    });
    
    console.log('🔄 Updating status to:', status);
    console.log('📤 URL:', `${this.API_URL}/submissions/${submissionId}/status`);
    console.log('🔑 Auth header:', headers.get('Authorization'));
    
    return this.http.patch(
      `${this.API_URL}/submissions/${submissionId}/status`, 
      { status }, 
      { headers }
    );
  }

  getUsers(options: { limit?: number; skip?: number; role?: string } = {}): Observable<{
    users: UserProfile[];
    pagination: {
      total: number;
      limit: number;
      skip: number;
      hasMore: boolean;
    };
  }> {
    let params = new HttpParams();
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.role) params = params.set('role', options.role);

    return this.http.get<any>(`${this.API_URL}/users`, { params });
  }

  // Get user by ID
  getUserById(id: string): Observable<UserProfile> {
    return this.http.get<any>(`${this.API_URL}/users/${id}`);
  }

  // Get user profile with enhanced stats
  getUserProfile(id: string): Observable<UserProfile> {
    return this.http.get<any>(`${this.API_URL}/users/${id}/profile`);
  }

  // Get user's published works
  getUserPublishedWorks(userId: string, options: {
    limit?: number;
    skip?: number;
    type?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Observable<{
    works: PublishedWork[];
    pagination: any;
  }> {
    let params = new HttpParams();
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.type) params = params.set('type', options.type);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);

    return this.http.get<any>(`${this.API_URL}/users/${userId}/published-works`, { params });
  }

  // Create new user
  createUser(userData: {
    email: string;
    username: string;
    password: string;
    role?: string;
    bio?: string;
  }): Observable<{ message: string; user: UserProfile }> {
    return this.http.post<any>(`${this.API_URL}/users`, userData);
  }

  // Update user profile
  updateUserProfile(userId: string, updateData: {
    username?: string;
    bio?: string;
    profileImage?: string;
    socialLinks?: {
      website?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
    preferences?: {
      showEmail?: boolean;
      showStats?: boolean;
      allowMessages?: boolean;
    };
  }): Observable<{ message: string; user: UserProfile }> {
    return this.http.put<any>(`${this.API_URL}/users/${userId}`, updateData);
  }

  // Update user stats
  updateUserStats(userId: string, stats: {
    totalPublished?: number;
    totalViews?: number;
    totalLikes?: number;
    followers?: number;
    following?: number;
  }): Observable<{ message: string }> {
    return this.http.patch<any>(`${this.API_URL}/users/${userId}/stats`, stats);
  }

  // Search users
  searchUsers(query: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Observable<{ users: UserProfile[] }> {
    let params = new HttpParams().set('q', query);
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);

    return this.http.get<any>(`${this.API_URL}/users/search`, { params });
  }

  // Follow/Unfollow user
  toggleFollowUser(targetUserId: string, action: 'follow' | 'unfollow'): Observable<{
    message: string;
    isFollowing: boolean;
  }> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const followData = {
      followerId: user.id || user._id,
      action: action
    };

    return this.http.patch<any>(`${this.API_URL}/users/${targetUserId}/follow`, followData);
  }

  // Delete user (admin only)
  deleteUser(userId: string): Observable<{ message: string }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.API_URL}/users/${userId}`, { headers });
  }

  // Check if user is following another user
  checkFollowStatus(targetUserId: string): Observable<{ isFollowing: boolean }> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // This would need to be implemented on the backend
    // For now, returning a mock response
    return new Observable(observer => {
      observer.next({ isFollowing: false });
      observer.complete();
    });
  }

  // Get current user profile (from localStorage or API)
  getCurrentUserProfile(): UserProfile | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Check if current user is viewing their own profile
  isOwnProfile(profileUserId: string): boolean {
    const currentUser = this.getCurrentUserProfile();
    return currentUser ? currentUser._id === profileUserId : false;
  }

  getPublishedContentByType(type: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Observable<{
    submissions: any[];
    total: number;
    pagination: any;
  }> {
    let params = new HttpParams();
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);
  
    return this.http.get<any>(`${this.API_URL}/submissions/published?type=${type}`, { params });
  }

}