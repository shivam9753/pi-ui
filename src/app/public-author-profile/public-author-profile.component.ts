import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../services/backend.service';
import { LoadingStateComponent } from '../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../shared/components';

interface FeaturedWork {
  _id: string;
  title: string;
  excerpt?: string;
  slug?: string;
  publishedAt: string;
  featuredAt?: string;
  type?: string;
  submissionType?: string;
  tags?: string[];
  viewCount?: number;
  readingTime?: number;
  body?: string;
  isFeatured?: boolean;
  author?: {
    _id: string;
    name: string;
    username?: string;
  };
}

interface AuthorProfile {
  _id: string;
  name: string;
  bio?: string;
  profileImage?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
  };
  joinedDate?: string;
  totalFeaturedWorks?: number;
}

@Component({
  selector: 'app-public-author-profile',
  imports: [CommonModule, TitleCasePipe, LoadingStateComponent, EmptyStateComponent, ButtonComponent],
  templateUrl: './public-author-profile.component.html',
  styleUrl: './public-author-profile.component.css'
})
export class PublicAuthorProfileComponent implements OnInit {
  authorProfile = signal<AuthorProfile | null>(null);
  featuredWorks = signal<FeaturedWork[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  authorId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.authorId = params['id'];
      if (this.authorId) {
        this.loadAuthorProfile();
        this.loadAuthorWorks();
      } else {
        this.error.set('Author ID is required');
        this.isLoading.set(false);
      }
    });
  }

  loadAuthorProfile() {
    this.backendService.getUserProfile(this.authorId).subscribe({
      next: (response: any) => {
        this.authorProfile.set({
          _id: response.profile._id,
          name: response.profile.name || response.profile.username,
          bio: response.profile.bio,
          profileImage: response.profile.profileImage,
          socialLinks: response.profile.socialLinks,
          joinedDate: response.profile.createdAt,
          totalFeaturedWorks: 0 // Will be updated when works load
        });
      },
      error: (error: any) => {
        // Fallback to basic user info
        this.backendService.getUserById(this.authorId).subscribe({
          next: (response: any) => {
            this.authorProfile.set({
              _id: response.user._id,
              name: response.user.name || response.user.username,
              bio: response.user.bio,
              profileImage: response.user.profileImage,
              joinedDate: response.user.createdAt,
              totalFeaturedWorks: 0
            });
          },
          error: () => {
            this.error.set('Author not found');
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  loadAuthorWorks() {
    // Use the existing getContent method with author filter for featured content
    const params = {
      published: true,
      featured: true, // Only get featured content
      userId: this.authorId,
      limit: 100, // Get all featured works for this author
      sortBy: 'publishedAt',
      order: 'desc' as 'desc'
    };

    this.backendService.getContent(params).subscribe({
      next: (response: any) => {
        const works = response.contents || [];
        this.featuredWorks.set(works);
        
        // Update total featured works count
        const profile = this.authorProfile();
        if (profile) {
          this.authorProfile.set({
            ...profile,
            totalFeaturedWorks: works.length
          });
        }
        
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading author featured works:', error);
        this.featuredWorks.set([]);
        this.isLoading.set(false);
      }
    });
  }

  navigateToWork(work: FeaturedWork) {
    if (work.slug) {
      this.router.navigate(['/post', work.slug]);
    } else {
      this.router.navigate(['/content', work._id]);
    }
  }

  getWorkTypeColor(work: FeaturedWork): string {
    const type = work.type || work.submissionType || 'unknown';
    const typeColors: { [key: string]: string } = {
      'poetry': 'bg-purple-100 text-purple-800',
      'prose': 'bg-blue-100 text-blue-800',
      'opinion': 'bg-orange-100 text-orange-800',
      'story': 'bg-green-100 text-green-800',
      'essay': 'bg-indigo-100 text-indigo-800'
    };
    
    return typeColors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  getWorkType(work: FeaturedWork): string {
    return work.type || work.submissionType || 'Article';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getProfileImageUrl(profileImage?: string): string {
    if (!profileImage) {
      return '/assets/images/default-avatar.png';
    }
    
    // Handle different image URL formats
    if (profileImage.startsWith('http')) {
      return profileImage;
    }
    
    // Assume it's a relative path or filename
    return `/assets/uploads/${profileImage}`;
  }

  openSocialLink(url: string) {
    window.open(url, '_blank');
  }

  goToExplore() {
    this.router.navigate(['/explore']);
  }
}