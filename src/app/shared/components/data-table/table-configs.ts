import { TableColumn, TableAction } from './data-table.component';

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
    key: 'userId.name',
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
    key: 'createdAt',
    label: 'Created',
    type: 'date',
    width: '20%',
    sortable: true
  }
];

// Published Posts Table Configuration
export const PUBLISHED_POSTS_TABLE_COLUMNS: TableColumn[] = [
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
    type: 'custom',
    width: '15%',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    width: '12%',
    sortable: true
  },
  {
    key: 'stats',
    label: 'Stats',
    type: 'custom',
    width: '13%',
    sortable: false
  },
  {
    key: 'reviewedAt',
    label: 'Date',
    type: 'custom',
    width: '15%',
    sortable: true
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
    key: 'reviewedAt',
    label: 'Accepted',
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
    handler: editHandler
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
  deleteHandler: (post: any) => void
): TableAction[] => [
  {
    label: 'Edit',
    color: 'primary',
    condition: (post) => post.status === 'published',
    handler: editHandler
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
    condition: (post) => post.status === 'draft',
    handler: publishHandler
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
    handler: reviewHandler
  }
];

export const createReadyToPublishActions = (
  configurePublishingHandler: (submission: any) => void
): TableAction[] => [
  {
    label: 'Configure & Publish',
    color: 'primary',
    handler: configurePublishingHandler
  }
];

// Badge configurations - Using CSS custom properties for consistent theming
export const SUBMISSION_BADGE_CONFIG = {
  'pending': 'px-2 py-1 text-xs font-medium rounded-full tag tag-yellow',
  'pending_review': 'px-2 py-1 text-xs font-medium rounded-full tag tag-orange',
  'in_progress': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'needs_revision': 'px-2 py-1 text-xs font-medium rounded-full tag tag-purple',
  'resubmitted': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'under_review': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'accepted': 'px-2 py-1 text-xs font-medium rounded-full tag tag-emerald',
  'ready_to_publish': 'px-2 py-1 text-xs font-medium rounded-full tag tag-green',
  'published': 'px-2 py-1 text-xs font-medium rounded-full tag tag-green',
  'rejected': 'px-2 py-1 text-xs font-medium rounded-full tag tag-red',
  'draft': 'px-2 py-1 text-xs font-medium rounded-full tag tag-gray',
  'poem': 'px-2 py-1 text-xs font-medium rounded-full tag tag-purple',
  'prose': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'story': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'article': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'opinion': 'px-2 py-1 text-xs font-medium rounded-full tag tag-red',
  'book_review': 'px-2 py-1 text-xs font-medium rounded-full tag tag-green',
  'cinema_essay': 'px-2 py-1 text-xs font-medium rounded-full tag tag-purple',
  'other': 'px-2 py-1 text-xs font-medium rounded-full tag tag-gray'
};

export const USER_BADGE_CONFIG = {
  'admin': 'px-2 py-1 text-xs font-medium rounded-full tag tag-red',
  'reviewer': 'px-2 py-1 text-xs font-medium rounded-full tag tag-blue',
  'curator': 'px-2 py-1 text-xs font-medium rounded-full tag tag-purple',
  'user': 'px-2 py-1 text-xs font-medium rounded-full tag tag-gray'
};