import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HTTP_STATUS } from '../shared/constants/api.constants';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get JWT token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  /**
   * Create HTTP headers with authorization token
   */
  private createHeaders(includeAuth: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === HTTP_STATUS.UNAUTHORIZED) {
        errorMessage = 'Unauthorized - Please login again';
        // Optionally redirect to login
      } else if (error.status === HTTP_STATUS.FORBIDDEN) {
        errorMessage = 'Access denied - Insufficient permissions';
      } else if (error.status === HTTP_STATUS.NOT_FOUND) {
        errorMessage = 'Resource not found';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Server error: ${error.status}`;
      }
    }


    return throwError(() => ({ status: error.status, message: errorMessage }));
  }

  /**
   * GET request
   */
  get<T = any>(endpoint: string, params?: any, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.createHeaders(includeAuth);
    
    const options: any = { headers };
    if (params) {
      options.params = params;
    }

    return this.http.get<T>(url, options).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * POST request
   */
  post<T = any>(endpoint: string, data: any = {}, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.createHeaders(includeAuth);

    return this.http.post<T>(url, data, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * PUT request
   */
  put<T = any>(endpoint: string, data: any = {}, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.createHeaders(includeAuth);

    return this.http.put<T>(url, data, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * PATCH request
   */
  patch<T = any>(endpoint: string, data: any = {}, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.createHeaders(includeAuth);

    return this.http.patch<T>(url, data, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * DELETE request
   */
  delete<T = any>(endpoint: string, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.createHeaders(includeAuth);

    return this.http.delete<T>(url, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Upload file with authorization
   */
  upload<T = any>(endpoint: string, formData: FormData, includeAuth: boolean = true): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Don't set Content-Type for file uploads, let browser set it
    let headers = new HttpHeaders();
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return this.http.post<T>(url, formData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Clear authentication token
   */
  clearAuth(): void {
    localStorage.removeItem('jwt_token');
  }
}