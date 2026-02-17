export interface User {
  _id: string;
  // username removed — backend no longer requires username
  name?: string;
  email: string;
  bio?: string;
  profileImage?: string;
  role: 'user' | 'writer' | 'reviewer' | 'admin';
  needsProfileCompletion?: boolean;
  isFeatured?: boolean;
  featuredAt?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
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
  submissionStats?: {
    total: number;
    published: number;
    pending: number;
    needsRevision: number;
    draft: number;
    accepted: number;
    rejected: number;
    byType: {
      poem: number;
      prose: number;
      article: number;
      opinion: number;
      [key: string]: number;
    };
  };
}

export interface UserListItem {
  _id: string;
  // username removed
  name?: string;
  email: string;
  bio?: string;
  role: 'user' | 'writer' | 'reviewer' | 'admin';
  profileImage?: string;
  isFeatured?: boolean;
  featuredAt?: string;
  createdAt: string;
  totalSubmissions?: number;
  acceptedSubmissions?: number;
  // include social links for list items so admin can see/set instagram/facebook
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
    linkedin?: string;
  };
}

export interface CreateUserPayload {
  // username removed — not required
  name: string;
  email: string;
  password: string;
  role: 'user' | 'writer' | 'reviewer' | 'admin';
  bio?: string;
  // allow creating with social links (instagram/facebook)
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
    linkedin?: string;
  };
}

export interface UpdateUserPayload {
  name?: string;
  // username removed
  bio?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
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