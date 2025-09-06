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

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, PrettyLabelPipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  analyticsData: AnalyticsData | null = null;
  loading = true;
  error: string | null = null;

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

  loadAnalyticsData() {
    this.loading = true;
    this.error = null;

    // Use getPublishedContent method like published-posts component for published content
    this.backendService.getPublishedContent('', { 
      limit: 100,
      skip: 0
    }).subscribe({
      next: (response) => {
        this.processSubmissionsForAnalytics(response.submissions || []);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading analytics data:', error);
        if (error.status === 401) {
          this.error = 'Authentication required. Please ensure you are logged in with admin/reviewer privileges.';
        } else if (error.status === 403) {
          this.error = 'Access denied. You need admin or reviewer permissions to view analytics.';
        } else {
          this.error = `Failed to load analytics data: ${error.message || 'Unknown error'}`;
        }
        this.loading = false;
      }
    });
  }

  private processSubmissionsForAnalytics(submissions: any[]) {
    // Calculate total stats
    const totalViews = submissions.reduce((sum: number, post: any) => sum + (post.viewCount || 0), 0);
    const totalPosts = submissions.length;
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    // Get top posts by view count
    const topPosts = [...submissions]
      .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10)
      .map((post: any) => ({
        _id: post._id,
        title: post.title,
        author: post.userId?.name || post.userId?.username || 'Unknown',
        viewCount: post.viewCount || 0,
        recentViews: post.recentViews || 0,
        submissionType: post.submissionType,
        publishedAt: post.publishedAt,
        slug: post.seo?.slug || post._id
      }));

    // Get recent trending posts (posts with high recent views)
    const recentTrending = [...submissions]
      .filter((post: any) => post.recentViews > 0)
      .sort((a: any, b: any) => (b.recentViews || 0) - (a.recentViews || 0))
      .slice(0, 10)
      .map((post: any) => ({
        _id: post._id,
        title: post.title,
        author: post.userId?.name || post.userId?.username || 'Unknown',
        recentViews: post.recentViews || 0,
        trendingScore: this.calculateTrendingScore(post.recentViews || 0, post.viewCount || 0),
        submissionType: post.submissionType,
        publishedAt: post.publishedAt,
        slug: post.seo?.slug || post._id
      }));

    // Calculate post type statistics
    const postTypeStats = this.calculatePostTypeStats(submissions);

    // Generate views over time data (mock for now - would need historical data)
    const viewsOverTime = this.generateViewsOverTimeData(submissions);

    this.analyticsData = {
      totalViews,
      totalPosts,
      avgViewsPerPost,
      topPosts,
      recentTrending,
      viewsOverTime,
      postTypeStats
    };
  }

  private processBackendAnalyticsData(data: any) {
    // Process data from the backend analytics overview API
    const totalViews = data.totalViews || 0;
    const totalPosts = data.totalPosts || 0;
    const avgViewsPerPost = data.avgViewsPerPost || 0;

    // Process top posts
    const topPosts = (data.topPosts || []).map((post: any) => ({
      _id: post._id,
      title: post.title,
      author: post.userId?.name || post.userId?.username || 'Unknown',
      viewCount: post.viewCount || 0,
      recentViews: post.recentViews || 0,
      submissionType: post.submissionType,
      publishedAt: post.publishedAt,
      slug: post.seo?.slug || post._id
    }));

    // Process trending posts
    const recentTrending = (data.trendingPosts || []).map((post: any) => ({
      _id: post._id,
      title: post.title,
      author: post.userId?.name || post.userId?.username || 'Unknown',
      recentViews: post.recentViews || 0,
      trendingScore: post.trendingScore || 0,
      submissionType: post.submissionType,
      publishedAt: post.publishedAt,
      slug: post.seo?.slug || post._id
    }));

    // Process post type statistics
    const postTypeStats = (data.postTypeStats || []).map((stat: any) => ({
      type: stat._id || 'Unknown',
      count: stat.count || 0,
      totalViews: stat.totalViews || 0,
      avgViews: Math.round(stat.avgViews || 0)
    }));

    // Generate views over time data from recent activity or mock data
    const viewsOverTime = this.processRecentActivityData(data.recentActivity || []);

    this.analyticsData = {
      totalViews,
      totalPosts,
      avgViewsPerPost,
      topPosts,
      recentTrending,
      viewsOverTime,
      postTypeStats
    };
  }

  private processRecentActivityData(recentActivity: any[]): ViewsTimeData[] {
    if (recentActivity.length > 0) {
      // Convert backend activity data to chart format
      return recentActivity.map(activity => ({
        date: activity._id,
        views: activity.views || 0
      }));
    }

    // Fallback to mock data if no recent activity
    return this.generateViewsOverTimeData([]);
  }

  private calculateTrendingScore(recentViews: number, totalViews: number): number {
    if (totalViews === 0) return 0;
    return Math.round((recentViews / totalViews) * 100);
  }

  private calculatePostTypeStats(submissions: any[]): PostTypeStats[] {
    const typeMap = new Map<string, { count: number, totalViews: number }>();
    
    submissions.forEach(post => {
      const type = post.submissionType || 'Unknown';
      const views = post.viewCount || 0;
      
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, totalViews: 0 });
      }
      
      const stats = typeMap.get(type)!;
      stats.count++;
      stats.totalViews += views;
    });

    return Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      totalViews: stats.totalViews,
      avgViews: Math.round(stats.totalViews / stats.count)
    })).sort((a, b) => b.totalViews - a.totalViews);
  }

  private generateViewsOverTimeData(submissions: any[]): ViewsTimeData[] {
    // Generate last 30 days of data based on submission publish dates
    const days = 30;
    const data: ViewsTimeData[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate views for posts published on this date (simplified)
      const postsOnDate = submissions.filter(sub => {
        if (!sub.publishedAt) return false;
        const pubDate = new Date(sub.publishedAt).toISOString().split('T')[0];
        return pubDate === dateStr;
      });
      
      const views = postsOnDate.reduce((sum, post) => sum + (post.viewCount || 0), 0);
      
      data.push({
        date: dateStr,
        views: views || Math.floor(Math.random() * 5) + 1 // Small fallback for empty days
      });
    }
    
    return data;
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

  refresh() {
    this.loadAnalyticsData();
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
    return this.analyticsData.viewsOverTime.slice(-7); // Last 7 days
  }

  getMaxDayViews(): number {
    const recentDays = this.getRecentDaysData();
    return Math.max(...recentDays.map(d => d.views), 1);
  }

  getMaxTypeViews(): number {
    if (!this.analyticsData?.postTypeStats) return 1;
    return Math.max(...this.analyticsData.postTypeStats.map(s => s.totalViews), 1);
  }
}