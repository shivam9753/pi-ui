import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { BackendService } from '../../services/backend.service';
import { HtmlSanitizerService } from '../../services/html-sanitizer.service';

interface FeaturedPoem {
  _id: string;
  title: string;
  body?: string;
  submission?: {
    _id: string;
    title: string;
    type: string;
    slug?: string;
  };
  submissionType?: string;
  author: {
    _id: string;
    id?: string;
    username: string;
    name: string;
    profileImage?: string;
  };
  publishedAt?: string;
  viewCount?: number;
  tags?: string[];// tags may be strings or canonical tag objects returned by the backend
  isFeatured?: boolean;
  featuredAt?: string;
}

@Component({
  selector: 'app-featured-poems',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatChipsModule, MatButtonModule],
  templateUrl: './featured-poems.component.html',
  styleUrls: ['./featured-poems.component.css']
})
export class FeaturedPoemsComponent implements OnInit {
  private readonly backendService = inject(BackendService);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly htmlSanitizer = inject(HtmlSanitizerService);

  featuredPoems = signal<FeaturedPoem[]>([]);
  loading = signal(false);
  hasMore = signal(false);
  currentPage = 1;
  itemsPerPage = 10;

  ngOnInit() {
    this.setupPageMeta();
    this.loadFeaturedPoems();
  }

  private setupPageMeta() {
    this.titleService.setTitle('Featured Poems - PoemsIndia');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Discover exceptional poetry handpicked by our editorial team. Featured poems showcase the finest voices and craftsmanship in contemporary poetry.' 
    });
    this.metaService.updateTag({ 
      property: 'og:title', 
      content: 'Featured Poems - PoemsIndia' 
    });
    this.metaService.updateTag({ 
      property: 'og:description', 
      content: 'Discover exceptional poetry handpicked by our editorial team.' 
    });
  }

  private loadFeaturedPoems(loadMore = false) {
    this.loading.set(true);

    const skip = loadMore ? (this.currentPage - 1) * this.itemsPerPage : 0;

    // Use getContent endpoint with featured flag for poems
    this.backendService.getContent({
      published: true,
      featured: true,
      type: 'poem',
      limit: this.itemsPerPage,
      skip: skip,
      sortBy: 'featuredAt',
      order: 'desc'
    }).subscribe({
      next: (response) => {
        // Extract contents from response
        const newPoems = response?.contents || [];
        const total = response?.total || 0;

        if (loadMore) {
          this.featuredPoems.update(poems => [...poems, ...newPoems]);
        } else {
          this.featuredPoems.set(newPoems);
          this.currentPage = 1;
        }

        // Check if there are more poems to load
        this.hasMore.set((skip + this.itemsPerPage) < total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading featured poems:', err);
        this.featuredPoems.set([]);
        this.hasMore.set(false);
        this.loading.set(false);
      }
    });
  }

  loadMorePoems() {
    if (!this.loading() && this.hasMore()) {
      this.currentPage++;
      this.loadFeaturedPoems(true);
    }
  }

  readPoem(poem: FeaturedPoem) {
    // Use the content _id to navigate to the content reader
    this.router.navigate(['/content', poem._id]);
  }

  // Helper to safely display tag name when backend may return objects
  getTagDisplayName(tag: any): string {
    if (!tag) return '';
    if (typeof tag === 'string') return tag;
    if (typeof tag === 'object') {
      if (tag.name && String(tag.name).trim().length > 0) return String(tag.name).trim();
      if (tag.tag && String(tag.tag).trim().length > 0) return String(tag.tag).trim();
      if (tag.slug && String(tag.slug).trim().length > 0) return String(tag.slug).trim().replaceAll('-', ' ');
      if (tag._id || tag.id) return String(tag._id || tag.id);
    }
    return '';
  }
}