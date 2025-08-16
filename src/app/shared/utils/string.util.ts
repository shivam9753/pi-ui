export class StringUtils {
  /**
   * Validates email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates phone number (basic format)
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Converts string to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Converts string to camelCase
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to snake_case
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Removes HTML tags from string
   */
  static stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Escapes HTML special characters
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Generates a slug from text
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Counts words in text
   */
  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimates reading time (based on average 200 words per minute)
   */
  static estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Pluralizes a word based on count
   */
  static pluralize(word: string, count: number, pluralForm?: string): string {
    if (count === 1) return word;
    return pluralForm || word + 's';
  }

  /**
   * Formats a number with ordinal suffix (1st, 2nd, 3rd, etc.)
   */
  static ordinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  /**
   * Masks sensitive data (like email or phone)
   */
  static maskSensitiveData(value: string, type: 'email' | 'phone' | 'custom', visibleChars: number = 3): string {
    if (!value) return '';
    
    switch (type) {
      case 'email':
        const [local, domain] = value.split('@');
        if (!domain) return value;
        const maskedLocal = local.substring(0, Math.min(visibleChars, local.length)) + '*'.repeat(Math.max(0, local.length - visibleChars));
        return `${maskedLocal}@${domain}`;
      
      case 'phone':
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        const visibleEnd = Math.min(visibleChars, cleanPhone.length);
        const masked = '*'.repeat(Math.max(0, cleanPhone.length - visibleEnd)) + cleanPhone.slice(-visibleEnd);
        return masked;
      
      case 'custom':
        const visibleStart = Math.min(visibleChars, value.length);
        return value.substring(0, visibleStart) + '*'.repeat(Math.max(0, value.length - visibleStart));
      
      default:
        return value;
    }
  }

  /**
   * Highlights search terms in text
   */
  static highlightSearchTerms(text: string, searchTerm: string, highlightClass: string = 'highlight'): string {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, `<span class="${highlightClass}">$1</span>`);
  }

  /**
   * Escapes regex special characters
   */
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extracts mentions from text (@username)
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  /**
   * Extracts hashtags from text (#hashtag)
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1]);
    }
    
    return hashtags;
  }

  /**
   * Capitalizes words while preserving existing capitalization patterns
   */
  static smartCapitalize(text: string): string {
    const words = text.split(' ');
    return words.map(word => {
      if (word.length === 0) return word;
      
      // If word is all uppercase or all lowercase, capitalize normally
      if (word === word.toUpperCase() || word === word.toLowerCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      
      // Otherwise, preserve existing capitalization
      return word;
    }).join(' ');
  }

  /**
   * Formats a name for display (handles edge cases)
   */
  static formatDisplayName(name: string): string {
    if (!name) return 'Anonymous';
    return this.smartCapitalize(name.trim());
  }

  /**
   * Generates initials with fallback for empty names
   */
  static getInitialsWithFallback(name: string, fallback: string = 'A'): string {
    if (!name || name.trim() === '' || name.toLowerCase() === 'anonymous') {
      return fallback;
    }
    
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return fallback;
    
    return words
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }
}