import { TableColumn, TableAction } from './data-table.component';
import { SUBMISSION_STATUS } from '../../constants/api.constants';

// User Management Table Configuration
export const USER_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'user',
    label: 'User',
    type: 'custom',
    width: '40%',
    sortable: false
  },
  {
    key: 'role',
    label: 'Role',
    type: 'custom',
    width: '15%',
    sortable: true
  },
  {
    key: 'createdAt',
    label: 'Joined',
    type: 'date',
    width: '15%',
    sortable: true
  },
  {
    key: 'acceptedSubmissions',
    label: 'Published',
    type: 'text',
    width: '15%',
    align: 'center',
    sortable: true
  }
];

// Submissions Table Configuration
export const SUBMISSIONS_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'title',
    label: 'Title',
    type: 'custom',
    width: '30%',
    sortable: true
  },
  {
    key: 'authorName',
    label: 'Author',
    type: 'custom',
    width: '20%',
    sortable: true
  },
  {
    key: 'submissionType',
    label: 'Type',
    type: 'badge',
    width: '15%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    width: '15%',
    sortable: true
  },
  {
    key: 'stats',
    label: 'Stats',
    type: 'custom',
    width: '12%',
    sortable: false
  },
  {
    key: 'createdAt',
    label: 'Date',
    type: 'date',
    width: '18%',
    sortable: true
  }
];

// Published Posts Table Configuration
export const PUBLISHED_POSTS_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'title',
    label: 'Title & Author',
    type: 'custom',
    width: '45%',
    sortable: true
  },
  {
    key: 'submissionType',
    label: 'Type',
    type: 'custom',
    width: '20%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'custom',
    width: '15%',
    sortable: true
  },
  {
    key: 'stats',
    label: 'Stats',
    type: 'custom',
    width: '20%',
    sortable: false
  }
];

// Pending Reviews Table Configuration
export const PENDING_REVIEWS_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'imageUrl',
    label: 'Image',
    type: 'image',
    width: '10%',
    sortable: false
  },
  {
    key: 'title',
    label: 'Title & Author',
    type: 'custom',
    width: '30%',
    sortable: true
  },
  {
    key: 'submissionType',
    label: 'Type',
    type: 'badge',
    width: '15%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    width: '15%',
    sortable: true
  },
  {
    key: 'readingTime',
    label: 'Length',
    type: 'custom',
    width: '10%',
    sortable: false
  },
  {
    key: 'createdAt',
    label: 'Submitted',
    type: 'date',
    width: '20%',
    sortable: true
  }
];

// Ready to Publish Table Configuration
export const READY_TO_PUBLISH_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'imageUrl',
    label: 'Image',
    type: 'image',
    width: '10%',
    sortable: false
  },
  {
    key: 'title',
    label: 'Title & Author',
    type: 'custom',
    width: '35%',
    sortable: true
  },
  {
    key: 'submissionType',
    label: 'Type',
    type: 'badge',
    width: '15%',
    sortable: true
  },
  {
    key: 'readingTime',
    label: 'Length',
    type: 'custom',
    width: '15%',
    sortable: false
  },
  {
    key: 'createdAt',
    label: 'Date',
    type: 'date',
    width: '25%',
    sortable: true
  }
];

// Common action configurations
export const createUserActions = (
  editHandler: (user: any) => void,
  viewProfileHandler: (user: any) => void
): TableAction[] => [
  {
    label: 'Edit',
    color: 'primary',
    handler: editHandler,
    isMainAction: true
  },
  {
    label: 'View Profile',
    color: 'secondary',
    handler: viewProfileHandler
  }
];

export const createSubmissionActions = (
  changeAuthorHandler: (submission: any) => void
): TableAction[] => [
  {
    label: 'Change Author',
    color: 'warning',
    handler: changeAuthorHandler
  }
];

export const createPublishedPostActions = (
  editHandler: (post: any) => void,
  unpublishHandler: (post: any) => void,
  publishHandler: (post: any) => void,
  deleteHandler: (post: any) => void,
  featureHandler?: (post: any) => void,
  unfeatureHandler?: (post: any) => void
): TableAction[] => [
  {
    label: 'Edit',
    color: 'primary',
    handler: editHandler
  },
  {
    label: 'Feature',
    color: 'success',
    condition: (post) => post.status === 'published' && !post.isFeatured && !!featureHandler,
    handler: featureHandler || (() => {})
  },
  {
    label: 'Unfeature',
    color: 'warning',
    condition: (post) => post.status === 'published' && post.isFeatured && !!unfeatureHandler,
    handler: unfeatureHandler || (() => {})
  },
  {
    label: 'Unpublish',
    color: 'warning',
    condition: (post) => post.status === 'published',
    handler: unpublishHandler
  },
  {
    label: 'Configure & Publish',
    color: 'primary',
    condition: (post) => post.status === 'draft' || post.status === 'accepted',
    handler: publishHandler,
    isMainAction: true
  },
  {
    label: 'Delete',
    color: 'danger',
    handler: deleteHandler
  }
];

export const createPendingReviewActions = (
  reviewHandler: (submission: any) => void
): TableAction[] => [
  {
    label: 'Review',
    color: 'primary',
    handler: reviewHandler,
    isMainAction: true
  }
];

export const createReadyToPublishActions = (
  configurePublishingHandler: (submission: any) => void
): TableAction[] => [
  {
    label: 'Configure & Publish',
    color: 'primary',
    handler: configurePublishingHandler,
    isMainAction: true
  }
];

// User Submissions Table Configuration (for user profile)
export const USER_SUBMISSIONS_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'title',
    label: 'Title & Notes',
    type: 'custom',
    width: '35%',
    sortable: true
  },
  {
    key: 'submissionType',
    label: 'Type',
    type: 'badge',
    width: '20%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    width: '20%',
    sortable: true
  },
  {
    key: 'submittedAt',
    label: 'Date',
    type: 'date',
    width: '25%',
    sortable: true
  }
];

export const createUserSubmissionActions = (
  resubmitHandler: (submission: any) => void
): TableAction[] => [
  {
    label: 'Resubmit',
    color: 'warning',
    handler: resubmitHandler,
    condition: (submission) => submission.status === 'needs_revision',
    isMainAction: true
  }
];

// Prompts Table Configuration
export const PROMPTS_TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'title',
    label: 'Title & Description',
    type: 'custom',
    width: '55%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'custom',
    width: '20%',
    sortable: false
  },
  {
    key: 'createdAt',
    label: 'Created',
    type: 'date',
    width: '25%',
    sortable: true
  }
];

export const createPromptActions = (
  editHandler: (prompt: any) => void,
  toggleStatusHandler: (prompt: any) => void,
  deleteHandler: (prompt: any) => void
): TableAction[] => [
  {
    label: 'Edit',
    color: 'primary',
    handler: editHandler,
    isMainAction: true
  },
  {
    label: 'Toggle Status',
    color: 'secondary',
    handler: toggleStatusHandler
  },
  {
    label: 'Delete',
    color: 'danger',
    handler: deleteHandler
  }
];

// Badge configurations - Using CSS custom properties for consistent theming
export const SUBMISSION_BADGE_CONFIG = {
  'pending': 'tag tag-yellow',
  [SUBMISSION_STATUS.PENDING_REVIEW]: 'tag tag-orange',
  [SUBMISSION_STATUS.IN_PROGRESS]: 'tag tag-blue',
  [SUBMISSION_STATUS.NEEDS_REVISION]: 'tag tag-purple',
  [SUBMISSION_STATUS.RESUBMITTED]: 'tag tag-blue',
  'under_review': 'tag tag-blue',
  [SUBMISSION_STATUS.SHORTLISTED]: 'tag tag-purple',
  [SUBMISSION_STATUS.ACCEPTED]: 'tag tag-emerald',
  'ready_to_publish': 'tag tag-green',
  [SUBMISSION_STATUS.PUBLISHED]: 'tag tag-green',
  [SUBMISSION_STATUS.REJECTED]: 'tag tag-red',
  [SUBMISSION_STATUS.DRAFT]: 'tag tag-gray',
  'poem': 'tag tag-purple',
  'prose': 'tag tag-blue',
  'story': 'tag tag-blue',
  'article': 'tag tag-blue',
  'opinion': 'tag tag-red',
  'book_review': 'tag tag-green',
  'cinema_essay': 'tag tag-purple',
  'other': 'tag tag-gray'
};

export const USER_BADGE_CONFIG = {
  'admin': 'tag tag-red',
  'reviewer': 'tag tag-blue',
  'writer': 'tag tag-purple',
  'user': 'tag tag-gray'
};