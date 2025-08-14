import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Submission } from './submission.service';
import {
  Review,
  CreateReviewPayload,
  ReviewsResponse,
  PendingReviewsResponse,
  ReviewStats,
  PendingSubmission
} from '../models';

// Legacy interface for backward compatibility
export interface LegacyReview {
  _id: string;
  submissionId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyReviewsResponse {
  reviews: LegacyReview[];
  total: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface PendingReviewsResponse {
  submissions: Submission[];
  total: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  constructor(private apiService: ApiService) {}

  /**
   * Get all reviews
   */
  getAllReviews(params: {
    limit?: number;
    skip?: number;
    status?: string;
    reviewerId?: string;
    sortBy?: string;
    order?: string;
  } = {}): Observable<ReviewsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.status) queryParams.status = params.status;
    if (params.reviewerId) queryParams.reviewerId = params.reviewerId;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<ReviewsResponse>('/reviews', queryParams);
  }

  /**
   * Get pending reviews (submissions waiting for review)
   */
  getPendingReviews(params: {
    limit?: number;
    skip?: number;
    type?: string;
    sortBy?: string;
    order?: string;
  } = {}): Observable<PendingReviewsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.type) queryParams.type = params.type;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<PendingReviewsResponse>('/reviews/pending', queryParams);
  }

  /**
   * Get accepted reviews (ready to publish)
   */
  getAcceptedReviews(params: {
    limit?: number;
    skip?: number;
    type?: string;
    sortBy?: string;
    order?: string;
  } = {}): Observable<PendingReviewsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.type) queryParams.type = params.type;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.order) queryParams.order = params.order;

    return this.apiService.get<PendingReviewsResponse>('/reviews/accepted', queryParams);
  }

  /**
   * Create or update review
   */
  submitReview(submissionId: string, reviewData: {
    status: 'approved' | 'rejected';
    feedback?: string;
  }): Observable<{ message: string; review: Review }> {
    return this.apiService.post<{ message: string; review: Review }>(`/reviews/${submissionId}`, reviewData);
  }

  /**
   * Get review by submission ID
   */
  getReviewBySubmissionId(submissionId: string): Observable<{ review: Review }> {
    return this.apiService.get<{ review: Review }>(`/reviews/submission/${submissionId}`);
  }

  /**
   * Delete review
   */
  deleteReview(reviewId: string): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`/reviews/${reviewId}`);
  }

  /**
   * Get reviewer's reviews
   */
  getReviewerReviews(reviewerId: string, params: {
    limit?: number;
    skip?: number;
    status?: string;
  } = {}): Observable<ReviewsResponse> {
    const queryParams: any = {};
    
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.skip !== undefined) queryParams.skip = params.skip.toString();
    if (params.status) queryParams.status = params.status;

    return this.apiService.get<ReviewsResponse>(`/reviews/reviewer/${reviewerId}`, queryParams);
  }
}