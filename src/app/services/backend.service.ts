import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
  private readonly API_URL = environment.apiBaseUrl;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(
    private http: HttpClient
  ) {}

  private handleApiCall<T>(url: string, method: string = 'GET'): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => {
      return source.pipe(
        timeout(this.REQUEST_TIMEOUT),
        retry(1), // Retry once on failure
        catchError((error: HttpErrorResponse) => {
          return this.handleError(error);
        })
      );
    };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Cannot connect to server. Check your internet connection.';
          break;
        case 404:
          errorMessage = 'API endpoint not found';
          break;
        case 500:
          errorMessage = 'Server internal error';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
  // Draft management using localStorage (can be replaced with backend endpoints later)
  getUserDrafts(id: string | undefined): Observable<any> {
    return new Observable(observer => {
      try {
        const draftsKey = `drafts_${id}`;
        const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
        observer.next(drafts);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  updateDraft(id: string, draftData: any): Observable<any> {
    return new Observable(observer => {
      try {
        const userId = draftData.userId;
        const draftsKey = `drafts_${userId}`;
        const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
        
        const draftIndex = drafts.findIndex((d: any) => d.id === id);
        if (draftIndex >= 0) {
          drafts[draftIndex] = { ...draftData, id, lastModified: new Date() };
          localStorage.setItem(draftsKey, JSON.stringify(drafts));
          observer.next(drafts[draftIndex]);
        } else {
          observer.error('Draft not found');
        }
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  createDraft(draftData: any): Observable<any> {
    return new Observable(observer => {
      try {
        const userId = draftData.userId;
        const draftsKey = `drafts_${userId}`;
        const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
        
        const newDraft = {
          ...draftData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          lastModified: new Date()
        };
        
        drafts.unshift(newDraft);
        localStorage.setItem(draftsKey, JSON.stringify(drafts));
        observer.next(newDraft);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  deleteDraft(draftId: string): Observable<any> {
    return new Observable(observer => {
      try {
        // Find the draft in all user's drafts to get userId
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const draftsKey = `drafts_${user.id}`;
        const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
        
        const filteredDrafts = drafts.filter((d: any) => d.id !== draftId);
        localStorage.setItem(draftsKey, JSON.stringify(filteredDrafts));
        observer.next({ success: true });
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }


  // Get submissions - use new consolidated endpoint
  getSubmissions(type?: string, status?: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
  } = {}): Observable<any> {
    let params = new HttpParams();
    
    // Add status filter
    if (status) params = params.set('status', status);
    
    // Add type filter
    if (type) params = params.set('type', type);
    
    // Add pagination and sorting options
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);
    
    // Use authenticated headers for admin-only status filters
    let headers;
    if (status === 'pending_review' || status === 'accepted') {
      headers = this.getAuthHeaders();
    }
    
    const url = `${this.API_URL}/submissions`;
    return this.http.get(url, { headers, params }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  getPendingSubmissions(params?: any): Observable<any> {
    const headers = this.getAuthHeaders();
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    const url = `${this.API_URL}/reviews/pending`;
    return this.http.get(url, { headers, params: httpParams }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  getApprovedSubmissions(params?: any): Observable<any> {
    // Get accepted submissions ready for publication
    const url = `${this.API_URL}/reviews/accepted`;
    let httpParams = new HttpParams();
    
    // Add any query parameters
    Object.keys(params || {}).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });

    return this.http.get(url, { headers, params: httpParams }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }
  // Get published content (accepted submissions)
  getPublishedContent(type?: string): Observable<any> {
    let url = `${this.API_URL}/submissions/published`;
    if (type) {
      url += `?type=${type}`;
    }
    return this.http.get<any>(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get featured content
  getFeaturedContent(type?: string): Observable<any> {
    let url = `${this.API_URL}/submissions/featured`;
    if (type) {
      url += `?type=${type}`;
    }
    return this.http.get<any>(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Search submissions
  searchSubmissions(query: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
  } = {}): Observable<any> {
    const params: { [key: string]: string } = {};
    if (options.limit) params['limit'] = options.limit.toString();
    if (options.skip) params['skip'] = options.skip.toString();
    if (options.sortBy) params['sortBy'] = options.sortBy;
    if (options.order) params['order'] = options.order;

    return this.http.get<any>(`${this.API_URL}/submissions/search/${encodeURIComponent(query)}`, { params }).pipe(
      this.handleApiCall(`/submissions/search/${query}`, 'GET')
    );
  }

  // Get submission with contents
  getSubmissionWithContents(id: string): Observable<any> {
    const url = `${this.API_URL}/submissions/${id}/contents`;
    return this.http.get(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Submit new submission
  submitNewSubmission(submission: any): Observable<any> {
    const url = `${this.API_URL}/submissions`;
    return this.http.post<any>(url, submission).pipe(
      this.handleApiCall(url, 'POST')
    );
  }

  uploadSubmissionImage(submissionId: string, imageFile: File): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });
    
    console.log('🖼️ Uploading image for submission:', submissionId);
    console.log('📤 URL:', `${this.API_URL}/submissions/${submissionId}/upload-image`);
    console.log('🔑 Auth header:', headers.get('Authorization'));
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.http.post(`${this.API_URL}/submissions/${submissionId}/upload-image`, formData, { headers }).pipe(
      tap(response => console.log('✅ Image uploaded successfully:', response)),
      catchError(this.handleError)
    );
  }

  getPublishedContentById(id: string): Observable<any> {
    const url = `${this.API_URL}/submissions/published/${id}`;
    return this.http.get<any>(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get all content
  getContent(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/content`);
  }



  // Get authentication headers with proper JWT token
  private getAuthHeaders(): HttpHeaders {
    // Try to get the JWT token from backend auth
    const jwtToken = localStorage.getItem('jwt_token');
    
    if (jwtToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      });
    }
    
    // Fallback: try Google token (though backend may not accept it)
    const googleToken = localStorage.getItem('google_token');
    if (googleToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      });
    }
    
    throw new Error('No valid authentication token found. Please log in again.');
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
      `${this.API_URL}/reviews/submission/${submissionId}`,
      { headers }
    );
  }

  updateSubmission(submissionId: string, updateData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/submissions/${submissionId}`, updateData, { headers });
  }
  
  // 2. Update submission status (for publishing)
  updateSubmissionStatus(submissionId: string, status: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
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

  // Publish submission with SEO configuration
  publishSubmissionWithSEO(submissionId: string, seoData: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
    canonical?: string;
    allowComments?: boolean;
    enableSocialSharing?: boolean;
    featuredOnHomepage?: boolean;
  }): Observable<any> {
    const headers = this.getAuthHeaders();
    
    console.log('🔄 Publishing with SEO config:', seoData);
    console.log('📤 URL:', `${this.API_URL}/submissions/${submissionId}/publish-with-seo`);
    
    return this.http.post(
      `${this.API_URL}/submissions/${submissionId}/publish-with-seo`, 
      seoData, 
      { headers }
    ).pipe(
      tap(response => console.log('✅ Published successfully:', response)),
      catchError(this.handleError)
    );
  }

  // Update SEO configuration for existing submission
  updateSEOConfiguration(submissionId: string, seoData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.patch(
      `${this.API_URL}/submissions/${submissionId}/seo`,
      seoData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get submission by SEO slug
  getSubmissionBySlug(slug: string): Observable<any> {
    console.log('🔍 Fetching submission by slug:', slug);
    console.log('📤 URL:', `${this.API_URL}/submissions/by-slug/${slug}`);
    
    return this.http.get(`${this.API_URL}/submissions/by-slug/${slug}`).pipe(
      tap(response => console.log('✅ Submission loaded by slug:', response)),
      catchError(this.handleError)
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
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.role) params = params.set('role', options.role);

    return this.http.get<any>(`${this.API_URL}/users`, { params, headers });
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
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.API_URL}/users/${userId}`, updateData, { headers });
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

  getAllPrompts(): Observable<any> {
  return this.http.get<any>(`${this.API_URL}/prompts/all`);
}

// Create new prompt (admin only)
createPrompt(promptData: any): Observable<any> {
  const headers = this.getAuthHeaders(); 
  return this.http.post<any>(`${this.API_URL}/prompts`, promptData, {headers});
}

// Update existing prompt (admin only)
updatePrompt(promptId: string, promptData: any): Observable<any> {
  return this.http.put<any>(`${this.API_URL}/prompts/${promptId}`, promptData);
}

// Delete prompt (admin only)
deletePrompt(promptId: string): Observable<any> {
  const headers = this.getAuthHeaders(); 
  return this.http.delete<any>(`${this.API_URL}/prompts/${promptId}`, {headers});
}

// Toggle prompt active status (admin only)
togglePromptStatus(promptId: string): Observable<any> {
  return this.http.patch<any>(`${this.API_URL}/prompts/${promptId}/toggle-status`, {});
}

// Increment prompt usage count
usePrompt(promptId: string): Observable<any> {
  return this.http.post<any>(`${this.API_URL}/prompts/${promptId}/use`, {});
}

// Get single prompt by ID
getPromptById(promptId: string): Observable<any> {
  return this.http.get<any>(`${this.API_URL}/prompts/${promptId}`);
}

// Get prompt statistics (admin only)
getPromptStats(): Observable<any> {
  return this.http.get<any>(`${this.API_URL}/prompts/stats/overview`);
}

// Check if user is first-time submitter
checkUserSubmissionHistory(userId: string): Observable<any> {
  return this.http.get<any>(`${this.API_URL}/users/${userId}/submission-history`);
}

// Profile image upload is handled separately in user profile management

// Approve user bio (admin only)
approveUserBio(userId: string, approvedBio: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post<any>(`${this.API_URL}/users/${userId}/approve-bio`, { approvedBio }, { headers });
}

// Approve user profile image (admin only)
approveUserProfileImage(userId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post<any>(`${this.API_URL}/users/${userId}/approve-profile-image`, {}, { headers });
}

// Get user's submissions with status tracking
getUserSubmissions(): Observable<any> {
  const headers = this.getAuthHeaders();
  console.log('Getting user submissions with headers:', headers.keys());
  return this.http.get<any>(`${this.API_URL}/submissions/user/me`, { headers }).pipe(
    catchError(error => {
      console.error('getUserSubmissions error:', error);
      return throwError(() => error);
    })
  );
}

}