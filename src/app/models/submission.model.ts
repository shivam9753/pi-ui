import { Author } from './author.model';

export interface Submission {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  contentIds: string[];
  contents?: Content[];
  submissionType: 'poem' | 'story' | 'article' | 'cinema_essay' | 'opinion';
  status: 'draft' | 'submitted' | 'in_progress' | 'shortlisted' | 'needs_changes' | 'approved' | 'rejected' | 'published' | 'archived';
  imageUrl?: string;
  excerpt?: string;
  readingTime?: number;
  isFeatured: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  publishedAt?: string;
  
  // Workflow fields
  assignedTo?: string;
  assignedAt?: string;
  eligibleForPurge?: boolean;
  purgeEligibleSince?: string;
  markedForDeletion?: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Review tracking
  history?: SubmissionHistoryEntry[];
  revisionNotes?: string;
  
  // SEO and Publishing
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
  
  // Author info (standardized)
  author?: Author;
  
  // View tracking
  viewCount: number;
  
  // Trending tracking
  recentViews: number;
  windowStartTime: string;
}

export interface Content {
  _id: string;
  userId: string;
  submissionId?: string;
  title: string;
  body: string;
  type: string;
  tags: string[];
  metadata?: any;
  images?: ContentImage[];
  hasInlineImages: boolean;
  
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

export interface SubmissionHistoryEntry {
  action: 'submitted' | 'moved_to_in_progress' | 'shortlisted' | 'needs_changes' | 'approved' | 'rejected' | 'published' | 'archived' | 'moved_to_draft';
  timestamp: string;
  userId: string;
  username?: string;
  userRole: 'user' | 'curator' | 'reviewer' | 'admin';
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
  metadata?: any;
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
    publishSettings?: {
      allowComments?: boolean;
      enableSocialSharing?: boolean;
      featuredOnHomepage?: boolean;
    };
  };
}

export interface UpdateStatusPayload {
  status: 'accepted' | 'rejected' | 'needs_revision' | 'published';
  reviewerId?: string;
  reviewNotes?: string;
  revisionNotes?: string;
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
  likeCount: number;
  commentCount: number;
  
  // Trending tracking
  recentViews: number;
  windowStartTime: string;
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