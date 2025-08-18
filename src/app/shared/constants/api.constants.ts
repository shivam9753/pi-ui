/**
 * Centralized API constants for the PI application
 * This file contains all API endpoints, status values, and configuration constants
 * to ensure consistency across the application.
 */

// API Endpoints
export const API_ENDPOINTS = {
  // Base endpoints
  SUBMISSIONS: '/submissions',
  REVIEWS: '/reviews',
  USERS: '/users',
  PROMPTS: '/prompts',
  CONTENT: '/content',
  
  // Nested endpoints
  SUBMISSIONS_NESTED: {
    CONTENTS: (id: string) => `/submissions/${id}/contents`,
    HISTORY: (id: string) => `/submissions/${id}/history`,
    STATUS: (id: string) => `/submissions/${id}/status`,
    PUBLISH_SEO: (id: string) => `/submissions/${id}/publish-with-seo`,
    SEO: (id: string) => `/submissions/${id}/seo`,
    UNPUBLISH: (id: string) => `/submissions/${id}/unpublish`,
    ANALYZE: (id: string) => `/submissions/${id}/analyze`,
    UPLOAD_IMAGE: (id: string) => `/submissions/${id}/upload-image`,
    IMAGE: (id: string) => `/submissions/${id}/image`,
    BY_SLUG: (slug: string) => `/submissions/by-slug/${slug}`,
    PUBLISHED: (id: string) => `/submissions/published/${id}`,
    FEATURED: '/submissions/featured',
    DRAFTS: '/submissions/drafts',
    USER_SUBMISSIONS: '/submissions/user/me'
  },
  
  REVIEWS_NESTED: {
    ACTION: (id: string) => `/reviews/${id}/action`,
    APPROVE: (id: string) => `/reviews/${id}/approve`, // DEPRECATED
    REJECT: (id: string) => `/reviews/${id}/reject`, // DEPRECATED
    REVISION: (id: string) => `/reviews/${id}/revision`, // DEPRECATED
    MOVE_TO_PROGRESS: (id: string) => `/reviews/${id}/move-to-progress`,
    SUBMISSION: (id: string) => `/reviews/submission/${id}`,
    PENDING: '/reviews/pending',
    ACCEPTED: '/reviews/accepted',
    MY_REVIEWS: '/reviews/my-reviews',
    STATS: '/reviews/stats'
  },
  
  USERS_NESTED: {
    PROFILE: '/users/profile',
    PUBLISHED_WORKS: (id: string) => `/users/${id}/published-works`,
    SUBMISSION_HISTORY: (id: string) => `/users/${id}/submission-history`,
    APPROVE_BIO: (id: string) => `/users/${id}/approve-bio`,
    APPROVE_PROFILE_IMAGE: (id: string) => `/users/${id}/approve-profile-image`,
    FOLLOW: (id: string) => `/users/${id}/follow`,
    SEARCH: '/users/search'
  },
  
  PROMPTS_NESTED: {
    ALL: '/prompts/all',
    USE: (id: string) => `/prompts/${id}/use`,
    TOGGLE_STATUS: (id: string) => `/prompts/${id}/toggle-status`,
    STATS: '/prompts/stats/overview'
  },
  
  CONTENT_NESTED: {
    BY_TAG: (tag: string) => `/content/by-tag/${encodeURIComponent(tag)}`,
    TAGS_POPULAR: '/content/tags/popular'
  }
} as const;

// Submission Status Constants
export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_REVIEW: 'pending_review',
  IN_PROGRESS: 'in_progress',
  SHORTLISTED: 'shortlisted',
  NEEDS_CHANGES: 'needs_changes',
  NEEDS_REVISION: 'needs_revision',
  APPROVED: 'approved',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  RESUBMITTED: 'resubmitted'
} as const;

// Review Actions Constants
export const REVIEW_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REVISION: 'revision',
  MOVE_TO_PROGRESS: 'move_to_progress',
  SHORTLIST: 'shortlist'
} as const;

// Submission Types Constants
export const SUBMISSION_TYPES = {
  POEM: 'poem',
  PROSE: 'prose',
  ARTICLE: 'article',
  BOOK_REVIEW: 'book_review',
  CINEMA_ESSAY: 'cinema_essay',
  OPINION: 'opinion',
  BOOKS: 'books',
  NAPO_WRIMO: 'napoWrimo',
  INTERVIEW: 'interview'
} as const;

// User Roles Constants
export const USER_ROLES = {
  USER: 'user',
  CURATOR: 'curator',
  REVIEWER: 'reviewer',
  ADMIN: 'admin'
} as const;

// API Configuration Constants
export const API_CONFIG = {
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 1,
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    DEFAULT_SKIP: 0,
    MAX_LIMIT: 100
  }
} as const;

// HTTP Status Constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Toast Types Constants
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
} as const;

// Analysis Constants
export const ANALYSIS_CONFIG = {
  MIN_WORD_COUNT: 10,
  MAX_WORD_COUNT: 5000,
  READING_SPEED_WPM: 200, // Words per minute
  QUALITY_ASPECTS: [
    'imagery',
    'sensory_details',
    'cohesiveness', 
    'rich_language',
    'format_structure',
    'emotional_resonance',
    'originality',
    'rhythm',
    'layers_of_meaning',
    'memorable_lines'
  ]
} as const;

// File Upload Constants
export const UPLOAD_CONFIG = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  UPLOAD_TIMEOUT: 30000 // 30 seconds
} as const;

// Type exports for TypeScript
export type SubmissionStatus = typeof SUBMISSION_STATUS[keyof typeof SUBMISSION_STATUS];
export type ReviewAction = typeof REVIEW_ACTIONS[keyof typeof REVIEW_ACTIONS];
export type SubmissionType = typeof SUBMISSION_TYPES[keyof typeof SUBMISSION_TYPES];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type ToastType = typeof TOAST_TYPES[keyof typeof TOAST_TYPES];
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// Helper functions for API endpoint construction
export const API_UTILS = {
  /**
   * Build query string from parameters object
   */
  buildQueryString: (params: Record<string, any>): string => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value.toString());
      }
    });
    return query.toString();
  },

  /**
   * Get full API URL with optional query parameters
   */
  getApiUrl: (endpoint: string, params?: Record<string, any>): string => {
    const queryString = params ? API_UTILS.buildQueryString(params) : '';
    return queryString ? `${endpoint}?${queryString}` : endpoint;
  },

  /**
   * Check if status is reviewable
   */
  isReviewableStatus: (status: string): boolean => {
    const reviewableStatuses: SubmissionStatus[] = [
      SUBMISSION_STATUS.PENDING_REVIEW,
      SUBMISSION_STATUS.IN_PROGRESS,
      SUBMISSION_STATUS.RESUBMITTED,
      SUBMISSION_STATUS.SHORTLISTED
    ];
    return reviewableStatuses.includes(status as SubmissionStatus);
  },

  /**
   * Check if status is final (no further action needed)
   */
  isFinalStatus: (status: string): boolean => {
    const finalStatuses: SubmissionStatus[] = [
      SUBMISSION_STATUS.PUBLISHED,
      SUBMISSION_STATUS.REJECTED,
      SUBMISSION_STATUS.ARCHIVED
    ];
    return finalStatuses.includes(status as SubmissionStatus);
  },

  /**
   * Get status display name with proper formatting
   */
  getStatusDisplayName: (status: string): string => {
    const statusMap: Record<string, string> = {
      [SUBMISSION_STATUS.PENDING_REVIEW]: 'Pending Review',
      [SUBMISSION_STATUS.IN_PROGRESS]: 'In Progress',
      [SUBMISSION_STATUS.SHORTLISTED]: 'Shortlisted',
      [SUBMISSION_STATUS.NEEDS_REVISION]: 'Needs Revision',
      [SUBMISSION_STATUS.NEEDS_CHANGES]: 'Needs Changes',
      [SUBMISSION_STATUS.APPROVED]: 'Approved',
      [SUBMISSION_STATUS.ACCEPTED]: 'Accepted',
      [SUBMISSION_STATUS.REJECTED]: 'Rejected',
      [SUBMISSION_STATUS.PUBLISHED]: 'Published',
      [SUBMISSION_STATUS.DRAFT]: 'Draft',
      [SUBMISSION_STATUS.RESUBMITTED]: 'Resubmitted',
      [SUBMISSION_STATUS.ARCHIVED]: 'Archived'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  }
} as const;