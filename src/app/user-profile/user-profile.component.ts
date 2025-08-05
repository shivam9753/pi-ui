// Just add these imports at the top
import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BackendService, UserProfile, PublishedWork } from '../services/backend.service';

// Add interfaces for new data types
interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  status: 'pending' | 'accepted' | 'published' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  publishedWorkId?: string;
  excerpt?: string;
  content: string;
  tags: string[];
  reviewFeedback?: string;
  wordCount?: number;
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
  imports: [CommonModule, FormsModule, RouterModule],
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
          const statusOrder = { 'pending': 0, 'accepted': 1, 'published': 2, 'rejected': 3 };
          return statusOrder[a.status] - statusOrder[b.status];
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
        this.loadUserProfile(userId);
        this.loadPublishedWorks(userId);
        this.checkFollowStatus(userId);
        
        // Load additional data - for now always load to test
        this.loadSubmissions();
        this.loadDrafts();
      }
    });
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
          console.error('Error loading submissions, using mock data:', error);
          // Fallback to mock data
          const mockSubmissions: Submission[] = [
        {
          _id: '1',
          title: 'The Digital Canvas',
          submissionType: 'article',
          status: 'published',
          submittedAt: '2024-01-15T10:00:00Z',
          reviewedAt: '2024-01-20T14:30:00Z',
          publishedWorkId: 'work123',
          excerpt: 'An exploration of how digital art is reshaping creative expression...',
          content: 'Full article content here...',
          tags: ['digital art', 'technology', 'creativity'],
          wordCount: 1200
        },
        {
          _id: '2',
          title: 'Midnight Reflections',
          submissionType: 'poem',
          status: 'accepted',
          submittedAt: '2024-01-10T16:45:00Z',
          reviewedAt: '2024-01-12T09:15:00Z',
          excerpt: 'A contemplative piece about the quiet hours of the night...',
          content: 'Poem content here...',
          tags: ['poetry', 'night', 'reflection'],
          reviewFeedback: 'Beautiful imagery and emotional depth. Ready for publication.',
          wordCount: 85
        },
        {
          _id: '3',
          title: 'Urban Chronicles',
          submissionType: 'prose',
          status: 'pending',
          submittedAt: '2024-01-25T12:00:00Z',
          excerpt: 'Stories from the heart of the city...',
          content: 'Prose content here...',
          tags: ['urban', 'stories', 'city life'],
          wordCount: 2500
        },
        {
          _id: '4',
          title: 'The Art of Storytelling',
          submissionType: 'article',
          status: 'rejected',
          submittedAt: '2024-01-05T08:30:00Z',
          reviewedAt: '2024-01-08T11:45:00Z',
          excerpt: 'Examining narrative techniques across different mediums...',
          content: 'Article content here...',
          tags: ['storytelling', 'narrative', 'writing'],
          reviewFeedback: 'Good concept but needs more supporting research and examples. Please revise and resubmit.',
          wordCount: 1800
        }
      ];

          this.submissions.set(mockSubmissions);
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
      
      // Placeholder data - replace with actual API call
      const mockDrafts: Draft[] = [
        {
          id: 'draft1',
          title: 'Unfinished Symphony',
          type: 'poem',
          content: 'In the quiet corners of my mind...\nWhere thoughts dance like shadows...',
          excerpt: 'A work in progress exploring the beauty of incomplete thoughts...',
          tags: ['poetry', 'work in progress', 'emotions'],
          wordCount: 45,
          updatedAt: '2024-01-28T20:15:00Z',
          createdAt: '2024-01-20T14:30:00Z'
        },
        {
          id: 'draft2',
          title: 'Tech Trends 2024',
          type: 'article',
          content: 'The landscape of technology continues to evolve at breakneck speed...',
          excerpt: 'An analysis of emerging technology trends and their impact...',
          tags: ['technology', 'trends', 'future'],
          wordCount: 680,
          updatedAt: '2024-01-27T16:45:00Z',
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 'draft3',
          title: '', // Untitled draft
          type: 'prose',
          content: 'She walked through the empty streets, her footsteps echoing...',
          tags: ['fiction', 'urban'],
          wordCount: 120,
          updatedAt: '2024-01-26T13:20:00Z',
          createdAt: '2024-01-26T13:20:00Z'
        },
        {
          id: 'draft4',
          title: 'Cinema and Society',
          type: 'cinema_essay',
          content: 'The relationship between film and social commentary has always been...',
          excerpt: 'Exploring how cinema reflects and shapes societal values...',
          tags: ['cinema', 'society', 'analysis'],
          wordCount: 430,
          updatedAt: '2024-01-25T11:30:00Z',
          createdAt: '2024-01-22T09:15:00Z'
        }
      ];

      // Simulate API delay
      setTimeout(() => {
        this.drafts.set(mockDrafts);
        this.draftsLoading.set(false);
      }, 800);

      // TODO: Replace with actual API call
      // this.backendService.getUserDrafts().subscribe({
      //   next: (response: any) => {
      //     this.drafts.set(response.drafts || []);
      //     this.draftsLoading.set(false);
      //   },
      //   error: (error: any) => {
      //     console.error('Error loading drafts:', error);
      //     this.drafts.set([]);
      //     this.draftsLoading.set(false);
      //   }
      // });
    } catch (error) {
      console.error('Error in loadDrafts:', error);
      this.drafts.set([]);
      this.draftsLoading.set(false);
    }
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
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
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
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
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
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Needs Revision';
      default:
        return 'Unknown';
    }
  }

  // Action methods for submissions
  editSubmission(submission: Submission) {
    // Navigate to submit page with submission data populated
    this.router.navigate(['/submit'], { queryParams: { edit: submission._id } });
  }

  viewSubmissionDetails(submission: Submission) {
    // TODO: Open modal or navigate to detailed view
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
      // TODO: Delete draft
      // Add API call to delete draft
      
      // Remove from local state
      const updatedDrafts = this.drafts().filter(d => d.id !== draft.id);
      this.drafts.set(updatedDrafts);
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
    // Navigate to read the published work or edit based on context
    if (work._id) {
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
}