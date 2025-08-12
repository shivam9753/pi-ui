// Just add these imports at the top
import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BackendService, UserProfile, PublishedWork } from '../services/backend.service';
import { TypeBadgePipe } from '../pipes/type-badge.pipe';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component';

// Add interfaces for new data types
interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  status: 'pending_review' | 'in_progress' | 'needs_revision' | 'accepted' | 'published' | 'rejected' | 'draft';
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
  imports: [CommonModule, FormsModule, RouterModule, TypeBadgePipe, PrettyLabelPipe, EmptyStateComponent, LoadingStateComponent, StatusBadgeComponent],
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
  
  // Tab management
  activeTab = signal<'published' | 'submissions' | 'drafts'>('published');
  
  // Filters and sorts
  worksFilter = signal('');
  worksSort = signal('newest');
  submissionsFilter = signal('');
  submissionsSort = signal('newest');
  draftsFilter = signal('');
  draftsSort = signal('newest');
  
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
            'pending_review': 0, 
            'in_progress': 1,
            'needs_revision': 2,
            'accepted': 3, 
            'published': 4, 
            'rejected': 5,
            'draft': 6
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
          console.error('Error loading current user profile:', error);
          
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
      console.error('Error in loadCurrentUserProfile:', error);
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
          console.error('Error loading user profile:', error);
          this.error.set('Failed to load user profile');
          this.isLoading.set(false);
          
          this.backendService.getUserById(userId).subscribe({
            next: (response: any) => {
              this.userProfile.set(response.user);
              this.resetEditForm();
              this.isLoading.set(false);
            },
            error: (fallbackError: any) => {
              console.error('Fallback error:', fallbackError);
              this.error.set('User not found');
              this.isLoading.set(false);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
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
          console.error('Error loading published works:', error);
          this.publishedWorks.set([]);
          this.worksLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Error in loadPublishedWorks:', error);
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
          console.error('Error loading submissions:', error);
          this.submissions.set([]);
          this.submissionsLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Error in loadSubmissions:', error);
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
          console.error('Error loading drafts:', error);
          this.drafts.set([]);
          this.draftsLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Error in loadDrafts:', error);
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
          console.error('Error checking follow status:', error);
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
    
    return this.backendService.isOwnProfile(profile._id);
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
          console.error('Error filtering works:', error);
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
      case 'published':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case 'accepted':
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'pending_review':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'needs_revision':
        return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'accepted':
        return 'bg-blue-500';
      case 'pending_review':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'needs_revision':
        return 'bg-orange-500';
      case 'rejected':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'accepted':
        return 'Accepted';
      case 'pending_review':
        return 'Pending Review';
      case 'in_progress':
        return 'In Progress';
      case 'needs_revision':
        return 'Needs Revision';
      case 'rejected':
        return 'Rejected';
      case 'draft':
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
    if (submission.status === 'published' && submission.publishedWorkId) {
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
      console.log('View submission details:', submission);
    }
  }

  deleteSubmission(submission: Submission) {
    if (submission.status !== 'draft' && submission.status !== 'needs_revision') {
      alert('Only draft and revision submissions can be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${submission.title}"? This action cannot be undone.`)) {
      this.backendService.deleteSubmission(submission._id).subscribe({
        next: () => {
          // Remove from local state
          const updatedSubmissions = this.submissions().filter(s => s._id !== submission._id);
          this.submissions.set(updatedSubmissions);
          console.log('Submission deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting submission:', error);
          alert('Failed to delete submission. Please try again.');
        }
      });
    }
  }

  // Helper methods to check submission status and available actions based on user requirements
  canEdit(submission: Submission): boolean {
    // Edit for pending review or needs revision
    return ['pending_review', 'needs_revision'].includes(submission.status);
  }

  canResubmit(submission: Submission): boolean {
    // Allow resubmit for needs_revision (this is separate from edit)
    return submission.status === 'needs_revision';
  }

  canDelete(submission: Submission): boolean {
    // Delete only for rejected submissions
    return submission.status === 'rejected';
  }

  canView(submission: Submission): boolean {
    // View for published, draft, accepted, in_progress
    return ['published', 'draft', 'accepted', 'in_progress'].includes(submission.status);
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
        console.log('Unknown action:', action);
    }
  }

  getButtonClass(action: string): string {
    switch (action) {
      case 'view':
        return 'text-blue-700 hover:text-white hover:bg-blue-600 border-blue-300 bg-blue-50';
      case 'edit':
        return 'text-green-700 hover:text-white hover:bg-green-600 border-green-300 bg-green-50';
      case 'resubmit':
        return 'text-orange-700 hover:text-white hover:bg-orange-600 border-orange-300 bg-orange-50';
      case 'delete':
        return 'text-red-700 hover:text-white hover:bg-red-600 border-red-300 bg-red-50';
      default:
        return 'text-gray-700 hover:text-white hover:bg-gray-600 border-gray-300 bg-gray-50';
    }
  }

  // Action methods for drafts
  editDraft(draft: Draft) {
    // Navigate to submit page with draft data populated
    this.router.navigate(['/submit'], { queryParams: { draft: draft.id } });
  }

  submitDraft(draft: Draft) {
    // Navigate to submit page with draft data populated and ready for submission
    this.router.navigate(['/submit'], { queryParams: { draft: draft.id, submit: true } });
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
          console.log('Draft deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting draft:', error);
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
          console.error('Error updating profile:', error);
          this.error.set('Failed to update profile');
        }
      });
    } catch (error) {
      console.error('Error in saveProfile:', error);
      this.error.set('Failed to update profile');
    }
  }

  cancelEdit() {
    this.isEditMode.set(false);
    this.resetEditForm();
  }

  editProfileAdvanced() {
    // Navigate to the profile completion component for advanced editing
    this.router.navigate(['/complete-profile']);
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
        console.error('Error toggling follow:', error);
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
        return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
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
    this.router.navigate(['/submit']);
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
}