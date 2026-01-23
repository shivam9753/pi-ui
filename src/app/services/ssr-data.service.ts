import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { BackendService } from './backend.service';

export interface SSRCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PostSSRData {
  post: any;
  relatedContent: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SsrDataService {
  private cache = new Map<string, SSRCacheEntry<any>>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RELATED_CONTENT_TTL = 10 * 60 * 1000; // 10 minutes for related content

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private backendService: BackendService
  ) {}

  /**
   * Check if we're running on the server
   */
  isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  /**
   * Get cached data or fetch if expired/missing
   */
  private getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Observable<T>,
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Observable<T> {
    // Only use cache on server-side
    if (this.isServer()) {
      const cached = this.cache.get(key);
      const now = Date.now();

      if (cached && now < cached.expiresAt) {
        console.log(`[SSR Cache] Hit for key: ${key}`);
        return of(cached.data);
      }

      console.log(`[SSR Cache] Miss for key: ${key}`);
      return fetchFn().pipe(
        tap(data => {
          this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttl
          });
          console.log(`[SSR Cache] Stored key: ${key}, expires in ${ttl/1000}s`);
        }),
        catchError(error => {
          console.error(`[SSR Cache] Error fetching ${key}:`, error);
          // Return cached data if available, even if expired
          if (cached) {
            console.log(`[SSR Cache] Returning stale data for: ${key}`);
            return of(cached.data);
          }
          throw error;
        })
      );
    }

    // On client-side, always fetch fresh data
    return fetchFn();
  }

  /**
   * Fetch post data for SSR
   */
  getPostForSSR(slug: string): Observable<any> {
    const cacheKey = `post:${slug}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      // Unwrap responses of the form { success, submission } so callers always get the submission object
      () => this.backendService.getSubmissionBySlug(slug).pipe(
        map((res: any) => (res && res.submission) ? res.submission : res)
      ),
      this.DEFAULT_CACHE_TTL
    );
  }

  /**
   * Fetch related content for SSR
   */
  getRelatedContentForSSR(postId: string, contentType: string, tags: string[]): Observable<any[]> {
    const cacheKey = `related:${postId}:${contentType}:${tags.slice(0,3).join(',')}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      () => {
        // Create a simple related content fetch - adjust this based on your actual API
        // For now, we'll fetch recent posts of the same type
        const params = {
          status: 'published',
          type: contentType,
          limit: 5,
          skip: 0
        };
        
        return this.http.get<any>(`${this.backendService.API_URL}/submissions`, { params })
          .pipe(
            map(response => response.submissions || []),
            map(submissions => submissions.filter((s: any) => s._id !== postId))
          );
      },
      this.RELATED_CONTENT_TTL
    );
  }

  /**
   * Fetch both post and related content for SSR in parallel
   */
  getPostWithRelatedContentForSSR(slug: string): Observable<PostSSRData> {
    return this.getPostForSSR(slug).pipe(
      switchMap(post => {
        // Start related content fetch
        const relatedContent$ = this.getRelatedContentForSSR(
          post._id,
          post.submissionType,
          post.tags || []
        );

        return forkJoin({
          post: of(post),
          relatedContent: relatedContent$.pipe(
            catchError(error => {
              console.warn('[SSR] Related content fetch failed:', error);
              return of([]); // Return empty array if related content fails
            })
          )
        });
      })
    );
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[SSR Cache] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[SSR Cache] Cleaned ${expiredKeys.length} expired entries`);
    }
  }
}