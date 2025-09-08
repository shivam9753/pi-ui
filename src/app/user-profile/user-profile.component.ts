import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { UserProfile, PublishedWork } from '../models';
import { TypeBadgePipe } from '../pipes/type-badge.pipe';
import { PrettyLabelPipe } from '../pipes/pretty-label.pipe';
import { ProfileCompletionComponent } from '../profile-completion/profile-completion.component';
import { SUBMISSION_STATUS, SubmissionStatus } from '../shared/constants/api.constants';

// Interfaces
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
  imports: [CommonModule, FormsModule, RouterModule, TypeBadgePipe, PrettyLabelPipe, ProfileCompletionComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class UserProfileComponent implements OnInit {
  // Core data
  userProfile = signal<UserProfile | null>(null);
  submissions = signal<Submission[]>([]);
  drafts = signal<Draft[]>([]);
  
  // UI state
  isEditMode = signal(false);
  showProfileEditor = signal(false);
  activeTab = signal<'published' | 'submissions' | 'drafts' | ''>('');
  selectedSubmission = signal<Submission | null>(null);
  openDraftMenu = signal<string>('');
  
  // Loading states
  isLoading = signal(true);
  submissionsLoading = signal(false);
  draftsLoading = signal(false);
  loadingMoreSubmissions = signal(false);
  error = signal<string | null>(null);
  
  // Filters and sorts
  submissionsFilter = signal('');
  submissionsSort = signal('newest');
  draftsFilter = signal('');
  draftsSort = signal('newest');
  
  // Tab filtering
  activeSubmissionTab = signal<string>('all');
  
  // Pagination state
  submissionsPage = signal(0);
  submissionsLimit = signal(5);
  hasMoreSubmissions = signal(true);
  totalSubmissions = signal(0);
  
  // Constants for template
  readonly SUBMISSION_STATUS = SUBMISSION_STATUS;
  
  // This page is ALWAYS the user's own profile - public profiles use public-author-profile component
  isOwnProfile = computed(() => true);

  // Edit form
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
      emailNotifications: true,
      publicProfile: true
    }
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    // This component is ALWAYS for the current user's own profile
    // Public profiles use the public-author-profile component
    this.loadOwnProfile();
  }

  /**
   * Load current user's own profile with all data (submissions, drafts, etc.)
   */
  async loadOwnProfile() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      console.log('🔍 loadOwnProfile: Starting to load profile...');
      
      this.backendService.getCurrentUserProfileFromAPI().subscribe({
        next: (response: any) => {
          console.log('✅ Profile loaded successfully:', response);
          this.userProfile.set(response.profile);
          this.resetEditForm();
          
          console.log('🔍 About to call loadSubmissions, isOwnProfile():', this.isOwnProfile());
          
          // Load all data for own profile
          this.loadSubmissions();
          this.loadDrafts();
          
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading own profile:', error);
          
          if (error.status === 401 || error.status === 403) {
            // Clear auth token manually since clearAuthToken may not exist
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user');
            this.error.set('Please log in to view your profile');
            setTimeout(() => this.router.navigate(['/login']), 1500);
          } else {
            this.error.set('Error loading profile');
          }
          
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Exception in loadOwnProfile:', error);
      this.error.set('Error loading profile');
      this.isLoading.set(false);
    }
  }

  /**
   * Load another user's profile (public view only)
   */
  async loadUserProfile(userId: string) {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      this.backendService.getUserProfile(userId).subscribe({
        next: (response: any) => {
          this.userProfile.set(response.profile);
          
          // For other users, show only basic profile info
          
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading user profile:', error);
          this.error.set('User not found or error loading profile');
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Exception in loadUserProfile:', error);
      this.error.set('Error loading profile');
      this.isLoading.set(false);
    }
  }


  /**
   * Load user's submissions with pagination
   */
  async loadSubmissions() {
    try {
      this.submissionsLoading.set(true);
      this.submissionsPage.set(0);
      console.log('🔄 Loading user submissions...');
      
      const options = {
        limit: this.submissionsLimit(),
        skip: 0
      };
      
      console.log('🔄 Making API call with options:', options);
      
      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          console.log('✅ getUserSubmissions response:', response);
          console.log('📊 Submissions array:', response.submissions);
          console.log('📈 Submissions count:', response.submissions?.length || 0);
          console.log('🔢 Total count:', response.total);
          
          const submissions = response.submissions || [];
          this.submissions.set(submissions);
          this.totalSubmissions.set(response.total || submissions.length);
          this.hasMoreSubmissions.set(submissions.length >= this.submissionsLimit());
          this.submissionsLoading.set(false);
        },
        error: (error: any) => {
          console.error('❌ Error loading submissions:', error);
          this.submissions.set([]);
          this.hasMoreSubmissions.set(false);
          this.submissionsLoading.set(false);
        }
      });
    } catch (error) {
      console.error('💥 Exception in loadSubmissions:', error);
      this.submissions.set([]);
      this.hasMoreSubmissions.set(false);
      this.submissionsLoading.set(false);
    }
  }

  /**
   * Load more submissions (pagination)
   */
  async loadMoreSubmissions() {
    if (this.loadingMoreSubmissions() || !this.hasMoreSubmissions()) return;
    
    try {
      this.loadingMoreSubmissions.set(true);
      const nextPage = this.submissionsPage() + 1;
      console.log('🔄 Loading more submissions... Page:', nextPage);
      
      const options = {
        limit: this.submissionsLimit(),
        skip: nextPage * this.submissionsLimit()
      };
      
      this.backendService.getUserSubmissions(options).subscribe({
        next: (response: any) => {
          console.log('✅ Load more submissions response:', response);
          
          const newSubmissions = response.submissions || [];
          const currentSubmissions = this.submissions();
          const allSubmissions = [...currentSubmissions, ...newSubmissions];
          
          this.submissions.set(allSubmissions);
          this.submissionsPage.set(nextPage);
          this.hasMoreSubmissions.set(newSubmissions.length >= this.submissionsLimit());
          this.loadingMoreSubmissions.set(false);
        },
        error: (error: any) => {
          console.error('❌ Error loading more submissions:', error);
          this.loadingMoreSubmissions.set(false);
        }
      });
    } catch (error) {
      console.error('💥 Exception in loadMoreSubmissions:', error);
      this.loadingMoreSubmissions.set(false);
    }
  }

  /**
   * Load user's drafts
   */
  async loadDrafts() {
    
    try {
      this.draftsLoading.set(true);
      
      this.backendService.getUserDrafts().subscribe({
        next: (response: any) => {
          this.drafts.set(response.drafts || []);
          this.draftsLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading drafts:', error);
          this.drafts.set([]);
          this.draftsLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Exception in loadDrafts:', error);
      this.drafts.set([]);
      this.draftsLoading.set(false);
    }
  }

  // Helper method to reset edit form
  resetEditForm() {
    const profile = this.userProfile();
    if (profile) {
      this.editForm = {
        name: profile.name || '',
        bio: profile.bio || '',
        profileImage: profile.profileImage || '',
        socialLinks: profile.socialLinks || {
          website: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        },
        preferences: profile.preferences || {
          emailNotifications: true,
          publicProfile: true
        }
      };
    }
  }

  // Navigation helpers
  goToSubmit() {
    this.router.navigate(['/submission']);
  }

  editProfileAdvanced() {
    this.showProfileEditor.set(true);
  }

  // Utility methods for template
  formatType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  truncateTitle(title: string, maxLength: number = 50): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  getSocialUrl(platform: string, handle: string): string {
    const baseUrls = {
      twitter: 'https://twitter.com/',
      instagram: 'https://instagram.com/',
      linkedin: 'https://linkedin.com/in/',
      website: handle.startsWith('http') ? '' : 'https://'
    };
    return (baseUrls[platform as keyof typeof baseUrls] || '') + handle;
  }

  // Computed methods for filtering and sorting
  getAllSubmissionsChronological() {
    const submissions = this.submissions();
    return [...submissions].sort((a, b) => 
      new Date(b.createdAt || b.submittedAt).getTime() - new Date(a.createdAt || a.submittedAt).getTime()
    );
  }

  getFilteredSubmissions() {
    let submissions = this.getAllSubmissionsChronological();
    
    // Apply tab filter
    const activeTab = this.activeSubmissionTab();
    if (activeTab !== 'all') {
      if (activeTab === 'under-review') {
        submissions = submissions.filter(s => 
          ['pending_review', 'in_progress', 'resubmitted'].includes(s.status)
        );
      } else if (activeTab === 'published') {
        submissions = submissions.filter(s => s.status === 'published');
      } else if (activeTab === 'needs-revision') {
        submissions = submissions.filter(s => s.status === 'needs_revision');
      } else if (activeTab === 'rejected') {
        submissions = submissions.filter(s => s.status === 'rejected');
      } else if (activeTab === 'accepted') {
        submissions = submissions.filter(s => s.status === 'accepted');
      }
    }
    
    // Apply search filter
    const filter = this.submissionsFilter().toLowerCase();
    if (filter) {
      submissions = submissions.filter(submission => 
        submission.title.toLowerCase().includes(filter) ||
        submission.submissionType.toLowerCase().includes(filter) ||
        submission.status.toLowerCase().includes(filter)
      );
    }
    
    return submissions;
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeSubmissionTab.set(tab);
  }

  // Get count for each status
  getStatusCount(status: string): number {
    const submissions = this.submissions();
    if (status === 'all') return submissions.length;
    if (status === 'under-review') {
      return submissions.filter(s => 
        ['pending_review', 'in_progress', 'resubmitted'].includes(s.status)
      ).length;
    }
    return submissions.filter(s => s.status === status).length;
  }

  getFilteredDrafts() {
    let drafts = this.drafts();
    
    // Apply filter
    const filter = this.draftsFilter().toLowerCase();
    if (filter) {
      drafts = drafts.filter(draft => 
        draft.title.toLowerCase().includes(filter) ||
        draft.type.toLowerCase().includes(filter)
      );
    }
    
    // Apply sort
    const sort = this.draftsSort();
    if (sort === 'newest') {
      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === 'oldest') {
      drafts.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else if (sort === 'alphabetical') {
      drafts.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return drafts;
  }

  // Refresh methods
  refreshSubmissions() {
    this.submissionsPage.set(0);
    this.hasMoreSubmissions.set(true);
    this.loadSubmissions();
  }


  refreshDrafts() {
    this.loadDrafts();
  }

  // Profile editor callback
  onProfileSaved(event: any) {
    this.showProfileEditor.set(false);
    this.loadOwnProfile(); // Reload profile data
  }

  // Template helper methods that are referenced in the HTML
  hasSocialLinks(): boolean {
    const profile = this.userProfile();
    if (!profile?.socialLinks) return false;
    
    const links = profile.socialLinks;
    return !!(links.website || links.twitter || links.linkedin || links.instagram);
  }

  getCurrentUserId(): string | null {
    const currentUser = this.backendService.getCurrentUserProfile();
    return currentUser?._id || null;
  }

  onImageError(event: any) {
    // Handle profile image load errors
    event.target.style.display = 'none';
  }

  getPostViews(): number {
    // Get total views from profile stats if available
    const profile = this.userProfile();
    return profile?.stats?.totalViews || 0;
  }

  showReviewModal(submission: Submission) {
    this.selectedSubmission.set(submission);
  }

  handleSubmissionAction(action: string, submission: Submission) {
    if (action === 'view') {
      // Navigate to submission view
      if (submission.status === 'published' && submission.publishedWorkId) {
        // Published submissions go to reading interface
        this.router.navigate(['/read', submission.publishedWorkId]);
      } else {
        // All other submissions go to edit-submission in view mode
        this.router.navigate(['/edit-submission', submission._id], { 
          queryParams: { mode: 'view' } 
        });
      }
    } else if (action === 'edit') {
      // Navigate to edit submission 
      this.router.navigate(['/edit-submission', submission._id]);
    }
  }

  cleanHtml(html: string): string {
    // Simple HTML tag removal for display
    return html ? html.replace(/<[^>]*>/g, '') : '';
  }

  getTruncatedDescription(submission: Submission): string {
    const text = submission.excerpt || submission.content || '';
    const plainText = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  }

  getFormattedStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending_review': 'Pending Review',
      'in_progress': 'In Review', 
      'resubmitted': 'Resubmitted',
      'shortlisted': 'Shortlisted',
      'accepted': 'Ready to Publish',
      'published': 'Published',
      'rejected': 'Rejected',
      'needs_revision': 'Needs Revision',
      'draft': 'Draft'
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
}