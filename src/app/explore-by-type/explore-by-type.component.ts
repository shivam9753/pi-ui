import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { BackendService } from '../backend.service';

interface Submission {
  _id: string;
  title: string;
  submissionType: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  readingTime: number;
  tags: string[];
  author: {
    _id: string;
    username: string;
    profileImage?: string;
  };
}

@Component({
  selector: 'app-explore-by-type',
  imports: [CommonModule, RouterLink],
  templateUrl: './explore-by-type.component.html',
  styleUrl: './explore-by-type.component.css'
})
export class ExploreByTypeComponent {
  submissions = signal<Submission[]>([]);
  submissionType = signal<string>('');
  isLoading = signal(true);
  isLoadingMore = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  hasMore = signal(true);
  totalCount = signal(0);

  // Computed values
  featuredSubmission = computed(() => this.submissions()[0] || null);
  otherSubmissions = computed(() => this.submissions().slice(1));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const type = params['type'];
      if (type) {
        this.submissionType.set(type);
        this.resetAndLoad();
      }
    });
  }

  resetAndLoad() {
    this.submissions.set([]);
    this.currentPage.set(1);
    this.hasMore.set(true);
    this.error.set(null);
    this.loadSubmissions();
  }

  loadSubmissions() {
    this.isLoading.set(this.currentPage() === 1);
    this.isLoadingMore.set(this.currentPage() > 1);

    const params = {
      type: this.submissionType(),
      limit: 20,
      skip: (this.currentPage() - 1) * 20
    };

    this.backendService.getPublishedContent(this.submissionType()).subscribe({
      next: (response: any) => {
        const newSubmissions = response.submissions || response.content || [];
        
        if (this.currentPage() === 1) {
          this.submissions.set(newSubmissions);
        } else {
          this.submissions.update(current => [...current, ...newSubmissions]);
        }
        
        this.totalCount.set(response.total || newSubmissions.length);
        this.hasMore.set(newSubmissions.length === 20);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: (error: any) => {
        console.error('Error loading submissions:', error);
        this.error.set('Failed to load submissions');
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  loadMore() {
    if (!this.hasMore() || this.isLoadingMore()) return;
    
    this.currentPage.update(page => page + 1);
    this.loadSubmissions();
  }

  retry() {
    this.error.set(null);
    this.resetAndLoad();
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  trackBySubmissionId(index: number, submission: Submission): string {
    return submission._id;
  }
}

