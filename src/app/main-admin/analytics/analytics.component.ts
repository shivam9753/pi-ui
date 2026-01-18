import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';

interface TopPost {
  _id: string;
  title: string;
  author: string;
  viewCount: number;
  recentViews?: number;
  slug?: string;
}

interface PostTypeStats {
  type: string;
  posts: number;
  views: number;
  totalViews?: number;
  avgViews?: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  // Minimal state for the simplified screen
  topPeriod: 'week' | 'all' = 'week';
  typesPeriod: 'week' | 'all' = 'week';

  topPosts: TopPost[] = [];
  postTypeStats: PostTypeStats[] = [];

  // Overview
  totalViews?: number;
  loadingOverview = false;

  loadingTop = false;
  loadingTypes = false;

  constructor(private readonly backendService: BackendService) {}

  ngOnInit(): void {
    this.fetchOverview();
    this.fetchTopContent();
    this.fetchContentTypes();
  }

  setTopPeriod(p: 'week' | 'all') {
    this.topPeriod = p;
    this.fetchTopContent();
  }

  setTypesPeriod(p: 'week' | 'all') {
    this.typesPeriod = p;
    this.fetchContentTypes();
  }

  private fetchOverview() {
    this.loadingOverview = true;
    this.backendService.getAnalyticsOverview().subscribe({
      next: (res: any) => {
        const payload = res?.data || res || {};
        const overview = payload.overview ?? payload.data?.overview ?? payload;
        this.totalViews = Number(overview.totalViews ?? overview.total_views ?? payload.totalViews ?? 0) || 0;
        this.loadingOverview = false;
      },
      error: (err) => {
        console.error('Failed to load analytics overview', err);
        this.totalViews = 0;
        this.loadingOverview = false;
      }
    });
  }

  private fetchTopContent() {
    this.loadingTop = true;
    const period = this.topPeriod === 'week' ? 'week' : 'all';
    this.backendService.getTopContent({ period, limit: 10 }).subscribe({
      next: (res: any) => {
        const payload = res?.data || res || {};
        this.topPosts = Array.isArray(payload.top) ? payload.top : (payload.top || []);
        this.loadingTop = false;
      },
      error: (err) => {
        console.error('Failed to load top content', err);
        this.topPosts = [];
        this.loadingTop = false;
      }
    });
  }

  private fetchContentTypes() {
    this.loadingTypes = true;
    const period = this.typesPeriod === 'week' ? 'week' : 'all';
    this.backendService.getContentTypeAnalytics({ period }).subscribe({
      next: (res: any) => {
        const payload = res?.data || res || {};
        this.postTypeStats = Array.isArray(payload.breakdown) ? payload.breakdown : (payload.breakdown || payload.types || []);
        this.loadingTypes = false;
      },
      error: (err) => {
        console.error('Failed to load content types', err);
        this.postTypeStats = [];
        this.loadingTypes = false;
      }
    });
  }

  formatNumber(n: any): string {
    if (n === null || n === undefined) return '0';
    const num = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(num)) return String(n || '0');
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  }
}