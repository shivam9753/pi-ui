import { Injectable } from '@angular/core';
import { Author } from '../models';

/**
 * Service for handling author data transformation and normalization
 * This service provides centralized author data processing for components
 */
@Injectable({
  providedIn: 'root'
})
export class AuthorService {

  /**
   * Transform API response submissions to have normalized author data
   * This method should be used by all services when processing submission lists
   */
  normalizeSubmissionsAuthors(submissions: any[]): any[] {
    return submissions.map(submission => ({
      ...submission,
      author: this.normalizeAuthor(submission)
    }));
  }

  /**
   * Normalize author data from any API response format
   */
  normalizeAuthor(data: any): Author {
    // Handle different API response patterns
    if (!data) {
      return { id: 'unknown', name: 'Anonymous' };
    }

    // Pattern 1: data.userId object (populated submission)
    if (data.userId && typeof data.userId === 'object') {
      return {
        id: data.userId._id || data.userId.id || 'unknown',
        name: data.userId.name || data.userId.email || 'Anonymous',
        profileImage: data.userId.profileImage
      };
    }

    // Pattern 2: data.author object  
    if (data.author && typeof data.author === 'object') {
      return {
        id: data.author._id || data.author.id || 'unknown',
        name: data.author.name || data.author.email || 'Anonymous',
        profileImage: data.author.profileImage
      };
    }

    // Pattern 3: Legacy string fields (submitterName, authorName) - check these first
    if (data.submitterName) {
      return {
        id: data.submitterId || 'unknown',
        name: data.submitterName,
        profileImage: data.submitterImage
      };
    }

    if (data.authorName) {
      return {
        id: data.authorId || 'unknown', 
        name: data.authorName,
        profileImage: data.authorImage
      };
    }

    // Pattern 4: Direct fields on data object (fallback for user objects)
    if ((data._id || data.id) && (data.name || data.username)) {
      return {
        id: data._id || data.id,
        name: data.name || data.email || 'Anonymous',
        profileImage: data.profileImage
      };
    }

    // No username-only fallback; prefer email or anonymous

    // Fallback
    return { id: 'unknown', name: 'Anonymous' };
  }

  /**
   * Get author initials for display
   */
  getAuthorInitials(author: Author): string {
    if (!author?.name || author.name === 'Anonymous') {
      return 'A';
    }
    
    return author.name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'A';
  }

  /**
   * Get author profile URL
   */
  getAuthorProfileUrl(author: Author): string {
    return `/user-profile/${author.id}`;
  }

  /**
   * Check if author has profile image
   */
  hasAuthorProfileImage(author: Author): boolean {
    return !!(author?.profileImage && author.profileImage.trim().length > 0);
  }

  /**
   * Transform content objects to have normalized author data
   */
  normalizeContentAuthors(content: any[]): any[] {
    return content.map(item => ({
      ...item,
      author: this.normalizeAuthor(item)
    }));
  }

  /**
   * Transform published works to have normalized author data
   */
  normalizePublishedWorksAuthors(works: any[]): any[] {
    return works.map(work => ({
      ...work,
      author: this.normalizeAuthor(work)
    }));
  }

  /**
   * Extract author data from user profile responses
   * Useful when user profile data is returned in different formats
   */
  normalizeUserToAuthor(user: any): Author {
    if (!user) {
      return { id: 'unknown', name: 'Anonymous' };
    }

    return {
      id: user._id || user.id || 'unknown',
      name: user.name || user.email || 'Anonymous',
      profileImage: user.profileImage
    };
  }

  /**
   * Get display name with fallback logic
   * Useful for components that need flexible name display
   */
  getDisplayName(author: Author | any): string {
    if (author && typeof author === 'object') {
      if (author.name) return author.name;
      if (author.email) return author.email;
    }
    return 'Anonymous';
  }

  /**
   * Create author object for new submissions/content
   * Uses current user data to create standardized author
   */
  createAuthorFromUser(user: any): Author {
    return this.normalizeUserToAuthor(user);
  }
}