import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Submission {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  contentIds: string[];
  contents?: Content[];
  submissionType: 'poem' | 'story' | 'article' | 'quote' | 'cinema_essay';
  status: 'pending_review' | 'accepted' | 'rejected' | 'published';
  imageUrl?: string;
  excerpt?: string;
  readingTime?: number;
  isFeatured: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  seo?: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
    canonical?: string;
    publishSettings?: {
      allowComments: boolean;
      enableSocialSharing: boolean;
      featuredOnHomepage: boolean;
    };
  };
}

export interface Content {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  tags: string[];
  metadata?: any;
  images?: any[];
  hasInlineImages: boolean;
}

export interface SubmissionsResponse {
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

    return this.apiService.get<SubmissionsResponse>('/submissions', queryParams);
  }

  /**
   * Get submission by ID with contents
   */
  getSubmissionById(id: string): Observable<{ submission: Submission }> {
    return this.apiService.get<{ submission: Submission }>(`/submissions/${id}`);
  }

  /**
   * Get submission with contents by ID
   */
  getSubmissionWithContents(id: string): Observable<SubmissionWithContentsResponse> {
    return this.apiService.get<SubmissionWithContentsResponse>(`/submissions/${id}/contents`);
  }

  /**
   * Create new submission
   */
  createSubmission(submissionData: Partial<Submission>): Observable<{ message: string; submission: Submission }> {
    return this.apiService.post<{ message: string; submission: Submission }>('/submissions', submissionData);
  }

  /**
   * Update submission
   */
  updateSubmission(id: string, submissionData: Partial<Submission>): Observable<{ message: string; submission: Submission }> {
    return this.apiService.put<{ message: string; submission: Submission }>(`/submissions/${id}`, submissionData);
  }

  /**
   * Delete submission
   */
  deleteSubmission(id: string): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`/submissions/${id}`);
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

    return this.apiService.get<SubmissionsResponse>('/submissions/published', queryParams);
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

    return this.apiService.get<SubmissionsResponse>(`/submissions/user/${userId}`, queryParams);
  }

  /**
   * Publish submission with SEO data
   */
  publishSubmissionWithSEO(id: string, seoData: any): Observable<{ message: string; submission: Submission }> {
    return this.apiService.post<{ message: string; submission: Submission }>(`/submissions/${id}/publish-with-seo`, seoData);
  }

  /**
   * Get submission by slug
   */
  getSubmissionBySlug(slug: string): Observable<{ submission: Submission }> {
    return this.apiService.get<{ submission: Submission }>(`/submissions/by-slug/${slug}`);
  }

  /**
   * Upload submission image
   */
  uploadSubmissionImage(formData: FormData): Observable<{ imageUrl: string; message: string }> {
    return this.apiService.upload<{ imageUrl: string; message: string }>('/images/upload', formData);
  }
}