import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BackendService } from './backend.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UrlRedirectService {
  
  constructor(
    private router: Router,
    private backendService: BackendService
  ) {}

  /**
   * Handle legacy URL redirects
   * Convert old app.poemsindia.in/randomtextforposturl to app.poemsindia.in/post/randomtextforposturl
   */
  redirectLegacySlugUrl(slug: string): Observable<boolean> {
    console.log(`[URL Redirect] Attempting to redirect legacy URL: /${slug} -> /post/${slug}`);
    
    // For legacy URLs, we assume they're valid post slugs and redirect
    // The server-side redirect handles the 301 redirect for SEO
    this.router.navigate(['/post', slug], { replaceUrl: true });
    return of(true);
  }

  /**
   * Check if a URL needs to be redirected and handle it
   */
  handleUrlRedirection(url: string): Observable<boolean> {
    // Match /:slug pattern (legacy format from app.poemsindia.in/randomtextforposturl)
    const legacySlugMatch = url.match(/^\/([^\/]+)$/);
    
    if (legacySlugMatch) {
      const slug = legacySlugMatch[1];
      
      // Skip known application routes that aren't post slugs
      const knownRoutes = [
        'login', 'explore', 'submit', 'admin', 'profile', 'prompts',
        'faqs', 'contact-us', 'privacy-policy', 'terms-of-use',
        'complete-profile', 'review', 'publish', 'users', 'poem-parser', 'json-parser'
      ];
      
      if (!knownRoutes.includes(slug) && !slug.includes('.')) {
        return this.redirectLegacySlugUrl(slug);
      }
    }
    
    // No redirection needed
    return of(false);
  }

  /**
   * Generate canonical URL for a post
   */
  getCanonicalUrl(slug: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/post/${slug}`;
  }

  /**
   * Generate legacy URL for backwards compatibility
   */
  getLegacyUrl(slug: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${slug}`;
  }
}