// Just add these imports at the top
import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { UserProfile, PublishedWork } from '../models';
import { TypeBadgePipe } from '../pipes/type-badge.pipe';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';
import { ProfileCompletionComponent } from '../profile-completion/profile-completion.component';
import { SUBMISSION_STATUS, SubmissionStatus } from '../shared/constants/api.constants';
import { SUBMISSION_BADGE_CONFIG } from '../shared/components/data-table/table-configs';

// Add interfaces for new data types
interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  publishedWorkId?: string;
  excerpt?: string;
  content: string;
  tags: string[];
  reviewFeedback?: string;
  wordCount?: number;
  revisionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  slug?: string;
  seo?: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

interface Draft {
  id: string;
  title: string;
  type: string;
  content: string;
  excerpt?: string;
  tags: string[];
  wordCount?: number;
  updatedAt: string;
  createdAt: string;
}

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, FormsModule, RouterModule, TypeBadgePipe, PrettyLabelPipe, EmptyStateComponent, LoadingStateComponent, StatusBadgeComponent, DataTableComponent, ProfileCompletionComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  @Input() userId?: string;
  
  userProfile = signal<UserProfile | null>(null);
  publishedWorks = signal<PublishedWork[]>([]);
  submissions = signal<Submission[]>([]);
  drafts = signal<Draft[]>([]);
  
  isEditMode = signal(false);
  isFollowing = signal(false);
  showProfileEditor = signal(false);
  
  // Tab management
  activeTab = signal<'published' | 'submissions' | 'drafts' | ''>('');
  
  // Filters and sorts
  worksFilter = signal('');
  worksSort = signal('newest');
  submissionsFilter = signal('');
  submissionsSort = signal('newest');
  draftsFilter = signal('');
  draftsSort = signal('newest');
  
  // Constants for template usage
  readonly SUBMISSION_STATUS = SUBMISSION_STATUS;
  readonly badgeConfig = SUBMISSION_BADGE_CONFIG;
  
  // Loading states
  isLoading = signal(true);
  worksLoading = signal(false);
  submissionsLoading = signal(false);
  draftsLoading = signal(false);
  error = signal<string | null>(null);
  
  // UI state
  openDraftMenu = signal<string>('');
  
  editForm: any = {
    name: '',
    bio: '',
    profileImage: '',
    socialLinks: {
      website: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    },
    preferences: {
      showEmail: false,
      showStats: true,
      allowMessages: true
    }
  };

  // Computed properties
  filteredWorks = computed(() => {
    let works = this.publishedWorks();
    
    const filter = this.worksFilter();
    if (filter) {
      works = works.filter(work => work.submissionType === filter);
    }
    
    const sort = this.worksSort();
    works.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case 'popular':
          return b.viewCount - a.viewCount;
        case 'title':
          return a.title.localeCompare(b.title);
        default: // newest
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });
    
    return works;
  });

  filteredSubmissions = computed(() => {
    let submissions = this.submissions();
    
    const filter = this.submissionsFilter();
    if (filter) {
      submissions = submissions.filter(sub => sub.status === filter);
    }
    
    const sort = this.submissionsSort();
    submissions.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'status':
          const statusOrder: { [key: string]: number } = { 
            [SUBMISSION_STATUS.PENDING_REVIEW]: 0, 
            [SUBMISSION_STATUS.IN_PROGRESS]: 1,
            [SUBMISSION_STATUS.RESUBMITTED]: 2,
            [SUBMISSION_STATUS.NEEDS_REVISION]: 3,
            [SUBMISSION_STATUS.ACCEPTED]: 4, 
            [SUBMISSION_STATUS.PUBLISHED]: 5, 
            [SUBMISSION_STATUS.REJECTED]: 6,
            [SUBMISSION_STATUS.DRAFT]: 7
          };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default: // newest
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
    });
    
    return submissions;
  });

  filteredDrafts = computed(() => {
    let drafts = this.drafts();
    
    const filter = this.draftsFilter();
    if (filter) {
      drafts = drafts.filter(draft => draft.type === filter);
    }
    
    const sort = this.draftsSort();
    drafts.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'title':
          return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        default: // newest
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    
    return drafts;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const userId = params['id'] || this.userId;
      if (userId) {
        // User ID provided in route - load specific user profile
        this.loadUserProfile(userId);
        this.loadPublishedWorks(userId);
        this.checkFollowStatus(userId);
        
        // Load additional data - for now always load to test
        this.loadSubmissions();
        this.loadDrafts();
      } else {
        // No user ID in route - load current user's profile
        this.loadCurrentUserProfile();
      }
    });
  }

  // Load current logged-in user's profile
  async loadCurrentUserProfile() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      // Try to get current user's profile from API first
      this.backendService.getCurrentUserProfileFromAPI().subscribe({
        next: (response: any) => {
          const profile = response.profile;
          this.userProfile.set(profile);
          this.resetEditForm();
          
          // Load additional data with user ID
          this.loadPublishedWorks(profile._id);
          this.loadSubmissions();
          this.loadDrafts();
          
          this.isLoading.set(false);
        },
        error: (error: any) => {
          
          // Fallback: try to get from localStorage
          const currentUser = this.backendService.getCurrentUserProfile();
          if (currentUser && currentUser._id) {
            // Load profile data using current user's ID from localStorage
            this.loadUserProfile(currentUser._id);
            this.loadPublishedWorks(currentUser._id);
            
            // Load user-specific data (submissions and drafts)
            this.loadSubmissions();
            this.loadDrafts();
          } else {
            // If no current user, redirect to login
            this.error.set('Please log in to view your profile');
            this.isLoading.set(false);
            setTimeout(() => this.router.navigate(['/login']), 2000);
          }
        }
      });
    } catch (error) {
      this.error.set('Failed to load your profile');
      this.isLoading.set(false);
    }
  }

  // Existing methods (keeping all the original functionality)
  async loadUserProfile(userId: string) {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      this.backendService.getUserProfile(userId).subscribe({
        next: (response: any) => {
          this.userProfile.set(response.profile);
          this.resetEditForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.error.set('Failed to load user profile');
          this.isLoading.set(false);
          
          this.backendService.getUserById(userId).subscribe({
            next: (response: any) => {
              this.userProfile.set(response.user);
              this.resetEditForm();
              this.isLoading.set(false);
            },
            error: (fallbackError: any) => {
              this.error.set('User not found');
              this.isLoading.set(false);
            }
          });
        }
      });
    } catch (error) {
      this.error.set('Failed to load user profile');
      this.isLoading.set(false);
    }
  }

  async loadPublishedWorks(userId: string) {
    try {
      this.worksLoading.set(true);
      
      const options = {
        limit: 20,
        sortBy: 'publishedAt',
        order: 'desc' as 'desc'
      };
      
      this.backendService.getUserPublishedWorks(userId, options).subscribe({
        next: (response: any) => {
          this.publishedWorks.set(response.works || []);
          this.worksLoading.set(false);
        },
        error: (error: any) => {
          this.publishedWorks.set([]);
          this.worksLoading.set(false);
        }
      });
    } catch (error) {
      this.publishedWorks.set([]);
      this.worksLoading.set(false);
    }
  }

  // NEW METHODS for submissions and drafts

  async loadSubmissions() {
    try {
      this.submissionsLoading.set(true);
      
      // Load actual submissions from API
      this.backendService.getUserSubmissions().subscribe({
        next: (response: any) => {
          this.submissions.set(response.submissions || []);
          this.submissionsLoading.set(false);
        },
        error: (error: any) => {
          this.submissions.set([]);
          this.submissionsLoading.set(false);
        }
      });
    } catch (error) {
      this.submissions.set([]);
      this.submissionsLoading.set(false);
    }
  }

  async loadDrafts() {
    try {
      this.draftsLoading.set(true);
      
      this.backendService.getUserDrafts().subscribe({
        next: (response: any) => {
          // Transform backend draft format to component format
          const transformedDrafts = (response.drafts || []).map((draft: any) => ({
            id: draft._id,
            title: draft.title || 'Untitled Draft',
            type: draft.submissionType,
            content: draft.contents?.[0]?.body || '',
            excerpt: draft.description || '',
            tags: draft.contents?.[0]?.tags || [],
            wordCount: this.calculateWordCount(draft),
            updatedAt: draft.lastEditedAt || draft.updatedAt,
            createdAt: draft.createdAt
          }));
          
          this.drafts.set(transformedDrafts);
          this.draftsLoading.set(false);
        },
        error: (error: any) => {
          this.drafts.set([]);
          this.draftsLoading.set(false);
        }
      });
    } catch (error) {
      this.drafts.set([]);
      this.draftsLoading.set(false);
    }
  }

  private calculateWordCount(draft: any): number {
    let totalWords = 0;
    
    if (draft.title) {
      totalWords += draft.title.trim().split(/\s+/).length;
    }
    
    if (draft.contents && Array.isArray(draft.contents)) {
      draft.contents.forEach((content: any) => {
        if (content.title) {
          totalWords += content.title.trim().split(/\s+/).length;
        }
        if (content.body) {
          totalWords += content.body.trim().split(/\s+/).length;
        }
      });
    }
    
    if (draft.description) {
      totalWords += draft.description.trim().split(/\s+/).length;
    }
    
    return totalWords;
  }

  checkFollowStatus(userId: string) {
    if (!this.isOwnProfile()) {
      this.backendService.checkFollowStatus(userId).subscribe({
        next: (response: any) => {
          this.isFollowing.set(response.isFollowing);
        },
        error: (error: any) => {
          this.isFollowing.set(false);
        }
      });
    }
  }

  refreshDrafts() {
    this.loadDrafts();
  }

  refreshSubmissions() {
    this.loadSubmissions();
  }

  refreshPublishedWorks() {
    
  }

  isOwnProfile(): boolean {
    const profile = this.userProfile();
    if (!profile) return false;
    
    // Multiple ways to check if this is the user's own profile
    const currentUser = this.backendService.getCurrentUserProfile();
    
    // Method 1: Check if IDs match
    if (currentUser && currentUser._id === profile._id) {
      return true;
    }
    
    // Method 2: Check if no userId is provided in route (means current user)
    if (!this.userId) {
      return true;
    }
    
    // Method 3: Use the backend service method
    const isOwn = this.backendService.isOwnProfile(profile._id);
    
    console.log('Profile ownership check:', {
      profileId: profile._id,
      currentUserId: currentUser?._id,
      routeUserId: this.userId,
      backendCheck: isOwn,
      finalResult: isOwn
    });
    
    return isOwn;
  }

  // Filter and sort methods
  applyWorksFilter() {
    const profile = this.userProfile();
    if (profile) {
      const options = {
        limit: 20,
        type: this.worksFilter() || undefined,
        sortBy: this.getSortField(),
        order: this.getSortOrder()
      };
      
      this.worksLoading.set(true);
      this.backendService.getUserPublishedWorks(profile._id, options).subscribe({
        next: (response: any) => {
          this.publishedWorks.set(response.works || []);
          this.worksLoading.set(false);
        },
        error: (error: any) => {
          this.worksLoading.set(false);
        }
      });
    }
  }

  applySubmissionsFilter() {
    // Filters are automatically applied through computed signals
    // But you can add API calls here if needed for server-side filtering
  }

  applyDraftsFilter() {
    // Filters are automatically applied through computed signals
    // But you can add API calls here if needed for server-side filtering
  }

  private getSortField(): string {
    const sort = this.worksSort();
    switch (sort) {
      case 'popular': return 'viewCount';
      case 'title': return 'title';
      case 'oldest': return 'publishedAt';
      default: return 'publishedAt';
    }
  }

  private getSortOrder(): 'asc' | 'desc' {
    const sort = this.worksSort();
    switch (sort) {
      case 'oldest': return 'asc';
      case 'title': return 'asc';
      default: return 'desc';
    }
  }

  // Status helper methods
  getStatusClass(status: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case SUBMISSION_STATUS.PUBLISHED:
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case SUBMISSION_STATUS.ACCEPTED:
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case SUBMISSION_STATUS.PENDING_REVIEW:
        return `${baseClasses} bg-amber-100 text-amber-800 border border-yellow-200`;
      case SUBMISSION_STATUS.IN_PROGRESS:
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case SUBMISSION_STATUS.NEEDS_REVISION:
        return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
      case SUBMISSION_STATUS.RESUBMITTED:
        return `${baseClasses} bg-purple-100 text-purple-800 border border-purple-200`;
      case SUBMISSION_STATUS.REJECTED:
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
      case SUBMISSION_STATUS.DRAFT:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case SUBMISSION_STATUS.PUBLISHED:
        return 'bg-green-500';
      case SUBMISSION_STATUS.ACCEPTED:
        return 'bg-blue-500';
      case SUBMISSION_STATUS.PENDING_REVIEW:
        return 'bg-yellow-500';
      case SUBMISSION_STATUS.IN_PROGRESS:
        return 'bg-blue-500';
      case SUBMISSION_STATUS.NEEDS_REVISION:
        return 'bg-orange-500';
      case SUBMISSION_STATUS.RESUBMITTED:
        return 'bg-purple-500';
      case SUBMISSION_STATUS.REJECTED:
        return 'bg-red-500';
      case SUBMISSION_STATUS.DRAFT:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case SUBMISSION_STATUS.PUBLISHED:
        return 'Published';
      case SUBMISSION_STATUS.ACCEPTED:
        return 'Accepted';
      case SUBMISSION_STATUS.PENDING_REVIEW:
        return 'Pending Review';
      case SUBMISSION_STATUS.IN_PROGRESS:
        return 'In Progress';
      case SUBMISSION_STATUS.NEEDS_REVISION:
        return 'Needs Revision';
      case SUBMISSION_STATUS.RESUBMITTED:
        return 'Resubmitted';
      case SUBMISSION_STATUS.REJECTED:
        return 'Rejected';
      case SUBMISSION_STATUS.DRAFT:
        return 'Draft';
      default:
        return 'Unknown';
    }
  }

  // Action methods for submissions
  editSubmission(submission: Submission) {
    // Navigate to edit submission page
    this.router.navigate(['/edit-submission', submission._id], { queryParams: { action: 'edit' } });
  }

  resubmitSubmission(submission: Submission) {
    // For needs_revision status, navigate to edit submission page with resubmit action
    this.router.navigate(['/edit-submission', submission._id], { queryParams: { action: 'resubmit' } });
  }

  viewSubmissionDetails(submission: Submission) {
    // Navigate to read interface or admin review page
    if (submission.status === SUBMISSION_STATUS.PUBLISHED && submission.publishedWorkId) {
      // Check if submission has slug for SEO-friendly URL
      if (submission.slug) {
        this.router.navigate(['/post', submission.slug]);
      } else if (submission.seo?.slug) {
        this.router.navigate(['/post', submission.seo.slug]);
      } else {
        // Fallback to ID if no slug available
        this.router.navigate(['/read', submission.publishedWorkId]);
      }
    } else {
      // For non-published submissions, show details in a modal or navigate to review page
      // TODO: Implement submission details modal
    }
  }

  deleteSubmission(submission: Submission) {
    if (submission.status !== SUBMISSION_STATUS.DRAFT && submission.status !== SUBMISSION_STATUS.NEEDS_REVISION) {
      alert('Only draft and revision submissions can be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${submission.title}"? This action cannot be undone.`)) {
      this.backendService.deleteSubmission(submission._id).subscribe({
        next: () => {
          // Remove from local state
          const updatedSubmissions = this.submissions().filter(s => s._id !== submission._id);
          this.submissions.set(updatedSubmissions);
        },
        error: (error) => {
          alert('Failed to delete submission. Please try again.');
        }
      });
    }
  }

  // Helper methods to check submission status and available actions based on user requirements
  canEdit(submission: Submission): boolean {
    // Edit for pending review or needs revision
    const editableStatuses: SubmissionStatus[] = [SUBMISSION_STATUS.PENDING_REVIEW, SUBMISSION_STATUS.NEEDS_REVISION];
    return editableStatuses.includes(submission.status);
  }

  canResubmit(submission: Submission): boolean {
    // Allow resubmit for needs_revision (this is separate from edit)
    return submission.status === SUBMISSION_STATUS.NEEDS_REVISION;
  }

  canDelete(submission: Submission): boolean {
    // Delete only for rejected submissions
    return submission.status === SUBMISSION_STATUS.REJECTED;
  }

  canView(submission: Submission): boolean {
    // View for published, draft, accepted, in_progress
    const viewableStatuses: SubmissionStatus[] = [SUBMISSION_STATUS.PUBLISHED, SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.ACCEPTED, SUBMISSION_STATUS.IN_PROGRESS];
    return viewableStatuses.includes(submission.status);
  }

  getActionButtons(submission: Submission): Array<{label: string, action: string, class: string}> {
    const buttons: Array<{label: string, action: string, class: string}> = [];

    if (this.canView(submission)) {
      buttons.push({
        label: 'View',
        action: 'view',
        class: 'btn-secondary text-sm'
      });
    }

    if (this.canEdit(submission)) {
      buttons.push({
        label: 'Edit',
        action: 'edit',
        class: 'btn-secondary text-sm'
      });
    }

    if (this.canResubmit(submission)) {
      buttons.push({
        label: 'Resubmit',
        action: 'resubmit',
        class: 'btn-primary text-sm'
      });
    }

    if (this.canDelete(submission)) {
      buttons.push({
        label: 'Delete',
        action: 'delete',
        class: 'btn-danger text-sm'
      });
    }

    return buttons;
  }

  handleSubmissionAction(action: string, submission: Submission) {
    switch (action) {
      case 'view':
        this.viewSubmissionDetails(submission);
        break;
      case 'edit':
        this.editSubmission(submission);
        break;
      case 'resubmit':
        this.resubmitSubmission(submission);
        break;
      case 'delete':
        this.deleteSubmission(submission);
        break;
      default:
    }
  }

  getButtonClass(action: string): string {
    switch (action) {
      case 'view':
        return 'text-blue-700 hover:text-white hover:bg-blue-600 border-blue-300 bg-blue-50';
      case 'edit':
        return 'text-green-700 hover:text-white hover:bg-green-600 border-green-300 bg-green-50';
      case 'resubmit':
        return 'text-amber-700 hover:text-white hover:bg-orange-600 border-orange-300 bg-orange-50';
      case 'delete':
        return 'text-red-700 hover:text-white hover:bg-red-600 border-red-300 bg-red-50';
      default:
        return 'text-gray-700 hover:text-white hover:bg-gray-600 border-gray-300 bg-gray-50';
    }
  }

  // Action methods for drafts
  editDraft(draft: Draft) {
    // Navigate to submit page with draft data populated
    this.router.navigate(['/submission'], { queryParams: { draft: draft.id } });
  }

  submitDraft(draft: Draft) {
    // Navigate to submit page with draft data populated and ready for submission
    this.router.navigate(['/submission'], { queryParams: { draft: draft.id, submit: true } });
  }

  toggleDraftMenu(draftId: string) {
    this.openDraftMenu.set(this.openDraftMenu() === draftId ? '' : draftId);
  }

  duplicateDraft(draft: Draft) {
    // TODO: Create a copy of the draft
    // Add API call to duplicate draft
  }

  renameDraft(draft: Draft) {
    // TODO: Open rename modal or inline editing
    const newTitle = prompt('Enter new title:', draft.title);
    if (newTitle && newTitle.trim()) {
      // Update draft title
      // Add API call to rename draft
    }
  }

  deleteDraft(draft: Draft) {
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      this.backendService.deleteDraft(draft.id).subscribe({
        next: () => {
          // Remove from local state
          const updatedDrafts = this.drafts().filter(d => d.id !== draft.id);
          this.drafts.set(updatedDrafts);
        },
        error: (error) => {
          alert('Failed to delete draft. Please try again.');
        }
      });
    }
  }

  // Existing methods (keeping all original functionality)
  toggleEditMode() {
    this.isEditMode.update(mode => !mode);
    if (this.isEditMode()) {
      this.resetEditForm();
    }
  }

  resetEditForm() {
    const profile = this.userProfile();
    if (profile) {
      this.editForm = {
        name: profile.name || '',
        bio: profile.bio || '',
        profileImage: profile.profileImage || '',
        socialLinks: {
          website: profile.socialLinks?.website || '',
          twitter: profile.socialLinks?.twitter || '',
          instagram: profile.socialLinks?.instagram || '',
          linkedin: profile.socialLinks?.linkedin || ''
        },
        preferences: {
          showEmail: profile.preferences?.showEmail || false,
          showStats: profile.preferences?.showStats !== false,
          allowMessages: profile.preferences?.allowMessages !== false
        }
      };
    }
  }

  async saveProfile() {
    const profile = this.userProfile();
    if (!profile) return;

    try {
      const updateData = {
        name: this.editForm.name,
        bio: this.editForm.bio,
        profileImage: this.editForm.profileImage,
        socialLinks: this.editForm.socialLinks,
        preferences: this.editForm.preferences
      };

      this.backendService.updateUserProfile(profile._id, updateData).subscribe({
        next: (response: any) => {
          this.userProfile.set(response.user);
          this.isEditMode.set(false);
          
          const currentUser = this.backendService.getCurrentUserProfile();
          if (currentUser && currentUser._id === profile._id) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        },
        error: (error: any) => {
          this.error.set('Failed to update profile');
        }
      });
    } catch (error) {
      this.error.set('Failed to update profile');
    }
  }

  cancelEdit() {
    this.isEditMode.set(false);
    this.resetEditForm();
  }

  editProfileAdvanced() {
    // Show the inline profile editor instead of navigating
    this.showProfileEditor.set(true);
  }

  onProfileSaved(updatedProfile: any) {
    // Update the local profile data
    const currentProfile = this.userProfile();
    if (currentProfile) {
      const mergedProfile = {
        ...currentProfile,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        profileImage: updatedProfile.profileImage
      };
      this.userProfile.set(mergedProfile);
    }
    
    // Hide the profile editor
    this.showProfileEditor.set(false);
    
    // Show success message or handle as needed
  }

  onProfileCancelled() {
    // Hide the profile editor
    this.showProfileEditor.set(false);
  }

  toggleFollow() {
    const profile = this.userProfile();
    if (!profile) return;

    const currentFollowStatus = this.isFollowing();
    const action = currentFollowStatus ? 'unfollow' : 'follow';

    this.backendService.toggleFollowUser(profile._id, action).subscribe({
      next: (response: any) => {
        this.isFollowing.set(response.isFollowing);
        
        const updatedProfile = { ...profile };
        if (updatedProfile.stats) {
          const increment = response.isFollowing ? 1 : -1;
          updatedProfile.stats.followers = Math.max(0, updatedProfile.stats.followers + increment);
          this.userProfile.set(updatedProfile);
        }
      },
      error: (error: any) => {
        this.error.set(`Failed to ${action} user`);
      }
    });
  }

  openMessageModal() {
  }

  hasSocialLinks(): boolean {
    const profile = this.userProfile();
    return !!(profile?.socialLinks?.website || 
             profile?.socialLinks?.twitter || 
             profile?.socialLinks?.instagram || 
             profile?.socialLinks?.linkedin);
  }

  formatNumber(num?: number): string {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  trackByWorkId(index: number, work: PublishedWork): string {
    return work._id;
  }

  trackBySubmissionId(index: number, submission: Submission): string {
    return submission._id;
  }

  trackByDraftId(index: number, draft: Draft): string {
    return draft.id;
  }

  onPublishedWorkCardClick(work: PublishedWork) {
    // Navigate to read the published work using slug if available
    if (work.slug) {
      this.router.navigate(['/post', work.slug]);
    } else if (work.seo?.slug) {
      this.router.navigate(['/post', work.seo.slug]);
    } else if (work._id) {
      // Fallback to ID if no slug available
      this.router.navigate(['/read', work._id]);
    }
  }

  getSocialUrl(platform: string, value: string): string {
    switch (platform) {
      case 'twitter':
        return value.startsWith('@') ? `https://twitter.com/${value.substring(1)}` : `https://twitter.com/${value}`;
      case 'instagram':
        return value.startsWith('@') ? `https://instagram.com/${value.substring(1)}` : `https://instagram.com/${value}`;
      case 'linkedin':
        return value.startsWith('http') ? value : `https://linkedin.com/in/${value}`;
      default:
        return value.startsWith('http') ? value : `https://${value}`;
    }
  }

  clearError() {
    this.error.set(null);
  }

  onImageError(event: any) {
    // Hide the broken image and show the initials instead
    const profile = this.userProfile();
    if (profile) {
      profile.profileImage = '';
      this.userProfile.set(profile);
    }
  }

  // Utility method to clean HTML from text content
  cleanHtml(text: string): string {
    if (!text) return '';
    
    // Remove HTML tags and decode HTML entities
    const div = document.createElement('div');
    div.innerHTML = text;
    let cleanText = div.textContent || div.innerText || '';
    
    // Clean up extra whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  }

  // Get submission type badge styling
  getTypeBadgeClass(type: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 text-xs font-medium rounded-full';
    switch (type?.toLowerCase()) {
      case 'poem':
        return `${baseClasses} bg-purple-100 text-purple-800 border border-purple-200`;
      case 'prose':
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'article':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case 'book_review':
        return `${baseClasses} bg-indigo-100 text-indigo-800 border border-indigo-200`;
      case 'cinema_essay':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
      case 'opinion':
        return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  }

  // Format submission type for display
  formatType(type: string): string {
    if (!type) return 'Unknown';
    
    const formatted = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return formatted;
  }

  // Empty state action methods
  goToSubmit(): void {
    this.router.navigate(['/submission']);
  }

  // Stats methods for the new profile header
  getPostViews(): string {
    // Calculate total post views from published works
    const totalViews = this.publishedWorks().reduce((sum, work) => sum + (work.viewCount || 0), 0);
    return this.formatStatNumber(totalViews);
  }

  getReadingScore(): string {
    // Calculate a reading score based on publications and engagement
    const publications = this.publishedWorks().length;
    const totalViews = this.publishedWorks().reduce((sum, work) => sum + (work.viewCount || 0), 0);
    
    // Simple reading score algorithm: publications weight + views weight
    const score = Math.round((publications * 10) + (totalViews * 0.1));
    return this.formatStatNumber(score);
  }

  private formatStatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
  }

  // Dashboard-specific methods
  getPendingCount(): number {
    return this.submissions().filter(sub => sub.status === SUBMISSION_STATUS.PENDING_REVIEW).length;
  }

  getInReviewCount(): number {
    return this.submissions().filter(sub => sub.status === SUBMISSION_STATUS.IN_PROGRESS).length;
  }

  getAcceptedCount(): number {
    return this.submissions().filter(sub => sub.status === SUBMISSION_STATUS.ACCEPTED).length;
  }

  getNeedsRevisionCount(): number {
    return this.submissions().filter(sub => sub.status === SUBMISSION_STATUS.NEEDS_REVISION).length;
  }

  getRecentActivity(): any[] {
    const activities: any[] = [];
    
    // Add recent submissions
    this.submissions().slice(0, 5).forEach(submission => {
      activities.push({
        id: submission._id + '_submitted',
        type: 'submitted',
        message: 'You submitted a new work',
        submissionTitle: submission.title,
        timestamp: submission.submittedAt
      });
      
      if (submission.reviewedAt) {
        activities.push({
          id: submission._id + '_reviewed',
          type: 'reviewed',
          message: submission.status === SUBMISSION_STATUS.ACCEPTED ? 'Your work was accepted' : 
                   submission.status === SUBMISSION_STATUS.REJECTED ? 'Your work needs revision' :
                   'Your work was reviewed',
          submissionTitle: submission.title,
          timestamp: submission.reviewedAt
        });
      }
    });

    // Add recent publications
    this.publishedWorks().slice(0, 3).forEach(work => {
      activities.push({
        id: work._id + '_published',
        type: 'published',
        message: 'Your work was published',
        submissionTitle: work.title,
        timestamp: work.publishedAt
      });
    });

    // Sort by timestamp, most recent first
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'submitted':
        return 'flex h-8 w-8 items-center justify-center rounded-full bg-blue-500';
      case 'reviewed':
        return 'flex h-8 w-8 items-center justify-center rounded-full bg-purple-500';
      case 'published':
        return 'flex h-8 w-8 items-center justify-center rounded-full bg-green-500';
      case 'revision':
        return 'flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500';
      default:
        return 'flex h-8 w-8 items-center justify-center rounded-full bg-gray-500';
    }
  }

  getRecentSubmissions(): Submission[] {
    return this.submissions()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);
  }

  getActionItems(): any[] {
    const items: any[] = [];
    
    // Add items that need revision
    const needsRevision = this.submissions().filter(sub => sub.status === SUBMISSION_STATUS.NEEDS_REVISION);
    if (needsRevision.length > 0) {
      items.push({
        type: 'revision',
        count: needsRevision.length,
        message: `${needsRevision.length} submission(s) need revision`,
        action: () => this.viewNeedsRevision()
      });
    }

    return items;
  }

  viewNeedsRevision(): void {
    this.submissionsFilter.set(SUBMISSION_STATUS.NEEDS_REVISION);
    this.activeTab.set('submissions');
  }

  // Recent Submissions Table Configuration
  getRecentSubmissionsColumns(): any[] {
    return [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        width: '35%',
        sortable: false
      },
      {
        key: 'status',
        label: 'Status',
        type: 'badge',
        width: '20%',
        sortable: false
      },
      {
        key: 'submissionType',
        label: 'Type',
        type: 'badge',
        width: '20%',
        sortable: false
      },
      {
        key: 'submittedAt',
        label: 'Date',
        type: 'date',
        width: '15%',
        sortable: false
      }
    ];
  }

  getRecentSubmissionsActions(): any[] {
    return [
      {
        label: 'Edit',
        color: 'warning',
        condition: (submission: any) => submission.status === SUBMISSION_STATUS.NEEDS_REVISION,
        handler: (submission: any) => this.editSubmissionForRevision(submission)
      }
    ];
  }

  editSubmissionForRevision(submission: any): void {
    // Navigate to edit-submission component
    this.router.navigate(['/edit-submission', submission._id]);
  }
}