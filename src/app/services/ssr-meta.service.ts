import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

export interface PostMetaData {
  title: string;
  description: string;
  imageUrl?: string;
  canonicalUrl: string;
  author: string;
  publishedAt: string;
  submissionType: string;
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SsrMetaService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private titleService: Title,
    private metaService: Meta
  ) {}

  isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  /**
   * Set complete meta tags for a post during SSR
   */
  setPostMetaTags(postData: any, slug: string): void {
    const metaData = this.extractMetaData(postData, slug);
    
    // Update page title
    this.titleService.setTitle(`${metaData.title} — Poems by ${metaData.author} - pi`);
    
    // Basic meta tags
    this.metaService.updateTag({ 
      name: 'description', 
      content: metaData.description 
    });
    
    this.metaService.updateTag({ 
      name: 'keywords', 
      content: `${metaData.tags.join(', ')}, poetry, literature, ${metaData.author}, Poems in India` 
    });
    
    // Open Graph tags for social media
    this.metaService.updateTag({ property: 'og:title', content: metaData.title });
    this.metaService.updateTag({ property: 'og:description', content: metaData.description });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:url', content: metaData.canonicalUrl });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Poems in India' });
    this.metaService.updateTag({ property: 'og:locale', content: 'en_US' });
    
    // WhatsApp-specific meta tags
    this.metaService.updateTag({ name: 'title', content: metaData.title });
    this.metaService.updateTag({ property: 'og:determiner', content: 'the' });
    
    // SEO meta tags
    this.metaService.updateTag({ name: 'robots', content: 'index,follow' });
    this.metaService.updateTag({ name: 'author', content: metaData.author });
    this.metaService.updateTag({ property: 'article:section', content: metaData.submissionType });
    this.metaService.updateTag({ property: 'article:published_time', content: metaData.publishedAt });
    
    // Set OG image with fallback
    const imageUrl = this.getAbsoluteImageUrl(metaData.imageUrl) || this.getDefaultSocialImage();
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:image:secure_url', content: imageUrl });
    this.metaService.updateTag({ 
      property: 'og:image:alt', 
      content: metaData.imageUrl ? `Cover image for ${metaData.title}` : 'Poems in India - Poetry & Literature' 
    });
    this.metaService.updateTag({ property: 'og:image:width', content: '1200' });
    this.metaService.updateTag({ property: 'og:image:height', content: '630' });
    this.metaService.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    
    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: metaData.title });
    this.metaService.updateTag({ name: 'twitter:description', content: metaData.description });
    this.metaService.updateTag({ name: 'twitter:site', content: '@poemsindia' });
    this.metaService.updateTag({ name: 'twitter:creator', content: `@${metaData.author}` });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
    this.metaService.updateTag({ 
      name: 'twitter:image:alt', 
      content: metaData.imageUrl ? `Cover image for ${metaData.title}` : 'Poems in India - Poetry & Literature' 
    });
    
    // Add canonical URL
    this.metaService.updateTag({ rel: 'canonical', href: metaData.canonicalUrl } as any);
    
    // Add article tags
    if (metaData.tags && metaData.tags.length > 0) {
      metaData.tags.forEach(tag => {
        this.metaService.addTag({ property: 'article:tag', content: tag });
      });
    }
    
    // Add structured data
    this.addStructuredData(metaData);
    
    // Debug logging for SSR
    if (this.isServer()) {
      console.log('🔍 SSR Meta Tags Set:', {
        title: metaData.title,
        description: metaData.description,
        imageUrl: imageUrl,
        canonicalUrl: metaData.canonicalUrl,
        slug: slug
      });
    }
  }

  private extractMetaData(postData: any, slug: string): PostMetaData {
    const author = postData.authorName || postData.author?.name || 'Anonymous';
    const description = postData.description || postData.excerpt || 
      `Read "${postData.title}" by ${author} on Poems in India - a curated collection of poetry and literature.`;
    
    return {
      title: postData.title,
      description: description,
      imageUrl: postData.imageUrl,
      canonicalUrl: `https://poemsindia.in/post/${slug}`,
      author: author,
      publishedAt: new Date(postData.publishedAt || postData.createdAt).toISOString(),
      submissionType: postData.submissionType,
      tags: postData.tags || []
    };
  }

  private getAbsoluteImageUrl(imageUrl?: string): string | null {
    if (!imageUrl) return null;
    
    // If already absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If relative URL, make it absolute
    if (imageUrl.startsWith('/')) {
      return `https://poemsindia.in${imageUrl}`;
    }
    
    // If no leading slash, assume it's relative to root
    return `https://poemsindia.in/${imageUrl}`;
  }

  private getDefaultSocialImage(): string {
    // Return a default social sharing image for posts without custom images
    return 'https://poemsindia.in/assets/loginimage.jpeg';
  }

  private addStructuredData(metaData: PostMetaData): void {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": metaData.title,
      "description": metaData.description,
      "author": {
        "@type": "Person",
        "name": metaData.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "Poems in India",
        "url": "https://poemsindia.in"
      },
      "url": metaData.canonicalUrl,
      "datePublished": metaData.publishedAt,
      "articleSection": metaData.submissionType,
      "keywords": metaData.tags ? metaData.tags.join(', ') : metaData.submissionType,
      "image": {
        "@type": "ImageObject",
        "url": this.getAbsoluteImageUrl(metaData.imageUrl) || this.getDefaultSocialImage(),
        "width": 1200,
        "height": 630
      }
    };

    // Only add to DOM on server-side or in browser
    if (typeof document !== 'undefined') {
      // Remove existing structured data script if it exists
      const existingScript = document.getElementById('structured-data');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new structured data script
      const script = document.createElement('script');
      script.id = 'structured-data';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }
}