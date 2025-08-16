export class CommonUtils {
  /**
   * Formats a date string into a readable format
   */
  static formatDate(dateString?: string | Date): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Formats a date with relative time for recent dates
   */
  static formatDateWithRelativeTime(date: Date | string): string {
    if (!date) return '';
    const now = new Date();
    const targetDate = new Date(date);
    const diffInHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return this.formatDate(targetDate);
    }
  }

  /**
   * Capitalizes the first letter of a string
   */
  static capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Capitalizes first letter while preserving the rest
   */
  static capitalizeFirstOnly(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts string to title case
   */
  static toTitleCase(str: string): string {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Gets initials from a name string
   */
  static getInitials(name: string): string {
    if (!name) return '';
    const words = name.trim().split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
  }

  /**
   * Performs case-insensitive search in text
   */
  static searchInText(text: string, searchTerm: string): boolean {
    if (!text || !searchTerm) return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  }

  /**
   * Performs case-insensitive search in multiple fields
   */
  static searchInFields(item: any, searchTerm: string, fields: string[]): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    return fields.some(field => {
      const value = this.getNestedProperty(item, field);
      if (Array.isArray(value)) {
        return value.some(v => String(v).toLowerCase().includes(term));
      }
      return String(value || '').toLowerCase().includes(term);
    });
  }

  /**
   * Gets nested property value from object using dot notation
   */
  static getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Truncates text to specified length with ellipsis
   */
  static truncateText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Formats file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generates a random ID
   */
  static generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  /**
   * Debounces a function call
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Deep clones an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const cloned = {} as any;
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone((obj as any)[key]);
      });
      return cloned;
    }
    return obj;
  }

  /**
   * Checks if an object is empty
   */
  static isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Removes undefined, null, and empty string values from object
   */
  static cleanObject(obj: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }

  /**
   * Sorts array by multiple criteria
   */
  static sortBy<T>(
    array: T[],
    sortFn: (a: T, b: T) => number
  ): T[] {
    return [...array].sort(sortFn);
  }

  /**
   * Creates a sorting function for object properties
   */
  static createSortFn<T>(
    property: keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ): (a: T, b: T) => number {
    return (a: T, b: T) => {
      const aVal = a[property];
      const bVal = b[property];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    };
  }

  /**
   * Groups array by a property
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Filters array by multiple criteria
   */
  static filterBy<T>(
    array: T[],
    filters: Record<string, any>
  ): T[] {
    return array.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true;
        const itemValue = this.getNestedProperty(item, key);
        
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        if (typeof value === 'string') {
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        }
        return itemValue === value;
      });
    });
  }
}