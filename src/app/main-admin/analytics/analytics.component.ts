import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { ViewTrackerService } from '../../services/view-tracker.service';
import { AuthService } from '../../services/auth.service';
import { PrettyLabelPipe } from '../../pipes/pretty-label.pipe';
import { forkJoin } from 'rxjs';

interface AnalyticsData {
  totalViews: number;
  totalPosts: number;
  avgViewsPerPost: number;
  topPosts: TopPost[];
  recentTrending: TrendingPost[];
  viewsOverTime: ViewsTimeData[];
  postTypeStats: PostTypeStats[];
}

interface TopPost {
  _id: string;
  title: string;
  author: string;
  viewCount: number;
  recentViews: number;
  submissionType: string;
  publishedAt: Date;
  slug: string;
}

interface TrendingPost {
  _id: string;
  title: string;
  author: string;
  recentViews: number;
  trendingScore: number;
  submissionType: string;
  publishedAt: Date;
  slug: string;
}

interface ViewsTimeData {
  date: string;
  views: number;
}

interface PostTypeStats {
  type: string;
  count: number;
  totalViews: number;
  avgViews: number;
}

interface SearchAnalyticsData {
  overview: {
    totalSearches: number;
    uniqueQueries: number;
    uniqueUsers: number;
    avgResultsCount: number;
    zeroResultSearches: number;
    zeroResultRate: number;
  };
  topQueries: PopularQuery[];
  recentTrend: SearchTrendData[];
  searchTypes: SearchTypeData[];
  zeroResults: ZeroResultQuery[];
  trends: SearchTrendData[];
}

interface PopularQuery {
  query: string;
  searchCount: number;
  avgResults: number;
  uniqueUsers: number;
  lastSearched: Date;
  searchTypes: string[];
}

interface ZeroResultQuery {
  query: string;
  searchCount: number;
  uniqueUsers: number;
  lastSearched: Date;
  searchTypes: string[];
}

interface SearchTrendData {
  period: string;
  totalSearches: number;
  uniqueQueries?: number;
  uniqueUsers?: number;
  avgResultsCount?: number;
  zeroResultSearches?: number;
  zeroResultRate?: number;
}

interface SearchTypeData {
  type: string;
  count: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, PrettyLabelPipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  analyticsData: AnalyticsData | null = null;
  searchAnalyticsData: SearchAnalyticsData | null = null;
  loading = true;
  searchLoading = false;
  error: string | null = null;
  searchError: string | null = null;
  
  // Tab management
  activeTab: 'overview' | 'search' = 'overview';

  // Chart dimensions and settings
  chartWidth = 800;
  chartHeight = 400;
  barChartHeight = 300;

  constructor(
    private backendService: BackendService,
    private viewTracker: ViewTrackerService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  switchTab(tab: 'overview' | 'search') {
    this.activeTab = tab;
    if (tab === 'search' && !this.searchAnalyticsData) {
      this.loadSearchAnalyticsData();
    }
  }

  loadAnalyticsData() {
    this.loading = true;
    this.error = null;

    // Use proper analytics endpoints instead of paginated submissions API
    forkJoin({
      overview: this.backendService.getAnalyticsOverview(),
      topContent: this.backendService.getTopContent({ period: 'month', limit: 10 }),
      contentTypes: this.backendService.getContentTypeAnalytics(),
      timeSeries: this.backendService.getViewsTimeSeries({ period: 'week', groupBy: 'day' })
    }).subscribe({
      next: (data) => {
        this.processAnalyticsData(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading analytics data:', error);
        
        // Handle different error scenarios
        if (error.status === 401) {
          this.error = 'Authentication required. Please ensure you are logged in with admin/reviewer privileges.';
        } else if (error.status === 403) {
          this.error = 'Access denied. You need admin or reviewer permissions to view analytics.';
        } else if (error.status === 404) {
          this.error = 'Analytics endpoints not implemented yet. Please contact the development team to add proper analytics APIs to the backend.';
          this.showFallbackMessage();
        } else if (error.status === 500) {
          this.error = 'Server error occurred while fetching analytics. Please try again later.';
        } else {
          this.error = `Failed to load analytics data: ${error.message || 'Unknown server error'}`;
        }
        
        this.loading = false;
      }
    });
  }

  private processAnalyticsData(data: any) {
    // Process data from dedicated analytics endpoints
    const overview = data.overview;
    const topContent = data.topContent;
    const contentTypes = data.contentTypes;
    const timeSeries = data.timeSeries;

    // Top posts from analytics API
    const topPosts = (topContent.topByViews || []).map((post: any) => ({
      _id: post._id,
      title: post.title,
      author: post.author || post.userId?.name || post.userId?.username || 'Unknown',
      viewCount: post.viewCount || post.totalViews || 0,
      recentViews: post.recentViews || 0,
      submissionType: post.submissionType || post.type,
      publishedAt: post.publishedAt,
      slug: post.slug || post._id
    }));

    // Trending posts from analytics API
    const recentTrending = (topContent.trending || []).map((post: any) => ({
      _id: post._id,
      title: post.title,
      author: post.author || post.userId?.name || post.userId?.username || 'Unknown',
      recentViews: post.recentViews || 0,
      trendingScore: post.trendingScore || 0,
      submissionType: post.submissionType || post.type,
      publishedAt: post.publishedAt,
      slug: post.slug || post._id
    }));

    // Content type statistics from analytics API
    const postTypeStats = (contentTypes.types || []).map((type: any) => ({
      type: type.type,
      count: type.count,
      totalViews: type.totalViews,
      avgViews: type.avgViews
    }));

    // Time series data from analytics API
    const viewsOverTime = (timeSeries.data || []).map((point: any) => ({
      date: point.date,
      views: point.views
    }));

    this.analyticsData = {
      totalViews: overview.totalViews || 0,
      totalPosts: overview.totalPosts || 0,
      avgViewsPerPost: overview.avgViewsPerPost || 0,
      topPosts,
      recentTrending,
      viewsOverTime,
      postTypeStats
    };
  }

  loadSearchAnalyticsData() {
    this.searchLoading = true;
    this.searchError = null;

    // Load search analytics data filtered to only search-results page
    forkJoin({
      overview: this.backendService.getSearchAnalyticsOverview(30, 'search-results'),
      popular: this.backendService.getPopularSearchQueries({ days: 30, limit: 20, source: 'search-results' }),
      zeroResults: this.backendService.getZeroResultSearches({ days: 30, limit: 15, source: 'search-results' }),
      trends: this.backendService.getSearchTrends({ days: 30, groupBy: 'day', source: 'search-results' })
    }).subscribe({
      next: (data) => {
        this.processSearchAnalyticsData(data);
        this.searchLoading = false;
      },
      error: (error) => {
        console.error('Error loading search analytics data:', error);
        
        // Handle different error scenarios
        if (error.status === 401) {
          this.searchError = 'Authentication required. Please ensure you are logged in with admin/reviewer privileges.';
        } else if (error.status === 403) {
          this.searchError = 'Access denied. You need admin or reviewer permissions to view search analytics.';
        } else if (error.status === 404) {
          this.searchError = 'Search analytics endpoints not found. Please ensure the search analytics feature is properly configured.';
        } else if (error.status === 500) {
          this.searchError = 'Server error occurred while fetching search analytics. Please try again later.';
        } else {
          this.searchError = `Failed to load search analytics: ${error.message || 'Unknown server error'}`;
        }
        
        this.searchLoading = false;
      }
    });
  }

  private processSearchAnalyticsData(data: any) {
    console.log('Raw search analytics data:', data); // Debug log
    
    // Process data from search analytics endpoints
    // The backend returns { success: true, data: {...} } structure
    const overview = data.overview?.data || data.overview || {};
    const popular = data.popular?.data || data.popular || [];
    const zeroResults = data.zeroResults?.data || data.zeroResults || [];
    const trends = data.trends?.data || data.trends || [];

    this.searchAnalyticsData = {
      overview: overview.overview || overview,
      topQueries: Array.isArray(popular) ? popular : [],
      recentTrend: overview.recentTrend || [],
      searchTypes: overview.searchTypes || [],
      zeroResults: Array.isArray(zeroResults) ? zeroResults : [],
      trends: Array.isArray(trends) ? trends : []
    };

    console.log('Processed search analytics data:', this.searchAnalyticsData); // Debug log
  }




  // SVG Chart generation methods
  generateBarChart(data: PostTypeStats[]): string {
    if (!data || data.length === 0) {
      return '<div class="text-center text-gray-500 py-8">No data available</div>';
    }
    
    const maxViews = Math.max(...data.map(d => d.totalViews), 1);
    const barWidth = Math.max(40, (this.chartWidth - 40) / data.length - 10);
    const scaleFactor = (this.barChartHeight - 60) / maxViews;

    let svg = `<svg width="${this.chartWidth}" height="${this.barChartHeight}" class="analytics-chart">`;
    
    data.forEach((item, index) => {
      const x = index * (barWidth + 10) + 5;
      const barHeight = item.totalViews * scaleFactor;
      const y = this.barChartHeight - barHeight - 20;
      
      svg += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="#f97316" opacity="0.8" rx="2"/>
        <text x="${x + barWidth/2}" y="${this.barChartHeight - 5}" 
              text-anchor="middle" font-size="12" fill="#666">${item.type}</text>
        <text x="${x + barWidth/2}" y="${y - 5}" 
              text-anchor="middle" font-size="11" fill="#333">${item.totalViews}</text>
      `;
    });
    
    svg += '</svg>';
    return svg;
  }

  generateLineChart(data: ViewsTimeData[]): string {
    if (!data || data.length === 0) {
      return '<div class="text-center text-gray-500 py-8">No data available</div>';
    }
    
    const maxViews = Math.max(...data.map(d => d.views), 1);
    const pointWidth = (this.chartWidth - 80) / Math.max(data.length - 1, 1);
    const scaleFactor = (this.chartHeight - 100) / maxViews;

    let svg = `<svg width="${this.chartWidth}" height="${this.chartHeight}" class="analytics-chart">`;
    
    // Draw grid lines
    for (let i = 0; i <= 5; i++) {
      const y = 40 + i * (this.chartHeight - 80) / 5;
      svg += `<line x1="40" y1="${y}" x2="${this.chartWidth - 20}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    }

    // Draw line
    let pathD = '';
    data.forEach((point, index) => {
      const x = 40 + index * pointWidth;
      const y = this.chartHeight - 40 - (point.views * scaleFactor);
      
      if (index === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
      
      // Draw points
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="#f97316"/>`;
    });
    
    svg += `<path d="${pathD}" stroke="#f97316" stroke-width="2" fill="none"/>`;
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const y = 40 + i * (this.chartHeight - 80) / 5;
      const value = Math.round(maxViews - (i * maxViews / 5));
      svg += `<text x="35" y="${y + 4}" text-anchor="end" font-size="12" fill="#666">${value}</text>`;
    }
    
    svg += '</svg>';
    return svg;
  }

  private showFallbackMessage() {
    // Show additional context for developers
    console.warn(`
🚨 ANALYTICS MODULE ISSUE:
The analytics module is currently trying to use dedicated analytics endpoints that don't exist yet.

REQUIRED BACKEND ENDPOINTS:
- GET /analytics/overview
- GET /analytics/top-content
- GET /analytics/content-types  
- GET /analytics/views-time-series

CURRENT PROBLEM:
- Analytics was using paginated submissions API (only 100 records)
- Frontend calculations were meaningless with partial data
- Mock/fake data was being generated

SOLUTION NEEDED:
Backend team needs to implement proper analytics aggregation endpoints that:
1. Calculate totals from ALL submissions (not paginated)
2. Provide real time-series data
3. Generate proper trending calculations
4. Cache results for performance
    `);
  }

  refresh() {
    if (this.activeTab === 'overview') {
      this.loadAnalyticsData();
    } else if (this.activeTab === 'search') {
      this.loadSearchAnalyticsData();
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getRecentDaysData(): ViewsTimeData[] {
    if (!this.analyticsData?.viewsOverTime) return [];

    // Generate last 7 days from today
    const today = new Date();
    const last7Days: ViewsTimeData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Find data for this date or default to 0
      const existingData = this.analyticsData.viewsOverTime.find(d =>
        new Date(d.date).toISOString().split('T')[0] === dateStr
      );

      last7Days.push({
        date: dateStr,
        views: existingData?.views || 0
      });
    }

    return last7Days;
  }

  getMaxDayViews(): number {
    const recentDays = this.getRecentDaysData();
    return Math.max(...recentDays.map(d => d.views), 1);
  }

  getMaxTypeViews(): number {
    if (!this.analyticsData?.postTypeStats) return 1;
    return Math.max(...this.analyticsData.postTypeStats.map(s => s.totalViews), 1);
  }

  getMaxSearchVolume(): number {
    if (!this.searchAnalyticsData?.trends) return 1;
    return Math.max(...this.searchAnalyticsData.trends.map(t => t.totalSearches), 1);
  }
}