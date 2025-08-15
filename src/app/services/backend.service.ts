import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, timeout, retry } from 'rxjs/operators';
import { isPlatformServer } from '@angular/common';
import { environment } from '../../environments/environment';
import {
  UpdateStatusPayload,
  UserProfile,
  PublishedWork,
  UploadResponse,
  ApiResponse
} from '../models';


@Injectable({
  providedIn: 'root'
})
export class BackendService {
  // Make API_URL public for SSR service access
  readonly API_URL = environment.apiBaseUrl;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const platform = isPlatformServer(this.platformId) ? 'Server' : 'Browser';
    console.log(`🔧 Backend Service initialized with API URL: ${this.API_URL} (${platform})`);
  }

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
  getPublishedContent(type?: string, options: { limit?: number; skip?: number; sortBy?: string; order?: 'asc' | 'desc' } = {}): Observable<any> {
    let params = new HttpParams();
    
    if (type) {
      params = params.set('type', type);
    }
    
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    
    if (options.skip) {
      params = params.set('skip', options.skip.toString());
    }
    
    if (options.sortBy) {
      params = params.set('sortBy', options.sortBy);
    }
    
    if (options.order) {
      params = params.set('order', options.order);
    }

    const url = `${this.API_URL}/submissions/published`;
    return this.http.get<any>(url, { params }).pipe(
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
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}/submissions/${id}/contents`;
    return this.http.get(url, { headers }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Submit new submission
  submitNewSubmission(submission: any): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
    
    const url = `${this.API_URL}/submissions`;
    return this.http.post<any>(url, submission, { headers }).pipe(
      this.handleApiCall(url, 'POST')
    );
  }

  uploadSubmissionImage(submissionId: string, imageFile: File): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.http.post(`${this.API_URL}/submissions/${submissionId}/upload-image`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  deleteSubmissionImage(submissionId: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });
    
    
    return this.http.delete(`${this.API_URL}/submissions/${submissionId}/image`, { headers }).pipe(
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

  // Get pending reviews with enhanced filtering
  getPendingReviews(params: any = {}): Observable<any> {
    const headers = this.getAuthHeaders();
    let httpParams = new HttpParams();
    
    // Add all filter parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    
    return this.http.get(
      `${this.API_URL}/reviews/pending`,
      { headers, params: httpParams }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Move submission to in_progress status
  moveSubmissionToProgress(submissionId: string, notes: string = ''): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(
      `${this.API_URL}/reviews/${submissionId}/move-to-progress`,
      { notes },
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Request revision for submission
  requestRevision(submissionId: string, reviewData: { reviewNotes: string, rating?: number }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(
      `${this.API_URL}/reviews/${submissionId}/revision`,
      reviewData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get submission history
  getSubmissionHistory(submissionId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(
      `${this.API_URL}/submissions/${submissionId}/history`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Unpublish submission (admin only)
  unpublishSubmission(submissionId: string, notes: string = ''): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(
      `${this.API_URL}/submissions/${submissionId}/unpublish`,
      { notes },
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Delete submission (admin only)
  deleteSubmission(submissionId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(
      `${this.API_URL}/submissions/${submissionId}`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Resubmit submission after revision
  resubmitSubmission(submissionId: string, submissionData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(
      `${this.API_URL}/submissions/${submissionId}/resubmit`,
      submissionData,
      { headers }
    ).pipe(
      catchError(this.handleError)
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
    
    
    return this.http.post(
      `${this.API_URL}/submissions/${submissionId}/publish-with-seo`, 
      seoData, 
      { headers }
    ).pipe(
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
    
    return this.http.get(`${this.API_URL}/submissions/by-slug/${slug}`).pipe(
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

  // Get current user's profile (authenticated)
  getCurrentUserProfileFromAPI(): Observable<UserProfile> {
    return this.http.get<any>(`${this.API_URL}/users/profile`);
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

  // Get published content by tag
  getPublishedContentByTag(tag: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Observable<{
    tag: string;
    contents: any[];
    total: number;
    pagination: any;
  }> {
    let params = new HttpParams();
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);

    return this.http.get<any>(`${this.API_URL}/content/by-tag/${encodeURIComponent(tag)}`, { params });
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
  return this.http.get<any>(`${this.API_URL}/submissions/user/me`, { headers }).pipe(
    catchError(error => {
      return throwError(() => error);
    })
  );
}

// Draft management methods
getUserDrafts(): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.get(
    `${this.API_URL}/submissions/drafts/my`,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

saveDraft(draftData: any): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.API_URL}/submissions/drafts`,
    draftData,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

submitDraft(draftId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.API_URL}/submissions/drafts/${draftId}/submit`,
    {},
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

deleteDraft(draftId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.delete(
    `${this.API_URL}/submissions/drafts/${draftId}`,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

// Get popular tags from published content
getPopularTags(options: { limit?: number } = {}): Observable<{
  tags: { tag: string; count: number }[];
  total: number;
}> {
  let params = new HttpParams();
  
  if (options.limit) {
    params = params.set('limit', options.limit.toString());
  }

  const url = `${this.API_URL}/submissions/popular-tags`;
  return this.http.get<any>(url, { params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

}