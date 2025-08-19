import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../shared/constants/api.constants';
import {
  Submission,
  Content,
  SubmissionsResponse,
  CreateSubmissionPayload,
  UpdateSubmissionPayload,
  UpdateStatusPayload,
  SubmissionFilters,
  SubmissionQueryOptions,
  SubmissionStats,
  PublishedContent,
  PublishedContentResponse
} from '../models';

// Keep legacy interfaces for backward compatibility if needed
export interface LegacySubmissionsResponse {
  submissions: Submission[];
  total: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface SubmissionWithContentsResponse {
  submission: Submission;
  contents: Content[];
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {

  constructor(private apiService: ApiService) {}

  /**
   * Get all submissions with filters
   */
  getAllSubmissions(params: {
    limit?: number;
    skip?: number;
    status?: string;
    type?: string;
    sortBy?: string;
    order?: string;
  } = {}): Observable<SubmissionsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.type = params.type;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<SubmissionsResponse>(API_ENDPOINTS.SUBMISSIONS, queryParams);
  }

  /**
   * Get submission by ID with contents
   */
  getSubmissionById(id: string): Observable<{ submission: Submission }> {
    return this.apiService.get<{ submission: Submission }>(API_ENDPOINTS.SUBMISSIONS + `/${id}`);
  }

  /**
   * Get submission with contents by ID
   */
  getSubmissionWithContents(id: string): Observable<SubmissionWithContentsResponse> {
    return this.apiService.get<SubmissionWithContentsResponse>(API_ENDPOINTS.SUBMISSIONS_NESTED.CONTENTS(id));
  }

  /**
   * Create new submission
   */
  createSubmission(submissionData: Partial<Submission>): Observable<{ message: string; submission: Submission }> {
    return this.apiService.post<{ message: string; submission: Submission }>(API_ENDPOINTS.SUBMISSIONS, submissionData);
  }

  /**
   * Update submission
   */
  updateSubmission(id: string, submissionData: Partial<Submission>): Observable<{ message: string; submission: Submission }> {
    return this.apiService.put<{ message: string; submission: Submission }>(API_ENDPOINTS.SUBMISSIONS + `/${id}`, submissionData);
  }

  /**
   * Delete submission
   */
  deleteSubmission(id: string): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(API_ENDPOINTS.SUBMISSIONS + `/${id}`);
  }

  /**
   * Get published submissions
   */
  getPublishedSubmissions(params: {
    limit?: number;
    skip?: number;
    type?: string;
    featured?: boolean;
    sortBy?: string;
    order?: string;
  } = {}): Observable<SubmissionsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.type) queryParams.type = params.type;
    if (params.featured !== undefined) queryParams.featured = params.featured.toString();
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<SubmissionsResponse>(API_ENDPOINTS.SUBMISSIONS + '/published', queryParams);
  }

  /**
   * Get user's submissions
   */
  getUserSubmissions(userId: string, params: {
    limit?: number;
    skip?: number;
    status?: string;
    type?: string;
  } = {}): Observable<SubmissionsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.type = params.type;

    return this.apiService.get<SubmissionsResponse>(API_ENDPOINTS.SUBMISSIONS_NESTED.USER_BY_ID(userId), queryParams);
  }

  /**
   * Publish submission with SEO data
   */
  publishSubmissionWithSEO(id: string, seoData: any): Observable<{ message: string; submission: Submission }> {
    return this.apiService.post<{ message: string; submission: Submission }>(API_ENDPOINTS.SUBMISSIONS_NESTED.PUBLISH_SEO(id), seoData);
  }

  /**
   * Get submission by slug
   */
  getSubmissionBySlug(slug: string): Observable<{ submission: Submission }> {
    return this.apiService.get<{ submission: Submission }>(API_ENDPOINTS.SUBMISSIONS_NESTED.BY_SLUG(slug));
  }

  /**
   * Upload submission image
   */
  uploadSubmissionImage(formData: FormData): Observable<{ imageUrl: string; message: string }> {
    return this.apiService.upload<{ imageUrl: string; message: string }>(API_ENDPOINTS.UPLOADS.IMAGE, formData);
  }
}