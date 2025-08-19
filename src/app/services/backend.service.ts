import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, timeout, retry, map } from 'rxjs/operators';
import { isPlatformServer } from '@angular/common';
import { environment } from '../../environments/environment';
import {
  UpdateStatusPayload,
  UserProfile,
  PublishedWork,
  UploadResponse,
  ApiResponse
} from '../models';
import { 
  API_ENDPOINTS, 
  SUBMISSION_STATUS, 
  REVIEW_ACTIONS, 
  API_CONFIG,
  HTTP_STATUS,
  SubmissionStatus,
  ReviewAction,
  API_UTILS 
} from '../shared/constants/api.constants';


@Injectable({
  providedIn: 'root'
})
export class BackendService {
  // Make API_URL public for SSR service access
  readonly API_URL = environment.apiBaseUrl;
  private readonly REQUEST_TIMEOUT = API_CONFIG.REQUEST_TIMEOUT;

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
    // For validation errors and other API errors, preserve the original error structure
    if (error.status === HTTP_STATUS.BAD_REQUEST && error.error) {
      // Preserve the original error structure for validation errors
      return throwError(() => error);
    }
    
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
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = 'API endpoint not found';
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          errorMessage = 'Server internal error';
          break;
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          errorMessage = 'Service temporarily unavailable';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }


  // UNIFIED SUBMISSIONS API - Single endpoint for all submission queries
  getSubmissions(options: {
    type?: string;
    status?: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
    search?: string;
    authorType?: string;
    wordLength?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Observable<any> {
    let params = new HttpParams();
    
    // Add all filter options
    Object.keys(options).forEach(key => {
      const value = (options as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    
    // Use safe headers - public for published content, auth for admin operations
    const isPublicRequest = options.status === SUBMISSION_STATUS.PUBLISHED;
    const headers = isPublicRequest ? this.getPublicHeaders() : this.getAuthHeaders();
    
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}`;
    return this.http.get(url, { headers, params }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Public API for published content - no auth required, works in incognito mode
  getPublishedContent(type?: string, options: { limit?: number; skip?: number; sortBy?: string; order?: 'asc' | 'desc' } = {}): Observable<any> {
    let params = new HttpParams();
    
    // Add all filter options
    const allOptions = {
      status: SUBMISSION_STATUS.PUBLISHED,
      type,
      ...options
    };
    
    Object.keys(allOptions).forEach(key => {
      const value = (allOptions as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    
    // Use public headers - no auth required for published content
    const headers = this.getPublicHeaders();
    
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}`;
    return this.http.get(url, { headers, params }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get featured content
  getFeaturedContent(type?: string): Observable<any> {
    let url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.FEATURED}`;
    if (type) {
      url += `?type=${type}`;
    }
    return this.http.get<any>(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // DEPRECATED: Use getSubmissions with search parameter
  searchSubmissions(query: string, options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
  } = {}): Observable<any> {
    return this.getSubmissions({
      search: query,
      status: SUBMISSION_STATUS.PUBLISHED, // Search only published content for public users
      ...options
    });
  }

  // Get submission with contents
  getSubmissionWithContents(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.CONTENTS(id)}`;
    return this.http.get(url, { headers }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get submission optimized for review (minimal data)
  getSubmissionForReview(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.REVIEW(id)}`;
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
    
    // Debug: Backend should set status to pending_review automatically
    console.log('📤 Backend service sending submission (no status - backend should default to pending_review)');
    
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}`;
    return this.http.post<any>(url, submission, { headers }).pipe(
      tap((response) => {
        console.log('✅ Backend response:', response);
        console.log('📋 Response status field:', response?.status);
      }),
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
    
    return this.http.post(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.UPLOAD_IMAGE(submissionId)}`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  deleteSubmissionImage(submissionId: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });
    
    
    return this.http.delete(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.IMAGE(submissionId)}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getPublishedContentById(id: string): Observable<any> {
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.PUBLISHED(id)}`;
    return this.http.get<any>(url).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get all content
  getContent(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.CONTENT}`);
  }



  // Get authentication headers with proper JWT token
  private getAuthHeaders(): HttpHeaders {
    // Try to get the JWT token from backend auth
    const jwtToken = this.safeGetLocalStorage('jwt_token');
    
    if (jwtToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      });
    }
    
    // Fallback: try Google token (though backend may not accept it)
    const googleToken = this.safeGetLocalStorage('google_token');
    if (googleToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      });
    }
    
    throw new Error('No valid authentication token found. Please log in again.');
  }

  // Safe localStorage access that works in incognito mode and SSR
  private safeGetLocalStorage(key: string): string | null {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      // localStorage access can fail in incognito mode
      console.warn(`localStorage access failed for key '${key}':`, error);
      return null;
    }
  }

  // Get headers for public API calls (no auth required)
  private getPublicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // Safe method to get auth headers without throwing errors
  private getSafeAuthHeaders(): HttpHeaders {
    try {
      return this.getAuthHeaders();
    } catch (error) {
      // If auth fails, return public headers
      console.warn('Auth headers not available, using public headers:', error);
      return this.getPublicHeaders();
    }
  }

  

  /**
   * Unified review action method - replaces individual approve/reject/revision methods
   * @param submissionId - The submission ID
   * @param action - The review action (approve, reject, revision)
   * @param reviewData - Review data including notes and optional rating
   */
  submitReviewAction(submissionId: string, action: ReviewAction, reviewData: { reviewNotes: string; rating?: number }) {
    const headers = this.getAuthHeaders();
    const url = API_ENDPOINTS.REVIEWS_NESTED.ACTION(submissionId);
    
    return this.http.post(
      `${this.API_URL}${url}`,
      {
        action,
        ...reviewData
      },
      { headers }
    ).pipe(this.handleApiCall(url, 'POST'));
  }

  // DEPRECATED: Use submitReviewAction instead
  approveSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.submitReviewAction(submissionId, REVIEW_ACTIONS.APPROVE as ReviewAction, reviewData);
  }

  // DEPRECATED: Use submitReviewAction instead  
  rejectSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.submitReviewAction(submissionId, REVIEW_ACTIONS.REJECT as ReviewAction, reviewData);
  }

  // DEPRECATED: Use submitReviewAction instead
  requestRevision(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.submitReviewAction(submissionId, REVIEW_ACTIONS.REVISION as ReviewAction, reviewData);
  }

  // Get review details for a submission
  getReviewDetails(submissionId: string) {
    const headers = this.getAuthHeaders();
    return this.http.get(
      `${this.API_URL}${API_ENDPOINTS.REVIEWS_NESTED.SUBMISSION(submissionId)}`,
      { headers }
    );
  }


  // Move submission to in_progress status
  moveSubmissionToProgress(submissionId: string, notes: string = ''): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(
      `${this.API_URL}${API_ENDPOINTS.REVIEWS_NESTED.MOVE_TO_PROGRESS(submissionId)}`,
      { notes },
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // REMOVED: This method is now handled by submitReviewAction

  // Get submission history
  getSubmissionHistory(submissionId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.HISTORY(submissionId)}`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Unpublish submission (admin only)
  unpublishSubmission(submissionId: string, notes: string = ''): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.UNPUBLISH(submissionId)}`,
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
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}/${submissionId}`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Resubmit submission after revision
  resubmitSubmission(submissionId: string, submissionData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.RESUBMIT(submissionId)}`,
      submissionData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateSubmission(submissionId: string, updateData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}/${submissionId}`, updateData, { headers });
  }
  
  // 2. Update submission status (for publishing)
  updateSubmissionStatus(submissionId: string, status: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
    
    
    return this.http.patch(
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.STATUS(submissionId)}`, 
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
  }): Observable<any> {
    const headers = this.getAuthHeaders();
    
    
    return this.http.post(
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.PUBLISH_SEO(submissionId)}`, 
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
      `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.SEO(submissionId)}`,
      seoData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get submission by SEO slug
  getSubmissionBySlug(slug: string): Observable<any> {
    
    return this.http.get(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.BY_SLUG(slug)}`).pipe(
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

    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS}`, { params, headers });
  }

  // Get user by ID
  getUserById(id: string): Observable<UserProfile> {
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.BY_ID(id)}`);
  }

  // Get current user's profile (authenticated)
  getCurrentUserProfileFromAPI(): Observable<UserProfile> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.PROFILE}`, { headers });
  }

  // Get user profile with enhanced stats
  getUserProfile(id: string): Observable<UserProfile> {
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.PROFILE_BY_ID(id)}`);
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

    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.PUBLISHED_WORKS(userId)}`, { params });
  }

  // Create new user
  createUser(userData: {
    email: string;
    username: string;
    password: string;
    role?: string;
    bio?: string;
  }): Observable<{ message: string; user: UserProfile }> {
    return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.USERS}`, userData);
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
    return this.http.put<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.UPDATE(userId)}`, updateData, { headers });
  }

  // Update user stats
  updateUserStats(userId: string, stats: {
    totalPublished?: number;
    totalViews?: number;
    totalLikes?: number;
    followers?: number;
    following?: number;
  }): Observable<{ message: string }> {
    return this.http.patch<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.STATS(userId)}`, stats);
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

    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.SEARCH}`, { params });
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

    return this.http.patch<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.FOLLOW(targetUserId)}`, followData);
  }

  // Delete user (admin only)
  deleteUser(userId: string): Observable<{ message: string }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.DELETE(userId)}`, { headers });
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

  // DEPRECATED: Use getSubmissions with status: 'published' and type parameter
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
    return this.getSubmissions({
      status: SUBMISSION_STATUS.PUBLISHED,
      type,
      ...options
    });
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
    
    // Add tag and status parameters for new submissions endpoint
    params = params.set('status', SUBMISSION_STATUS.PUBLISHED);
    params = params.set('tag', tag);
    
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.skip) params = params.set('skip', options.skip.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);

    const headers = this.getPublicHeaders();
    
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}`, { headers, params }).pipe(
      map((response: any) => ({
        tag: tag,
        contents: response.submissions || [],
        total: response.total || 0,
        pagination: response.pagination || {}
      }))
    );
  }

  getAllPrompts(): Observable<any> {
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.ALL}`);
}

// Create new prompt (admin only)
createPrompt(promptData: any): Observable<any> {
  const headers = this.getAuthHeaders(); 
  return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.CREATE}`, promptData, {headers});
}

// Update existing prompt (admin only)
updatePrompt(promptId: string, promptData: any): Observable<any> {
  return this.http.put<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.UPDATE(promptId)}`, promptData);
}

// Delete prompt (admin only)
deletePrompt(promptId: string): Observable<any> {
  const headers = this.getAuthHeaders(); 
  return this.http.delete<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.DELETE(promptId)}`, {headers});
}

// Toggle prompt active status (admin only)
togglePromptStatus(promptId: string): Observable<any> {
  return this.http.patch<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.TOGGLE_STATUS(promptId)}`, {});
}

// Increment prompt usage count
usePrompt(promptId: string): Observable<any> {
  return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.USE(promptId)}`, {});
}

// Get single prompt by ID
getPromptById(promptId: string): Observable<any> {
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.BY_ID(promptId)}`);
}

// Get prompt statistics (admin only)
getPromptStats(): Observable<any> {
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.STATS}`);
}

// Check if user is first-time submitter
checkUserSubmissionHistory(userId: string): Observable<any> {
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.SUBMISSION_HISTORY(userId)}`);
}

// Profile image upload is handled separately in user profile management

// Approve user bio (admin only)
approveUserBio(userId: string, approvedBio: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.APPROVE_BIO(userId)}`, { approvedBio }, { headers });
}

// Approve user profile image (admin only)
approveUserProfileImage(userId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.APPROVE_PROFILE_IMAGE(userId)}`, {}, { headers });
}

// Get user's submissions with status tracking
getUserSubmissions(): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.USER_SUBMISSIONS}`, { headers }).pipe(
    catchError(error => {
      return throwError(() => error);
    })
  );
}

// Draft management methods
getUserDrafts(): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.get(
    `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.MY_DRAFTS}`,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

saveDraft(draftData: any): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.DRAFTS}`,
    draftData,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

submitDraft(draftId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.DRAFT_SUBMIT(draftId)}`,
    {},
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

deleteDraft(draftId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.delete(
    `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.DRAFT_DELETE(draftId)}`,
    { headers }
  ).pipe(
    catchError(this.handleError)
  );
}

// Get popular tags from published content
getPopularTags(options: { limit?: number } = {}): Observable<{
  tags: string[];
}> {
  let params = new HttpParams();
  
  if (options.limit) {
    params = params.set('limit', options.limit.toString());
  }

  const headers = this.getPublicHeaders();
  const url = `${this.API_URL}${API_ENDPOINTS.CONTENT_NESTED.TAGS_POPULAR}`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

}