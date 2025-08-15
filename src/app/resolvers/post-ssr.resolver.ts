import { Injectable, inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SsrDataService, PostSSRData } from '../services/ssr-data.service';

export const postSSRResolver: ResolveFn<PostSSRData | null> = (
  route: ActivatedRouteSnapshot
): Observable<PostSSRData | null> => {
  const ssrDataService = inject(SsrDataService);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return of(null);
  }

  // Only fetch during SSR, client-side will handle its own data fetching
  if (ssrDataService.isServer()) {
    console.log(`[SSR Resolver] Fetching data for slug: ${slug}`);
    
    return ssrDataService.getPostWithRelatedContentForSSR(slug).pipe(
      catchError(error => {
        console.error(`[SSR Resolver] Failed to fetch data for ${slug}:`, error);
        return of(null);
      })
    );
  }

  // On client-side, return null so component handles its own fetching
  return of(null);
};