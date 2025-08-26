import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class HtmlSanitizerService {

  constructor(private sanitizer: DomSanitizer) { }

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
  cleanContentPreservingBreaks(content: string): SafeHtml {
    if (!content) return '';
    
    const cleanedContent = content
      // Remove excessive empty divs
      .replace(/<div>\s*<\/div>/g, '<br>')
      // Replace div tags with line breaks for poetry formatting, but preserve other formatting
      .replace(/<div>/g, '<br>')
      .replace(/<\/div>/g, '')
      // Clean up multiple consecutive line breaks (more than 2)
      .replace(/(<br\s*\/?>){3,}/g, '<br><br>')
      // Convert multiple spaces within lines to non-breaking spaces to preserve formatting
      .replace(/  +/g, (match) => '&nbsp;'.repeat(match.length))
      // Remove leading/trailing line breaks
      .replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/g, '')
      // Clean up any remaining empty paragraphs or spaces at the very end
      .trim();
    
    // Use DomSanitizer to bypass HTML sanitization and preserve formatting
    return this.sanitizer.bypassSecurityTrustHtml(cleanedContent);
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