import { Author } from './author.model';

export interface Submission {
  _id: string;
  userId: string | Author;
  title: string;
  description?: string;
  contentIds: string[];
  contents?: Content[];
  submissionType: 'poem' | 'prose' | 'story' | 'article' | 'cinema_essay' | 'opinion' | 'book_review';
  status: 'draft' | 'pending_review' | 'in_progress' | 'needs_revision' | 'accepted' | 'rejected' | 'published' | 'resubmitted';
  imageUrl?: string;
  excerpt?: string;
  isFeatured: boolean;
  publishedAt?: string;
  
  // SEO and Publishing
  seo?: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
    canonical?: string;
  };
  
  // Author info (standardized)
  author?: Author;
  
  // View tracking
  viewCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface Content {
  _id: string;
  submissionId?: string;
  title: string;
  body: string;
  type: string;
  tags: string[];
  footnotes?: string;
  images?: ContentImage[];
  
  // Content-level publishing fields
  isPublished?: boolean;
  publishedAt?: string;
  seo?: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface ContentImage {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface AuditEntry {
  action: 'pending_review' | 'in_progress' | 'needs_revision' | 'accepted' | 'rejected' | 'published' | 'republished' | 'unpublished' | 'resubmitted' | 'draft';
  timestamp: string;
  userId: string;
  username?: string;
  notes?: string;
}

export interface WorkflowAction {
  action: string;
  label: string;
  targetStatus: string;
  requiresNotes?: boolean;
}

export interface SubmissionStats {
  totalSubmissions: number;
  pendingReview: number;
  inProgress: number;
  accepted: number;
  rejected: number;
  published: number;
  needsRevision: number;
  byType: {
    poem: number;
    story: number;
    article: number;
    opinion: number;
    cinema_essay: number;
  };
}

export interface SubmissionsResponse {
  submissions: Submission[];
  pagination: SubmissionPaginationInfo;
  stats?: SubmissionStats;
}

export interface SubmissionFilters {
  status?: string;
  type?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  isFeatured?: boolean;
}

export interface SubmissionQueryOptions {
  limit?: number;
  skip?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  populate?: string[];
}

export interface CreateSubmissionPayload {
  title: string;
  description?: string;
  submissionType: 'poem' | 'story' | 'article' | 'opinion' | 'cinema_essay';
  contents: CreateContentPayload[];
  imageUrl?: string;
}

export interface CreateContentPayload {
  title: string;
  body: string;
  type: string;
  tags: string[];
  footnotes?: string;
}

export interface UpdateSubmissionPayload {
  title?: string;
  description?: string;
  submissionType?: 'poem' | 'story' | 'article' | 'opinion' | 'cinema_essay';
  imageUrl?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

export interface UpdateStatusPayload {
  status: 'accepted' | 'rejected' | 'needs_revision' | 'published';
  reviewNotes?: string;
}

export interface PublishContentPayload {
  contentId: string;
  seo: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

// For content discovery endpoints
export interface PublishedContent extends Content {
  author: Author;
  viewCount: number;
}

export interface PublishedContentResponse {
  content: PublishedContent[];
  pagination: SubmissionPaginationInfo;
  totalFound?: number;
}

export interface SubmissionPaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasNext: boolean;
  hasPrev: boolean;
}