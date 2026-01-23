import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmptyStateComponent, LoadingStateComponent } from '../../shared/components';
import { ButtonComponent } from '../../ui-components/button/button.component';
import { BackendService } from '../../services/backend.service';
import { SendEmailModalComponent, EmailData } from '../../main-admin/submissions/review-submission/send-email-modal.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

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
  imports: [CommonModule, TitleCasePipe, LoadingStateComponent, EmptyStateComponent, ButtonComponent, SendEmailModalComponent],
  templateUrl: './public-author-profile.component.html',
  styleUrl: './public-author-profile.component.css'
})
export class PublicAuthorProfileComponent implements OnInit, OnDestroy {
  // Track admin state from AuthService (updates when user observable emits)
  isAdminSignal = signal(false);
  private userSub?: Subscription;
  authorProfile = signal<AuthorProfile | null>(null);
  featuredWorks = signal<FeaturedWork[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  authorId = '';
  // Email modal state for admin
  showEmailModal = signal(false);
  isSendingEmail = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
    , private authService: AuthService
    , private toastService: ToastService
  ) {}

  ngOnInit() {
    // initialize admin signal from current user if available
    const current = this.authService.getCurrentUser();
    this.isAdminSignal.set(!!(current && (current.role === 'admin' || current.role === 'reviewer')));

    // subscribe to user changes to update admin flag (handles async login)
    this.userSub = this.authService.user$.subscribe(user => {
      this.isAdminSignal.set(!!(user && (user.role === 'admin' || user.role === 'reviewer')));
    });

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

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadAuthorProfile() {
    // First try the public endpoint so unauthenticated visitors can view author profiles
    this.backendService.getUserById(this.authorId).subscribe({
      next: (response: any) => {
        this.authorProfile.set({
          _id: response.user._id,
          name: response.user.name || response.user.username,
          bio: response.user.bio,
          profileImage: response.user.profileImage,
          socialLinks: response.user.socialLinks || undefined,
          joinedDate: response.user.createdAt,
          totalFeaturedWorks: 0 // Will be updated when works load
        });

        // If the visitor is authenticated, fetch the richer profile (stats, etc.)
        const current = this.authService.getCurrentUser();
        if (current) {
          this.backendService.getUserProfile(this.authorId).subscribe({
            next: (d: any) => {
              // Merge enriched profile fields
              const existing = this.authorProfile() || {} as any;
              this.authorProfile.set({
                ...existing,
                bio: d.profile.bio || existing.bio,
                profileImage: d.profile.profileImage || existing.profileImage,
                socialLinks: d.profile.socialLinks || existing.socialLinks,
                joinedDate: d.profile.createdAt || existing.joinedDate
              });
            },
            error: (err: any) => {
              // Ignore enrichment errors for public view
              console.debug('Enrichment getUserProfile failed:', err);
            }
          });
        }
      },
      error: (error: any) => {
        // If public lookup fails, try authenticated endpoint as a last resort
        this.backendService.getUserProfile(this.authorId).subscribe({
          next: (response: any) => {
            this.authorProfile.set({
              _id: response.profile._id,
              name: response.profile.name || response.profile.username,
              bio: response.profile.bio,
              profileImage: response.profile.profileImage,
              socialLinks: response.profile.socialLinks,
              joinedDate: response.profile.createdAt,
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
      'opinion': 'bg-primary-light text-primary-dark',
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

  openEmailModal() {
    this.showEmailModal.set(true);
  }

  closeEmailModal() {
    this.showEmailModal.set(false);
  }

  // NOTE: This view should only open the send-email modal. Actual sending is handled elsewhere.
  sendEmailToAuthor(emailData: EmailData) {
    if (!this.authorProfile()) {
      this.toastService.showError('Author information missing.');
      return;
    }

    this.isSendingEmail.set(true);

    const payload = {
      subject: emailData.subject,
      message: emailData.message,
      ...(emailData.template && { template: emailData.template })
    } as any;

    this.backendService.sendEmailToUser(this.authorProfile()!._id, payload).subscribe({
      next: (resp: any) => {
        this.isSendingEmail.set(false);
        this.closeEmailModal();
        this.toastService.showSuccess(resp?.message || 'Email sent successfully.');
      },
      error: (err: any) => {
        this.isSendingEmail.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to send email. Please try again.';
        this.toastService.showError(msg);
        console.error('sendEmailToAuthor error:', err);
      }
    });
  }

  isAdmin(): boolean {
    // Prefer reactive signal (updates when auth user loads). Fall back to sync check.
    return this.isAdminSignal() || this.authService.isReviewer() || this.authService.isAdmin();
  }
}