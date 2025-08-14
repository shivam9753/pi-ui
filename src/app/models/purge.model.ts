// Data purge management models

export interface PurgeStats {
  totalSubmissions: number;
  eligibleForPurge: number;
  markedForDeletion: number;
  purgeByStatus: {
    rejected: number;
    spam: number;
    draft: number;
  };
  purgeByAge: {
    oneMonth: number;
    threeMonths: number;
    sixMonths: number;
    oneYear: number;
    older: number;
  };
  estimatedStorageSaved: string; // e.g., "45.2 MB"
  lastPurgeDate?: string;
  nextRecommendedPurge?: string;
}

import { Author } from './author.model';

export interface PurgeSubmission {
  _id: string;
  title: string;
  submissionType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  eligibleForPurge: boolean;
  purgeEligibleSince?: string;
  markedForDeletion: boolean;
  author: Author;
  contentCount: number;
  totalSize: number; // in bytes
  purgeReason: 'age' | 'status' | 'manual';
  canPurge: boolean;
  warnings?: string[];
}

export interface PurgeFilters {
  status?: string[];
  submissionType?: string[];
  ageInMonths?: number;
  minSize?: number; // in bytes
  author?: string;
  markedForDeletion?: boolean;
  eligibleOnly?: boolean;
}

export interface PurgeQueryOptions {
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'size' | 'title';
  order?: 'asc' | 'desc';
}

export interface PurgeSubmissionsResponse {
  submissions: PurgeSubmission[];
  pagination: PurgePaginationInfo;
  stats: PurgeStats;
  recommendations: PurgeRecommendation[];
}

export interface PurgeRecommendation {
  type: 'immediate' | 'scheduled' | 'review';
  reason: string;
  count: number;
  estimatedSavings: string;
  criteria: PurgeFilters;
  priority: 'high' | 'medium' | 'low';
}

export interface PurgePreviewRequest {
  filters: PurgeFilters;
  options?: PurgeQueryOptions;
  dryRun: boolean;
}

export interface PurgePreviewResponse {
  success: boolean;
  preview: {
    submissionsToDelete: number;
    contentsToDelete: number;
    filesToDelete: number;
    estimatedStorageSaved: string;
    affectedUsers: number;
    breakdown: {
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byAge: Record<string, number>;
    };
  };
  submissions: PurgeSubmission[];
  warnings: string[];
  recommendations: string[];
  safetyChecks: {
    hasRecentActivity: boolean;
    hasPublishedContent: boolean;
    hasActiveReviews: boolean;
    estimatedTime: string; // e.g., "2-3 minutes"
  };
}

export interface PurgeExecuteRequest {
  filters: PurgeFilters;
  options?: PurgeQueryOptions;
  confirmationToken: string; // Should be "PURGE"
  batchSize?: number; // Max 100
  notifyUsers?: boolean;
}

export interface PurgeExecuteResponse {
  success: boolean;
  executionId: string;
  results: {
    submissionsDeleted: number;
    contentsDeleted: number;
    filesDeleted: number;
    storageFreed: string;
    errors: {
      submissionId: string;
      error: string;
    }[];
  };
  affectedUsers: {
    userId: string;
    username: string;
    deletedSubmissions: number;
  }[];
  executionTime: number; // milliseconds
  completedAt: string;
}

export interface PurgeHistory {
  _id: string;
  executionId: string;
  executedBy: {
    _id: string;
    username: string;
    name?: string;
  };
  filters: PurgeFilters;
  results: {
    submissionsDeleted: number;
    contentsDeleted: number;
    filesDeleted: number;
    storageFreed: string;
    errors: number;
  };
  executionTime: number;
  executedAt: string;
  status: 'completed' | 'partial' | 'failed';
  notes?: string;
}

export interface PurgeHistoryResponse {
  history: PurgeHistory[];
  pagination: PurgePaginationInfo;
  totalExecutions: number;
  totalDeleted: number;
  totalStorageFreed: string;
}

export interface MarkExistingPurgeRequest {
  criteria: {
    statusFilter: string[];
    ageInMonths: number;
  };
  dryRun?: boolean;
}

export interface MarkExistingPurgeResponse {
  success: boolean;
  markedCount: number;
  breakdown: {
    byStatus: Record<string, number>;
    byAge: Record<string, number>;
  };
  message: string;
}

export interface PurgePaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasNext: boolean;
  hasPrev: boolean;
}