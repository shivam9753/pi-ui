export interface TopicPitch {
  _id: string;
  title: string;
  description: string;
  contentType: 'article' | 'opinion' | 'cinema_essay' | 'story';
  pitchedBy: string;
  pitcherName: string;
  pitcherRole: 'creator' | 'curator' | 'admin';
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  submissionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicPitchPayload {
  title: string;
  description: string;
  contentType: 'article' | 'opinion' | 'cinema_essay' | 'story';
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface UpdateTopicPitchPayload {
  title?: string;
  description?: string;
  contentType?: 'article' | 'opinion' | 'cinema_essay' | 'story';
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: 'available' | 'claimed' | 'completed' | 'cancelled';
}

export interface ClaimTopicPayload {
  topicId: string;
}

export interface TopicPitchFilters {
  contentType?: string;
  status?: string;
  pitchedBy?: string;
  priority?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface TopicPitchesResponse {
  topics: TopicPitch[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats?: {
    available: number;
    claimed: number;
    completed: number;
    total: number;
  };
}

export interface TopicPitchStats {
  totalPitches: number;
  availableTopics: number;
  claimedTopics: number;
  completedTopics: number;
  byType: {
    article: number;
    opinion: number;
    cinema_essay: number;
    story: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}