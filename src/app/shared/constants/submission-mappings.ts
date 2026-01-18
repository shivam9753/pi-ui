export interface SubmissionTypeMapping {
  id: string;
  displayName: string;
  icon: string;
  color: string;
  description?: string;
}

export interface SubmissionStatusMapping {
  id: string;
  displayName: string;
  color: string;
  icon: string;
  variant: 'neutral' | 'positive' | 'caution' | 'critical';
}

export const SUBMISSION_TYPES: Record<string, SubmissionTypeMapping> = {
  poem: {
    id: 'poem',
    displayName: 'Poem',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', // Feather/quill pen icon for poetry
    color: 'tag-orange',
    description: 'Poetry submissions'
  },
  article: {
    id: 'article',
    displayName: 'Article',
    icon: 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z', // Newspaper icon for articles
    color: 'tag-orange',
    description: 'Article submissions'
  },
  prose: {
    id: 'prose',
    displayName: 'Prose',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', // Open book icon for prose
    color: 'tag-orange',
    description: 'Prose submissions'
  },
  opinion: {
    id: 'opinion',
    displayName: 'Opinion',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', // Speech bubble for opinions
    color: 'tag-orange',
    description: 'Opinion pieces'
  },
  cinema_essay: {
    id: 'cinema_essay',
    displayName: 'Cinema',
    icon: 'M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3zM6 6v14h12V6H6zm6-3v1h4V3h-4z', // Film camera icon for cinema
    color: 'tag-orange',
    description: 'Cinema essay submissions'
  },
  book_review: {
    id: 'book_Review',
    displayName: 'Book',
    icon: 'M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3zM6 6v14h12V6H6zm6-3v1h4V3h-4z', // Film camera icon for cinema
    color: 'tag-orange',
    description: 'Book Review'
  }
};

export const SUBMISSION_STATUSES: Record<string, SubmissionStatusMapping> = {
  pending_review: {
    id: 'pending_review',
    displayName: 'Submitted',
    color: 'tag-gray',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', // Clock
    variant: 'neutral'
  },
  in_progress: {
    id: 'in_progress',
    displayName: 'Under Review',
    color: 'tag-blue',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', // Refresh
    variant: 'neutral'
  },
  needs_revision: {
    id: 'needs_revision',
    displayName: 'Needs Revision',
    color: 'tag-orange',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', // Edit
    variant: 'caution'
  },
  resubmitted: {
    id: 'resubmitted',
    displayName: 'Resubmitted',
    color: 'tag-yellow',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', // Upload
    variant: 'neutral'
  },
  shortlisted: {
    id: 'shortlisted',
    displayName: 'Shortlisted',
    color: 'tag-purple',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', // Star
    variant: 'positive'
  },
  accepted: {
    id: 'accepted',
    displayName: 'Accepted',
    color: 'tag-green',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', // Check circle
    variant: 'positive'
  },
  approved: {
    id: 'approved',
    displayName: 'Approved',
    color: 'tag-green',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', // Check circle
    variant: 'positive'
  },
  rejected: {
    id: 'rejected',
    displayName: 'Rejected',
    color: 'tag-red',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', // X circle
    variant: 'critical'
  },
  published: {
    id: 'published',
    displayName: 'Published',
    color: 'tag-emerald',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', // External link
    variant: 'positive'
  },
  draft: {
    id: 'draft',
    displayName: 'Draft',
    color: 'tag-gray',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', // Document
    variant: 'neutral'
  },
  submitted: {
    id: 'submitted',
    displayName: 'Submitted',
    color: 'tag-gray',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', // Clock
    variant: 'neutral'
  },
  archived: {
    id: 'archived',
    displayName: 'Archived',
    color: 'tag-gray',
    icon: 'M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm2 2v8h10v-8H7z', // Archive
    variant: 'neutral'
  }
};

// Helper functions
export function getSubmissionTypeMapping(type: string): SubmissionTypeMapping {
  if (!type || typeof type !== 'string') {
    return {
      id: 'unknown',
      displayName: 'Unknown',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'tag-gray',
      description: 'Unknown type'
    };
  }

  return SUBMISSION_TYPES[type] || {
    id: type,
    displayName: type.charAt(0).toUpperCase() + type.slice(1),
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'tag-gray',
    description: 'Unknown type'
  };
}

export function getSubmissionStatusMapping(status: string): SubmissionStatusMapping {
  if (!status || typeof status !== 'string') {
    return {
      id: 'unknown',
      displayName: 'Unknown',
      color: 'tag-gray',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      variant: 'neutral'
    };
  }
  
  return SUBMISSION_STATUSES[status] || {
    id: status,
    displayName: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    color: 'tag-gray',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    variant: 'neutral'
  };
}