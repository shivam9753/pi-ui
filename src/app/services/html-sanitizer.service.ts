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
    
    // Create a temporary DOM element to properly parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Get the text content while preserving line breaks
    let result = '';
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Add text content
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Handle block elements and line break elements
        if (tagName === 'div' || tagName === 'p' || tagName === 'br') {
          // Process children first
          for (let child of Array.from(element.childNodes)) {
            processNode(child);
          }
          // Add line break after block elements (but not for empty divs following br)
          if (tagName === 'br' || (element.textContent && element.textContent.trim())) {
            result += '\n';
          }
        } else if (tagName === 'strong' || tagName === 'b') {
          result += '<strong>';
          for (let child of Array.from(element.childNodes)) {
            processNode(child);
          }
          result += '</strong>';
        } else if (tagName === 'em' || tagName === 'i') {
          result += '<em>';
          for (let child of Array.from(element.childNodes)) {
            processNode(child);
          }
          result += '</em>';
        } else if (tagName === 'u') {
          result += '<u>';
          for (let child of Array.from(element.childNodes)) {
            processNode(child);
          }
          result += '</u>';
        } else {
          // For other elements, just process children
          for (let child of Array.from(element.childNodes)) {
            processNode(child);
          }
        }
      }
    };
    
    // Process all child nodes
    for (let child of Array.from(tempDiv.childNodes)) {
      processNode(child);
    }
    
    // Clean up the result
    return result
      .replace(/\n+/g, '<br>')         // Convert multiple newlines to single <br>
      .replace(/<br\s*\/?>/g, '<br>')  // Normalize br tags
      .replace(/&nbsp;/g, ' ')         // Convert non-breaking spaces
      .replace(/&amp;/g, '&')          // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/<br>$/, '')            // Remove trailing <br>
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