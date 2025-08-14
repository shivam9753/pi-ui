import { Author } from './author.model';

export interface WritingPrompt {
  _id: string;
  title: string;
  description: string;
  category: 'poem' | 'story' | 'article' | 'quote' | 'cinema_essay' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Usage stats
  usageCount: number;
  submissionsCount: number;
  lastUsed?: string;
  
  // Populated fields
  author?: Author;
}

export interface CreatePromptPayload {
  title: string;
  description: string;
  category: 'poem' | 'story' | 'article' | 'quote' | 'cinema_essay' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isActive?: boolean;
}

export interface UpdatePromptPayload {
  title?: string;
  description?: string;
  category?: 'poem' | 'story' | 'article' | 'quote' | 'cinema_essay' | 'general';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  isActive?: boolean;
}

export interface PromptFilters {
  category?: string;
  difficulty?: string;
  tags?: string[];
  isActive?: boolean;
  searchTerm?: string;
  createdBy?: string;
}

export interface PromptsResponse {
  prompts: WritingPrompt[];
  pagination: PromptPaginationInfo;
  totalFound?: number;
}

export interface PromptStats {
  totalPrompts: number;
  activePrompts: number;
  promptsByCategory: {
    poem: number;
    story: number;
    article: number;
    quote: number;
    cinema_essay: number;
    general: number;
  };
  promptsByDifficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  totalUsage: number;
  totalSubmissions: number;
  mostPopularPrompts: {
    _id: string;
    title: string;
    usageCount: number;
  }[];
}

export interface PromptPaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasNext: boolean;
  hasPrev: boolean;
}