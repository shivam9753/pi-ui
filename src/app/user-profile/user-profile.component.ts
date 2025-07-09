// Just add these imports at the top
import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, RouterLink } from '@angular/router';
import { BackendService, UserProfile, PublishedWork } from '../backend.service';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  @Input() userId?: string;
  
  userProfile = signal<UserProfile | null>(null);
  publishedWorks = signal<PublishedWork[]>([]);
  isEditMode = signal(false);
  isFollowing = signal(false);
  worksFilter = signal('');
  worksSort = signal('newest');
  isLoading = signal(true);
  worksLoading = signal(false);
  error = signal<string | null>(null);
  
  editForm: any = {
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

  // Computed
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

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService
  ) {}

  // ONLY CHANGE: Updated ngOnInit to handle route params
  ngOnInit() {
    this.route.params.subscribe(params => {
      const userId = params['id'] || this.userId;
      if (userId) {
        this.loadUserProfile(userId);
        this.loadPublishedWorks(userId);
        this.checkFollowStatus(userId);
      }
    });
  }

  // Rest of your existing code stays exactly the same...
  async loadUserProfile(userId: string) {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      // Use the profile endpoint for enhanced stats
      this.backendService.getUserProfile(userId).subscribe({
        next: (response:any) => {
          this.userProfile.set(response.profile);
          this.resetEditForm();
          this.isLoading.set(false);
        },
        error: (error:any) => {
          console.error('Error loading user profile:', error);
          this.error.set('Failed to load user profile');
          this.isLoading.set(false);
          
          // Fallback to regular user endpoint
          this.backendService.getUserById(userId).subscribe({
            next: (response:any) => {
              this.userProfile.set(response.user);
              this.resetEditForm();
              this.isLoading.set(false);
            },
            error: (fallbackError:any) => {
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
        next: (response:any) => {
          this.publishedWorks.set(response.works || []);
          this.worksLoading.set(false);
        },
        error: (error:any) => {
          console.error('Error loading published works:', error);
          // Don't show error for works, just set empty array
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

  checkFollowStatus(userId: string) {
    if (!this.isOwnProfile()) {
      this.backendService.checkFollowStatus(userId).subscribe({
        next: (response:any) => {
          this.isFollowing.set(response.isFollowing);
        },
        error: (error:any) => {
          console.error('Error checking follow status:', error);
          // Default to not following
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
          showStats: profile.preferences?.showStats !== false, // default to true
          allowMessages: profile.preferences?.allowMessages !== false // default to true
        }
      };
    }
  }

  async saveProfile() {
    const profile = this.userProfile();
    if (!profile) return;

    try {
      const updateData = {
        bio: this.editForm.bio,
        profileImage: this.editForm.profileImage,
        socialLinks: this.editForm.socialLinks,
        preferences: this.editForm.preferences
      };

      this.backendService.updateUserProfile(profile._id, updateData).subscribe({
        next: (response:any) => {
          // Update the local profile with the response
          this.userProfile.set(response.user);
          this.isEditMode.set(false);
          
          // Also update localStorage if this is the current user
          const currentUser = this.backendService.getCurrentUserProfile();
          if (currentUser && currentUser._id === profile._id) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        },
        error: (error:any) => {
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
      next: (response:any) => {
        this.isFollowing.set(response.isFollowing);
        
        // Update the follower count in the profile
        const updatedProfile = { ...profile };
        if (updatedProfile.stats) {
          const increment = response.isFollowing ? 1 : -1;
          updatedProfile.stats.followers = Math.max(0, updatedProfile.stats.followers + increment);
          this.userProfile.set(updatedProfile);
        }
      },
      error: (error:any) => {
        console.error('Error toggling follow:', error);
        this.error.set(`Failed to ${action} user`);
      }
    });
  }

  openMessageModal() {
    // Implement messaging functionality
    console.log('Open message modal');
    // You can implement a modal service or routing to a message page
  }

  applyWorksFilter() {
    // Filters are automatically applied through computed signals
    // But we might want to reload with new filters from API
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
        next: (response:any) => {
          this.publishedWorks.set(response.works || []);
          this.worksLoading.set(false);
        },
        error: (error:any) => {
          console.error('Error filtering works:', error);
          this.worksLoading.set(false);
        }
      });
    }
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

  // Helper method to get social link URL
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

  // Clear error message
  clearError() {
    this.error.set(null);
  }
}