// Barrel file for all models - single import point

// API and common types
export * from './api.model';

// Core domain models  
export * from './author.model';
export * from './user.model';
export * from './submission.model';
export * from './review.model';
export * from './prompt.model';
export * from './purge.model';

// Re-export commonly used types for convenience
export type {
  Author
} from './author.model';

// Re-export utility classes (not types)
export {
  AuthorUtils
} from './author.model';

export type {
  User,
  UserProfile,
  UserListItem,
  CreateUserPayload,
  UpdateUserPayload,
  PublishedWork,
  UserProfileResponse,
  UserPublishedWorksResponse,
  UsersResponse,
  SearchUsersResponse,
  UserStats
} from './user.model';

export type {
  Submission,
  Content,
  CreateSubmissionPayload,
  UpdateSubmissionPayload,
  UpdateStatusPayload,
  SubmissionFilters,
  PublishedContent
} from './submission.model';

export type {
  Review,
  CreateReviewPayload,
  PendingSubmission,
  ReviewStats
} from './review.model';

export type {
  WritingPrompt,
  CreatePromptPayload,
  UpdatePromptPayload,
  PromptFilters
} from './prompt.model';

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationMeta,
  UploadResponse
} from './api.model';

export type {
  PurgeStats,
  PurgeSubmission,
  PurgeFilters,
  PurgePreviewResponse,
  PurgeExecuteResponse
} from './purge.model';