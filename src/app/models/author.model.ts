export interface Author {
  id: string;
  name: string;
  profileImage?: string;
}

export class AuthorUtils {
  static normalizeAuthor(data: any): Author {
    if (!data) {
      return { id: 'unknown', name: 'Anonymous' };
    }

    if (data.userId && typeof data.userId === 'object') {
      return {
        id: data.userId._id || data.userId.id || 'unknown',
        name: data.userId.name || data.userId.username || 'Anonymous',
        profileImage: data.userId.profileImage
      };
    }
    if (data.author && typeof data.author === 'object') {
      return {
        id: data.author._id || data.author.id || 'unknown',
        name: data.author.name || data.author.username || 'Anonymous',
        profileImage: data.author.profileImage
      };
    }

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

    if ((data._id || data.id) && (data.name || data.username)) {
      return {
        id: data._id || data.id,
        name: data.name || data.username || 'Anonymous',
        profileImage: data.profileImage
      };
    }

    if (data.username) {
      return {
        id: data.userId || data._id || 'unknown',
        name: data.username,
        profileImage: data.profileImage
      };
    }

    // Fallback
    return { id: 'unknown', name: 'Anonymous' };
  }

  /**
   * Get author initials for display (e.g., "John Doe" -> "JD")
   */
  static getInitials(author: Author): string {
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

  static hasProfileImage(author: Author): boolean {
    return !!(author?.profileImage && author.profileImage.trim().length > 0);
  }

  /**
   * Get profile URL for author
   */
  static getProfileUrl(author: Author): string {
    return `/user-profile/${author.id}`;
  }

  /**
   * Transform array of submissions to use standardized author format
   */
  static normalizeSubmissionsAuthors(submissions: any[]): any[] {
    return submissions.map(submission => ({
      ...submission,
      author: AuthorUtils.normalizeAuthor(submission)
    }));
  }
}