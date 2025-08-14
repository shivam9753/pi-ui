// Common API response structures and utility types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  details?: any;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  skip: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  totalFound?: number;
  message?: string;
  timestamp: string;
}

export interface SearchParams {
  q?: string;
  searchTerm?: string;
  limit?: number;
  skip?: number;
  page?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface UploadResponse {
  success: boolean;
  filename?: string;
  originalName?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  error?: string;
  message?: string;
}

export interface BulkActionPayload {
  ids: string[];
  action: string;
  params?: Record<string, any>;
}

export interface BulkActionResponse {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: {
    id: string;
    success: boolean;
    error?: string;
  }[];
  message?: string;
}

export interface StatsResponse {
  success: boolean;
  data: {
    [key: string]: number | string | any;
  };
  period?: {
    from: string;
    to: string;
  };
  timestamp: string;
}

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    _id: string;
    username: string;
    name?: string;
    email: string;
    role: string;
    profileImage?: string;
    needsProfileCompletion?: boolean;
  };
  expiresIn?: string;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: {
    _id: string;
    username: string;
    name: string;
    email: string;
    role: string;
  };
  error?: string;
}

// File and Image types
export interface ImageMetadata {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  url: string;
  thumbnailUrl?: string;
}

export interface FileUploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Form and validation types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

// Export utility type helpers
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type SortOrder = 'asc' | 'desc';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'regex' | 'exists';

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  select?: string[];
  populate?: string[];
  lean?: boolean;
}