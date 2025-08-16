export interface User {
  _id: string;
  username: string;
  name?: string;
  email: string;
  bio?: string;
  profileImage?: string;
  role: 'user' | 'curator' | 'reviewer' | 'admin';
  needsProfileCompletion?: boolean;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  stats: {
    totalPublished: number;
    totalViews: number;
    totalLikes: number;
    followers: number;
    following: number;
  };
  preferences: {
    showEmail: boolean;
    showStats: boolean;
    allowMessages: boolean;
  };
  createdAt: string;
  updatedAt: string;
  // Additional computed fields from aggregation
  totalSubmissions?: number;
  acceptedSubmissions?: number;
  pendingSubmissions?: number;
  rejectedSubmissions?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  usersByRole: {
    user: number;
    reviewer: number;
    admin: number;
  };
  // Legacy format for backward compatibility
  users: number;
  reviewers: number;
  admins: number;
  total: number;
}

export interface UserProfile extends User {
  // Specific profile view fields
}

export interface UserListItem {
  _id: string;
  username: string;
  name?: string;
  email: string;
  bio?: string;
  role: 'user' | 'curator' | 'reviewer' | 'admin';
  profileImage?: string;
  createdAt: string;
  totalSubmissions?: number;
  acceptedSubmissions?: number;
}

export interface CreateUserPayload {
  username: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'curator' | 'reviewer' | 'admin';
  bio?: string;
}

export interface UpdateUserPayload {
  name?: string;
  username?: string;
  bio?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  preferences?: {
    showEmail?: boolean;
    showStats?: boolean;
    allowMessages?: boolean;
  };
}

export interface PaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersResponse {
  users: UserListItem[];
  pagination: PaginationInfo;
  stats?: {
    users: number;
    reviewers: number;
    admins: number;
    total: number;
  };
}

export interface SearchUsersResponse {
  users: UserListItem[];
  totalFound: number;
}

export interface UserProfileResponse {
  user: UserProfile;
  publishedWorks: PublishedWork[];
}

export interface UserPublishedWorksResponse {
  works: PublishedWork[];
  pagination: PaginationInfo;
}

export interface PublishedWork {
  _id: string;
  title: string;
  submissionType: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  excerpt: string;
  readingTime: number;
  tags: string[];
  imageUrl?: string;
  slug?: string;
  seo?: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}