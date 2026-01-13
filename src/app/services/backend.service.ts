import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { tap, catchError, timeout, retry, map, retryWhen, scan, mergeMap } from 'rxjs/operators';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
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
  API_CONFIG,
  HTTP_STATUS,
  SubmissionStatus,
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
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    const platform = isPlatformServer(this.platformId) ? 'Server' : 'Browser';
  }

  private handleApiCall<T>(url: string, method: string = 'GET'): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => {
      return source.pipe(
        timeout(this.REQUEST_TIMEOUT),
        retryWhen(errors => errors.pipe(
          scan((retryCount, error: HttpErrorResponse) => {
            // Only retry on rate limit (429) or temporary server errors (5xx)
            if (error.status === 429 || (error.status >= 500 && error.status <= 599)) {
              if (retryCount >= 3) {
                throw error; // Stop retrying after 3 attempts
              }
              return retryCount + 1;
            }
            throw error; // Don't retry other errors
          }, 0),
          mergeMap((retryCount) => {
            // Exponential backoff: 1s, 2s, 4s
            const delayTime = Math.pow(2, retryCount) * 1000;
            return timer(delayTime);
          })
        )),
        catchError((error: HttpErrorResponse) => {
          return this.handleError(error);
        })
      );
    };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // Handle 401 Unauthorized - Session Expired
    if (error.status === HTTP_STATUS.UNAUTHORIZED) {
      this.handleSessionExpired();
      const enhancedError = {
        ...error,
        message: 'Your session has expired. Please log in again.',
        mobileMessage: 'Session expired',
        details: 'Please log in to continue',
        sessionExpired: true
      };
      return throwError(() => enhancedError);
    }

    // For validation errors and other API errors, preserve the original error structure
    if (error.status === HTTP_STATUS.BAD_REQUEST && error.error) {
      // Enhance error with mobile-friendly details
      const enhancedError = {
        ...error,
        mobileMessage: this.getMobileFriendlyMessage(error),
        details: error.error.details || error.error.message || 'Please check the form and try again'
      };
      return throwError(() => enhancedError);
    }

    let errorMessage = 'An unknown error occurred';
    let mobileMessage = 'Something went wrong';
    let details = '';

    if (typeof ErrorEvent !== 'undefined' && error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
      mobileMessage = 'Connection problem';
      details = 'Please check your internet connection and try again';
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Cannot connect to server. Check your internet connection.';
          mobileMessage = 'No connection';
          details = 'Check your internet and try again';
          break;
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = 'API endpoint not found';
          mobileMessage = 'Page not found';
          details = 'The requested content is not available';
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          errorMessage = 'Server internal error';
          mobileMessage = 'Server error';
          details = 'Our servers are experiencing issues. Please try again later';
          break;
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          errorMessage = 'Service temporarily unavailable';
          mobileMessage = 'Service unavailable';
          details = 'We\'re temporarily down for maintenance. Try again soon';
          break;
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = 'Forbidden access';
          mobileMessage = 'Permission denied';
          details = 'You don\'t have permission for this action';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
          mobileMessage = 'Error occurred';
          details = `Status: ${error.status}`;
      }
    }

    const enhancedError = {
      ...error,
      message: errorMessage,
      mobileMessage,
      details
    };

    return throwError(() => enhancedError);
  }

  /**
   * Handle session expiry - clear authentication state and redirect to login
   */
  private handleSessionExpired(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Store current URL for redirect after re-login
      const currentUrl = this.router.url;
      if (currentUrl && currentUrl !== '/login' && currentUrl !== '/') {
        localStorage.setItem('returnUrl', currentUrl);
      }

      // Clear all authentication data
      localStorage.removeItem('google_user');
      localStorage.removeItem('google_token');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user_hint');

      // Show alert to user
      alert('Your session has expired. Please log in again to continue.');

      // Redirect to login page
      this.router.navigate(['/login']);
    }
  }

  private getMobileFriendlyMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      const message = error.error.message.toLowerCase();
      
      if (message.includes('already exists')) {
        return 'Account exists';
      }
      if (message.includes('invalid credentials')) {
        return 'Wrong login info';
      }
      if (message.includes('validation')) {
        return 'Form has errors';
      }
      if (message.includes('required')) {
        return 'Missing info';
      }
      if (message.includes('password')) {
        return 'Password issue';
      }
      if (message.includes('email')) {
        return 'Email problem';
      }
      if (message.includes('username')) {
        return 'Username issue';
      }
      if (message.includes('registration')) {
        return 'Signup failed';
      }
      if (message.includes('login')) {
        return 'Login failed';
      }
    }
    
    return 'Error occurred';
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
    _t?: number;
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
    
    
    const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}`;
    return this.http.post<any>(url, submission, { headers }).pipe(
      catchError((error) => {
        
        // Provide more user-friendly error messages
        if (error.error?.error === 'document must have an _id before saving') {
          return throwError(() => ({
            ...error,
            error: {
              ...error.error,
              message: 'Server configuration error. Please contact support.',
              originalError: error.error.error
            }
          }));
        }
        
        return throwError(() => error);
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

    // Defensive check: if the configured API_URL points to localhost but the app is
    // running on a non-localhost origin (production), rewrite the base to use the
    // current window origin + /api so uploads do not go to developer localhost.
    let uploadBase = this.API_URL;
    try {
      if (!isPlatformServer(this.platformId) && typeof window !== 'undefined') {
        const runningHost = window.location.host || '';
        if (uploadBase.includes('localhost') && !runningHost.includes('localhost')) {
          console.warn(`[BackendService] Rewriting upload base from ${uploadBase} to use current origin ${window.location.origin}`);
          uploadBase = `${window.location.origin.replace(/\/$/, '')}/api`;
        }
      }
    } catch (e) {
      // noop - keep configured API_URL
    }
    
    // Normalize any returned image URLs that still point to localhost so consumers
    // of this method receive URLs that are fetchable from the current origin.
    return this.http.post(`${uploadBase}${API_ENDPOINTS.SUBMISSIONS_NESTED.UPLOAD_IMAGE(submissionId)}`, formData, { headers }).pipe(
      map((resp: any) => {
        try {
          // Only perform normalization when running in a browser environment
          const runningOrigin = (!isPlatformServer(this.platformId) && typeof window !== 'undefined') ? window.location.origin.replace(/\/$/, '') : null;

          const normalize = (url: string) => {
            if (!url || typeof url !== 'string') return url;
            // don't touch blob/data URLs
            if (url.startsWith('blob:') || url.startsWith('data:')) return url;
            try {
              const parsed = new URL(url);
              const host = parsed.host || '';

              // Only rewrite localhost URLs when:
              // 1. We're running in production (non-localhost origin)
              // 2. AND the URL is pointing to localhost
              // Don't rewrite in development where both frontend and backend are on localhost
              const isRunningOnLocalhost = runningOrigin && (runningOrigin.includes('localhost') || runningOrigin.includes('127.0.0.1'));
              const urlIsLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

              if (runningOrigin && urlIsLocalhost && !isRunningOnLocalhost) {
                // Production case: rewrite localhost URLs to use production origin
                return `${runningOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
              }

              // Development case: keep localhost URLs as-is (don't rewrite port 3000 to 4200)
              return url;
            } catch (e) {
              return url;
            }
          };

          if (resp) {
            if (resp.imageUrl) {
              resp.imageUrl = normalize(resp.imageUrl);
            }
            if (resp.submission) {
              if (resp.submission.imageUrl) {
                resp.submission.imageUrl = normalize(resp.submission.imageUrl);
              }
              if (resp.submission.seo && resp.submission.seo.ogImage) {
                resp.submission.seo.ogImage = normalize(resp.submission.seo.ogImage);
              }
            }
          }
        } catch (e) {
          // noop - return original response if normalization fails
        }
        return resp;
      }),
      catchError(this.handleError)
    );
  }

  deleteSubmissionImage(submissionId: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`
    });


    // Apply same defensive rewrite for deletes to ensure correct host
    let deleteBase = this.API_URL;
    try {
      if (!isPlatformServer(this.platformId) && typeof window !== 'undefined') {
        const runningHost = window.location.host || '';
        if (deleteBase.includes('localhost') && !runningHost.includes('localhost')) {
          deleteBase = `${window.location.origin.replace(/\/$/, '')}/api`;
        }
      }
    } catch (e) {
      // noop
    }
    return this.http.delete(`${deleteBase}${API_ENDPOINTS.SUBMISSIONS_NESTED.IMAGE(submissionId)}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Delete image by S3 key (for rich text editor)
  deleteImageByS3Key(s3Key: string): Observable<any> {
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.API_URL}/images/delete`, {
      headers,
      body: { s3Key }
    }).pipe(
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
  getContent(options: {
    published?: boolean;
    featured?: boolean;
    type?: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
    tags?: string;
    tag?: string;
    author?: string;
    userId?: string;
    fields?: string;
  } = {}): Observable<any> {
    let params = new HttpParams();
    
    // Add all filter options
    Object.keys(options).forEach(key => {
      const value = (options as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    
    // Use public headers for published content (no auth required), otherwise use auth headers
    const headers = (options && (options as any).published) ? this.getPublicHeaders() : this.getAuthHeaders();
    
    const url = `${this.API_URL}${API_ENDPOINTS.CONTENT}`;
    return this.http.get<any>(url, { headers, params }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }

  // Get single content by ID
  getContentById(contentId: string): Observable<any> {
    const headers = this.getPublicHeaders(); // Use public headers since this is for reading
    const url = `${this.API_URL}${API_ENDPOINTS.CONTENT}/id/${contentId}`;
    return this.http.get<any>(url, { headers }).pipe(
      this.handleApiCall(url, 'GET')
    );
  }



  // Get authentication headers with proper JWT token
  private getAuthHeaders(): HttpHeaders {
    // Try to get the JWT token from backend auth
    const jwtToken = this.safeGetLocalStorage('jwt_token');
    
    if (jwtToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Build-Version': environment.buildVersion || Date.now().toString()
      });
    }

    // Fallback: try Google token (though backend may not accept it)
    const googleToken = this.safeGetLocalStorage('google_token');
    if (googleToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Build-Version': environment.buildVersion || Date.now().toString()
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
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Build-Version': environment.buildVersion || Date.now().toString()
    });
  }

  // Use semantic endpoints for review actions
  approveSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.approveSubmissionSemantic(submissionId, reviewData);
  }

  // Use semantic endpoints for review actions  
  rejectSubmission(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.rejectSubmissionSemantic(submissionId, reviewData);
  }

  // Use semantic endpoints for review actions
  requestRevision(submissionId: string, reviewData: { reviewNotes: string }) {
    return this.requestRevisionSemantic(submissionId, reviewData);
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
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.USERS_NESTED.PROFILE_BY_ID(id)}`, { headers });
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
  const headers = this.getAuthHeaders();
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.ALL}`, {headers});
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
  const headers = this.getAuthHeaders();
  return this.http.patch<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.TOGGLE_STATUS(promptId)}`, {}, {headers});
}

// Increment prompt usage count
usePrompt(promptId: string): Observable<any> {
  return this.http.post<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.USE(promptId)}`, {});
}

// Get single prompt by ID
getPromptById(promptId: string): Observable<any> {
  return this.http.get<any>(`${this.API_URL}${API_ENDPOINTS.PROMPTS_NESTED.BY_ID(promptId)}`);
}


// Profile image upload is handled separately in user profile management


// Get user's submissions with status tracking
getUserSubmissions(options: {
  limit?: number;
  skip?: number;
  status?: string;
  type?: string;
} = {}): Observable<any> {
  let params = new HttpParams();
  
  if (options.limit !== undefined) params = params.set('limit', options.limit.toString());
  if (options.skip !== undefined) params = params.set('skip', options.skip.toString());
  if (options.status) params = params.set('status', options.status);
  if (options.type) params = params.set('type', options.type);
  
  const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS_NESTED.USER_SUBMISSIONS}`;
  console.log('🌐 Making API call to:', url, 'with params:', params.toString());
  
  const headers = this.getAuthHeaders();
  console.log('🔑 Auth headers:', headers);
  
  return this.http.get<any>(url, { headers, params }).pipe(
    tap(response => {
      console.log('🚀 Raw API response for getUserSubmissions:', response);
    }),
    catchError(error => {
      console.error('🚨 API error in getUserSubmissions:', error);
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

// Get popular tags from trending submissions
getPopularTags(options: { limit?: number; windowDays?: number; _t?: number } = {}): Observable<{
  tags: string[];
}> {
  let params = new HttpParams();
  
  if (options.limit) {
    params = params.set('limit', options.limit.toString());
  }
  if (options.windowDays) {
    params = params.set('windowDays', options.windowDays.toString());
  }

  const headers = this.getPublicHeaders();
  const url = `${this.API_URL}${API_ENDPOINTS.TAGS_NESTED.POPULAR}`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Authentication methods
loginUser(email: string, password: string): Observable<any> {
  const headers = this.getPublicHeaders();
  const url = `${this.API_URL}/auth/login`;
  return this.http.post<any>(url, { email, password }, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

registerUser(userData: {
  email: string;
  username: string;
  name: string;
  password: string;
  bio?: string;
}): Observable<any> {
  const headers = this.getPublicHeaders();
  const url = `${this.API_URL}/auth/register`;
  return this.http.post<any>(url, userData, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

// Content featuring methods (Admin/Reviewer only)
featureContent(contentId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}${API_ENDPOINTS.CONTENT}/${contentId}/feature`;
  return this.http.post<any>(url, {}, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

unfeatureContent(contentId: string): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}${API_ENDPOINTS.CONTENT}/${contentId}/unfeature`;
  return this.http.post<any>(url, {}, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

// Generic HTTP methods
get<T = any>(endpoint: string, params?: any): Observable<T> {
  const headers = this.getAuthHeaders();
  let httpParams = new HttpParams();
  
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });
  }

  const url = `${this.API_URL}${endpoint}`;
  return this.http.get<T>(url, { headers, params: httpParams }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

post<T = any>(endpoint: string, body: any = {}): Observable<T> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}${endpoint}`;
  return this.http.post<T>(url, body, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

put<T = any>(endpoint: string, body: any = {}): Observable<T> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}${endpoint}`;
  return this.http.put<T>(url, body, { headers }).pipe(
    this.handleApiCall(url, 'PUT')
  );
}

// ========================================
// NEW OPTIMIZED LIGHTWEIGHT ENDPOINTS
// ========================================



// Get explore content - lightweight cards for public content
getExploreContent(options: {
  limit?: number;
  skip?: number;
  type?: string;
  featured?: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
} = {}): Observable<any> {
  let params = new HttpParams();
  
  if (options.limit) params = params.set('limit', options.limit.toString());
  if (options.skip) params = params.set('skip', options.skip.toString());
  if (options.type) params = params.set('type', options.type);
  if (options.featured) params = params.set('featured', 'true');
  if (options.sortBy) params = params.set('sortBy', options.sortBy);
  if (options.order) params = params.set('order', options.order);

  return this.http.get(`${this.API_URL}/submissions/explore`, { params }).pipe(
    catchError(this.handleError)
  );
}





// ========================================
// NEW SEMANTIC REVIEW ENDPOINTS
// ========================================

// Approve submission - semantic endpoint with no action parameter
approveSubmissionSemantic(submissionId: string, reviewData: { 
  reviewNotes: string; 
  rating?: number 
}): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.API_URL}/reviews/${submissionId}/approve`, reviewData, { headers }).pipe(
    catchError(this.handleError)
  );
}

// Reject submission - semantic endpoint with no action parameter
rejectSubmissionSemantic(submissionId: string, reviewData: { 
  reviewNotes: string; 
  rating?: number 
}): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.API_URL}/reviews/${submissionId}/reject`, reviewData, { headers }).pipe(
    catchError(this.handleError)
  );
}

// Request revision - semantic endpoint with no action parameter
requestRevisionSemantic(submissionId: string, reviewData: { 
  reviewNotes: string; 
  rating?: number 
}): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.API_URL}/reviews/${submissionId}/revision`, reviewData, { headers }).pipe(
    catchError(this.handleError)
  );
}

// Shortlist submission - semantic endpoint with no action parameter
shortlistSubmissionSemantic(submissionId: string, reviewData: { 
  reviewNotes: string; 
  reviewerId?: string 
}): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.API_URL}/reviews/${submissionId}/shortlist`, reviewData, { headers }).pipe(
    catchError(this.handleError)
  );
}

// Send custom email to submission author
sendReviewEmail(submissionId: string, emailData: {
  subject: string;
  message: string;
  template?: string
}): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.API_URL}/reviews/${submissionId}/send-email`, emailData, { headers }).pipe(
    catchError(this.handleError)
  );
}

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// Get comprehensive analytics overview
getAnalyticsOverview(): Observable<{
  totalViews: number;
  totalPosts: number;
  totalUsers: number;
  avgViewsPerPost: number;
  publishedToday: number;
  publishedThisWeek: number;
  publishedThisMonth: number;
}> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/overview`;
  return this.http.get<any>(url, { headers }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Get top performing content
getTopContent(options: {
  period?: 'week' | 'month' | 'all';
  limit?: number;
  type?: string;
} = {}): Observable<{
  topByViews: any[];
  topByEngagement: any[];
  trending: any[];
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  
  if (options.period) params = params.set('period', options.period);
  if (options.limit) params = params.set('limit', options.limit.toString());
  if (options.type) params = params.set('type', options.type);

  const url = `${this.API_URL}/analytics/top-content`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Get analytics by content type
getContentTypeAnalytics(): Observable<{
  types: Array<{
    type: string;
    count: number;
    totalViews: number;
    avgViews: number;
    percentage: number;
  }>;
}> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/content-types`;
  return this.http.get<any>(url, { headers }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Get time-series data for views
getViewsTimeSeries(options: {
  period?: 'week' | 'month' | 'quarter' | 'year';
  groupBy?: 'day' | 'week' | 'month';
} = {}): Observable<{
  data: Array<{
    date: string;
    views: number;
    posts: number;
  }>;
  total: number;
  growth: number;
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  
  if (options.period) params = params.set('period', options.period);
  if (options.groupBy) params = params.set('groupBy', options.groupBy);

  const url = `${this.API_URL}/analytics/views-time-series`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Get user engagement analytics
getUserEngagementAnalytics(): Observable<{
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  topContributors: any[];
  userGrowth: any[];
}> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/user-engagement`;
  return this.http.get<any>(url, { headers }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Get submission workflow analytics
getSubmissionAnalytics(): Observable<{
  pending: number;
  approved: number;
  rejected: number;
  published: number;
  averageReviewTime: number;
  rejectionReasons: any[];
  monthlyTrends: any[];
}> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/submissions`;
  return this.http.get<any>(url, { headers }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Search Analytics Methods
getSearchAnalyticsOverview(days: number = 30, source?: string): Observable<{
  overview: {
    totalSearches: number;
    uniqueQueries: number;
    uniqueUsers: number;
    avgResultsCount: number;
    zeroResultSearches: number;
    zeroResultRate: number;
  };
  topQueries: Array<{ query: string; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
  searchTypes: Array<{ type: string; count: number }>;
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  if (days) params = params.set('days', days.toString());
  if (source) params = params.set('source', source);

  const url = `${this.API_URL}/analytics/search/overview`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

getPopularSearchQueries(options: {
  days?: number;
  limit?: number;
  source?: string;
} = {}): Observable<{
  data: Array<{
    query: string;
    searchCount: number;
    avgResults: number;
    uniqueUsers: number;
    lastSearched: Date;
    searchTypes: string[];
  }>;
  metadata: {
    period: string;
    totalQueries: number;
  };
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  if (options.days) params = params.set('days', options.days.toString());
  if (options.limit) params = params.set('limit', options.limit.toString());
  if (options.source) params = params.set('source', options.source);

  const url = `${this.API_URL}/analytics/search/popular`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

getZeroResultSearches(options: {
  days?: number;
  limit?: number;
  source?: string;
} = {}): Observable<{
  data: Array<{
    query: string;
    searchCount: number;
    uniqueUsers: number;
    lastSearched: Date;
    searchTypes: string[];
  }>;
  metadata: {
    period: string;
    totalQueries: number;
    description: string;
  };
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  if (options.days) params = params.set('days', options.days.toString());
  if (options.limit) params = params.set('limit', options.limit.toString());
  if (options.source) params = params.set('source', options.source);

  const url = `${this.API_URL}/analytics/search/zero-results`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

getSearchTrends(options: {
  days?: number;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  source?: string;
} = {}): Observable<{
  data: Array<{
    period: string;
    totalSearches: number;
    uniqueQueries: number;
    uniqueUsers: number;
    avgResultsCount: number;
    zeroResultSearches: number;
    zeroResultRate: number;
  }>;
  metadata: {
    period: string;
    groupBy: string;
    totalPeriods: number;
  };
}> {
  const headers = this.getAuthHeaders();
  let params = new HttpParams();
  if (options.days) params = params.set('days', options.days.toString());
  if (options.groupBy) params = params.set('groupBy', options.groupBy);
  if (options.source) params = params.set('source', options.source);

  const url = `${this.API_URL}/analytics/search/trends`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Track search queries for analytics
trackSearch(data: {
  query: string;
  source: string;
  resultsCount?: number;
  userId?: string;
}): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/search/track`;
  return this.http.post<any>(url, data, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

// Track content view with enhanced metadata for analytics
trackContentView(data: {
  contentId: string;
  source: string;
  contentType?: string;
  userId?: string;
  sessionId?: string;
  timeOnPage?: number;
}): Observable<any> {
  const headers = this.getAuthHeaders();
  const url = `${this.API_URL}/analytics/content/track-view`;
  return this.http.post<any>(url, data, { headers }).pipe(
    this.handleApiCall(url, 'POST')
  );
}

// Get trending authors based on featured content views
getTrendingAuthors(options: { limit?: number } = {}): Observable<any> {
  let params = new HttpParams();

  // Add filter options
  Object.keys(options).forEach(key => {
    const value = (options as any)[key];
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, value.toString());
    }
  });

  const headers = this.getPublicHeaders(); // Use public headers since this is for public display
  const url = `${this.API_URL}/users/trending`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}

// Fetch random published submissions to boost discoverability
getRandomSubmissions(options: { type?: string; limit?: number } = {}): Observable<any> {
  let params = new HttpParams();
  if (options.type) {
    params = params.set('type', options.type);
  }
  if (options.limit !== undefined && options.limit !== null) {
    params = params.set('limit', options.limit.toString());
  }

  const headers = this.getPublicHeaders();
  const url = `${this.API_URL}${API_ENDPOINTS.SUBMISSIONS}/random`;
  return this.http.get<any>(url, { headers, params }).pipe(
    this.handleApiCall(url, 'GET')
  );
}
}