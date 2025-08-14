import { Author } from './author.model';

export interface Review {
  _id: string;
  submissionId: string;
  reviewerId: string;
  reviewerName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  rating?: number;
  detailedFeedback?: {
    content: string;
    grammar: string;
    style: string;
    overall: string;
  };
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  submission?: {
    _id: string;
    title: string;
    submissionType: string;
    author: Author;
  };
  reviewer?: Author;
}

export interface CreateReviewPayload {
  submissionId: string;
  status: 'accepted' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  rating?: number;
  detailedFeedback?: {
    content?: string;
    grammar?: string;
    style?: string;
    overall?: string;
  };
}

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  completedToday: number;
  averageRating: number;
  reviewsByStatus: {
    accepted: number;
    rejected: number;
    needs_revision: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: ReviewPaginationInfo;
  stats?: ReviewStats;
}

export interface PendingReviewsResponse {
  submissions: PendingSubmission[];
  pagination: ReviewPaginationInfo;
  totalPending: number;
}

export interface PendingSubmission {
  _id: string;
  title: string;
  submissionType: string;
  description?: string;
  createdAt: string;
  author: Author;
  contentCount: number;
  wordCount?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface ReviewerWorkload {
  reviewerId: string;
  reviewerName: string;
  pendingReviews: number;
  completedThisWeek: number;
  averageReviewTime: number; // in hours
  specialties: string[]; // submission types they prefer
}

export interface ReviewPaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasNext: boolean;
  hasPrev: boolean;
}