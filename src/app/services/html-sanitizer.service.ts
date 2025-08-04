import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HtmlSanitizerService {

  constructor() { }

  /**
   * Clean HTML tags and entities from text content
   * @param text The text content that may contain HTML
   * @returns Sanitized plain text
   */
  cleanHtml(text: string | null | undefined): string {
    if (!text) return '';
    
    // Strip HTML tags and clean up HTML entities
    const cleanText = text.replace(/<[^>]*>/g, '') // Remove all HTML tags
                         .replace(/&nbsp;/g, ' ')   // Convert non-breaking spaces
                         .replace(/&amp;/g, '&')   // Convert ampersand entities
                         .replace(/&lt;/g, '<')    // Convert less-than entities
                         .replace(/&gt;/g, '>')    // Convert greater-than entities
                         .replace(/&quot;/g, '"')  // Convert quote entities
                         .replace(/&apos;/g, "'")  // Convert apostrophe entities
                         .replace(/&#39;/g, "'")   // Convert numeric apostrophe entities
                         .replace(/&rdquo;/g, '"') // Convert right double quote
                         .replace(/&ldquo;/g, '"') // Convert left double quote
                         .replace(/&rsquo;/g, "'") // Convert right single quote
                         .replace(/&lsquo;/g, "'") // Convert left single quote
                         .replace(/&mdash;/g, '—') // Convert em dash
                         .replace(/&ndash;/g, '–') // Convert en dash
                         .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
                         .trim();                  // Remove leading/trailing whitespace
    
    return cleanText;
  }

  /**
   * Clean description with fallback text
   * @param excerpt The excerpt text
   * @param description The description text
   * @param fallback The fallback text if both are empty
   * @returns Sanitized description text
   */
  getCleanDescription(excerpt?: string | null, description?: string | null, fallback: string = 'No preview available'): string {
    const text = excerpt || description || fallback;
    return this.cleanHtml(text);
  }

  /**
   * Clean content for display while preserving line breaks (for poetry/formatted content)
   * @param content The content that may contain HTML
   * @returns Content with HTML cleaned but line breaks preserved
   */
  cleanContentPreservingBreaks(content: string): string {
    if (!content) return '';
    
    return content
      .replace(/<div>/g, '')           // Remove opening div tags
      .replace(/<\/div>/g, '<br>')     // Convert closing div tags to line breaks
      .replace(/<br\s*\/?>/g, '<br>')  // Normalize br tags
      .replace(/&nbsp;/g, ' ')         // Convert non-breaking spaces
      .replace(/&amp;/g, '&')          // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .trim();                         // Remove leading/trailing whitespace
  }

  /**
   * Truncate text to a specific length and add ellipsis
   * @param text The text to truncate
   * @param maxLength The maximum length (default: 150)
   * @returns Truncated text with ellipsis if needed
   */
  truncateText(text: string, maxLength: number = 150): string {
    if (!text) return '';
    
    const cleanText = this.cleanHtml(text);
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    return cleanText.substring(0, maxLength).trim() + '...';
  }
}