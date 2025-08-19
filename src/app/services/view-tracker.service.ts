import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../shared/constants/api.constants';

export interface ViewResponse {
  success: boolean;
  viewCount: number;
  recentViews: number;
  windowStartTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class ViewTrackerService {
  private readonly STORAGE_KEY_PREFIX = 'viewed_';
  private readonly TRENDING_WINDOW_DAYS = 7; // 7-day rolling window

  constructor(private apiService: ApiService) {}

  /**
   * Log a view for a post - implements rolling window trending logic
   */
  logView(postId: string): Observable<ViewResponse> {
    const viewKey = `${this.STORAGE_KEY_PREFIX}${postId}`;

    if (this.hasViewedInSession(viewKey)) {
      return of({ success: false, viewCount: 0, recentViews: 0, windowStartTime: '' });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      windowDays: this.TRENDING_WINDOW_DAYS
    };

    return this.apiService.post(API_ENDPOINTS.SUBMISSIONS_NESTED.VIEW(postId), payload, false).pipe(
      map((response: any) => ({
        success: true,
        viewCount: response.viewCount || 0,
        recentViews: response.recentViews || 0,
        windowStartTime: response.windowStartTime || ''
      })),
      tap(() => this.markAsViewed(viewKey)),
      catchError(() => of({ success: false, viewCount: 0, recentViews: 0, windowStartTime: '' }))
    );
  }

  /**
   * Get trending posts (sorted by recent views) with pagination
   */
  getTrendingPosts(limit: number = 10, skip: number = 0): Observable<{submissions: any[], total: number}> {
    const params = {
      sortBy: 'trending',
      limit: limit.toString(),
      skip: skip.toString(),
      windowDays: this.TRENDING_WINDOW_DAYS.toString()
    };

    return this.apiService.get(API_ENDPOINTS.SUBMISSIONS + '/trending', params, false).pipe(
      map((response: any) => ({
        submissions: response.submissions || [],
        total: response.total || 0
      })),
      catchError(() => of({ submissions: [], total: 0 }))
    );
  }

  /**
   * Get view statistics for a post
   */
  getPostStats(postId: string): Observable<{viewCount: number, recentViews: number, trendingScore: number}> {
    return this.apiService.get(API_ENDPOINTS.SUBMISSIONS_NESTED.STATS(postId), undefined, false).pipe(
      map((response: any) => ({
        viewCount: response.viewCount || 0,
        recentViews: response.recentViews || 0,
        trendingScore: this.calculateTrendingScore(response.recentViews || 0, response.viewCount || 0)
      })),
      catchError(() => of({ viewCount: 0, recentViews: 0, trendingScore: 0 }))
    );
  }

  /**
   * Calculate trending score (recent views / total views ratio)
   */
  private calculateTrendingScore(recentViews: number, totalViews: number): number {
    if (totalViews === 0) return 0;
    return Math.round((recentViews / totalViews) * 100); // Percentage of recent activity
  }

  private hasViewedInSession(viewKey: string): boolean {
    try {
      return sessionStorage.getItem(viewKey) === 'true';
    } catch {
      return false;
    }
  }

  private markAsViewed(viewKey: string): void {
    try {
      sessionStorage.setItem(viewKey, 'true');
    } catch {
      // Silent fail if sessionStorage unavailable
    }
  }
}