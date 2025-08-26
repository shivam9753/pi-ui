import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetaInitializerService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private http: HttpClient
  ) {}

  async initializeMetaTags(): Promise<void> {
    // Only run on server-side
    if (!isPlatformServer(this.platformId)) {
      return;
    }

    try {
      // Get the current URL path
      const url = this.document.location?.pathname || '';
      console.log('[Meta Initializer] Processing URL:', url);
      
      // Check if this is a post URL
      const postMatch = url.match(/^\/post\/(.+)$/);
      if (postMatch) {
        const slug = postMatch[1];
        console.log('[Meta Initializer] Found post slug:', slug);
        
        await this.setPostMetaTags(slug);
      }
    } catch (error) {
      console.error('[Meta Initializer] Error:', error);
    }
  }

  private async setPostMetaTags(slug: string): Promise<void> {
    try {
      // Fetch post data directly from API
      const apiUrl = `${environment.apiBaseUrl}/submissions/by-slug/${slug}`;
      console.log('[Meta Initializer] Fetching:', apiUrl);
      
      const postData = await firstValueFrom(
        this.http.get<any>(apiUrl)
      );
      
      console.log('[Meta Initializer] Got post data:', postData.title);
      
      // Set meta tags directly in document head
      this.updateMetaTag('property', 'og:title', postData.title);
      
      const description = postData.description || postData.excerpt || 
        `Read "${postData.title}" by ${postData.authorName || 'Anonymous'} on Poems in India - a curated collection of poetry and literature.`;
      this.updateMetaTag('property', 'og:description', description);
      
      this.updateMetaTag('property', 'og:type', 'article');
      this.updateMetaTag('property', 'og:url', `https://poemsindia.in/post/${slug}`);
      this.updateMetaTag('property', 'og:site_name', 'Poems in India');
      
      // Set the image URL - this is the key fix
      const imageUrl = postData.imageUrl 
        ? (postData.imageUrl.startsWith('http') ? postData.imageUrl : `https://poemsindia.in${postData.imageUrl}`)
        : 'https://poemsindia.in/assets/loginimage.jpeg';
        
      this.updateMetaTag('property', 'og:image', imageUrl);
      this.updateMetaTag('property', 'og:image:secure_url', imageUrl);
      this.updateMetaTag('property', 'og:image:width', '1200');
      this.updateMetaTag('property', 'og:image:height', '630');
      
      // Twitter Card
      this.updateMetaTag('name', 'twitter:card', 'summary_large_image');
      this.updateMetaTag('name', 'twitter:title', postData.title);
      this.updateMetaTag('name', 'twitter:description', description);
      this.updateMetaTag('name', 'twitter:image', imageUrl);
      
      // Update title
      if (this.document.title) {
        this.document.title = `${postData.title} — Poems by ${postData.authorName || 'Anonymous'} - pi`;
      }
      
      console.log('[Meta Initializer] Set meta tags for:', postData.title, 'Image:', imageUrl);
      
    } catch (error) {
      console.error('[Meta Initializer] Failed to fetch post data:', error);
    }
  }

  private updateMetaTag(attribute: 'name' | 'property', attributeValue: string, content: string): void {
    // Find existing meta tag
    let metaTag = this.document.querySelector(`meta[${attribute}="${attributeValue}"]`) as HTMLMetaElement;
    
    if (metaTag) {
      // Update existing tag
      metaTag.content = content;
    } else {
      // Create new tag
      metaTag = this.document.createElement('meta');
      metaTag.setAttribute(attribute, attributeValue);
      metaTag.content = content;
      this.document.head.appendChild(metaTag);
    }
  }
}

// Factory function for APP_INITIALIZER
export function metaInitializerFactory(metaInitializer: MetaInitializerService) {
  return () => metaInitializer.initializeMetaTags();
}