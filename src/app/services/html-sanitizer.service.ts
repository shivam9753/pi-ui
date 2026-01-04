import { Injectable, SecurityContext } from '@angular/core';
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
   * IMPORTANT: Preserves inline styles like text-align for formatting
   * @param content The content that may contain HTML
   * @returns Content with HTML cleaned but line breaks and styles preserved
   */
  cleanContentPreservingBreaks(content: string): SafeHtml {
    if (!content) return '';

    // IMPORTANT: Preserve ALL inline styles from the editor
    // Content comes from our trusted ProseMirror editor and should render exactly as stored
    // We only clean toolbar elements, but preserve all formatting (alignment, italic, bold, etc.)
    let processedContent = content;

    // Add data-align attributes alongside inline styles for SSR fallback
    // SSR may strip inline styles, so data-align ensures CSS can style the element
    processedContent = processedContent.replace(/<p([^>]*?)style="[^"]*text-align:\s*([^;"]+)[^"]*"([^>]*?)>/gi, (match, _before, align) => {
      // Add data-align if it doesn't exist, but KEEP the inline style
      if (!match.includes('data-align=')) {
        return match.replace('<p', `<p data-align="${align.trim()}"`);
      }
      return match;
    });

    const cleanedContent = processedContent
      // Remove image toolbar elements and related UI (more comprehensive removal)
      .replace(/<div[^>]*class="[^"]*image-toolbar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*image-toolbar[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<button[^>]*class="[^"]*image-toolbar-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<button[^>]*image-toolbar-btn[^>]*>[\s\S]*?<\/button>/gi, '')
      // Remove specific toolbar buttons with data-action attributes (from rich text editor)
      .replace(/<button[^>]*data-action="[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<button[^>]*data-image-id="[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<button[^>]*type="button"[^>]*title="[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
      // Remove any button that contains SVG with editing icons
      .replace(/<button[^>]*>[\s\S]*?<svg[^>]*>[\s\S]*?<path[^>]*stroke="#ffffff"[^>]*>[\s\S]*?<\/svg>[\s\S]*?<\/button>/gi, '')
      .replace(/<button[^>]*>[\s\S]*?<svg[^>]*fill="none"[^>]*stroke="#ffffff"[^>]*>[\s\S]*?<\/button>/gi, '')
      // Nuclear option: Remove any button with data-action or data-image-id (comprehensive match)
      .replace(/<button[^>]*(?:data-action|data-image-id)[^>]*>[\s\S]*?<\/button>/gi, '')
      // Remove buttons with specific titles that indicate editing functionality
      .replace(/<button[^>]*title="(?:Change width|Edit caption|Delete image)"[^>]*>[\s\S]*?<\/button>/gi, '')
      // Remove any standalone buttons that appear in figures (likely toolbar buttons)
      .replace(/<figure[^>]*>[\s\S]*?<button[^>]*>[\s\S]*?<\/button>[\s\S]*?<\/figure>/gi, function(match) {
        return match.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
      })
      // Additional comprehensive button removal for any missed cases
      .replace(/<button[^>]*data-action[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<button[^>]*data-image-id[^>]*>[\s\S]*?<\/button>/gi, '')
      // Remove any SVG icons that are part of toolbars
      .replace(/<svg[^>]*class="[^"]*w-4 h-4[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<svg[^>]*width="16"[^>]*height="16"[^>]*stroke="#ffffff"[^>]*>[\s\S]*?<\/svg>/gi, '')
      // Remove standalone toolbar elements by common patterns
      .replace(/<div[^>]*style="[^"]*position:\s*absolute[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove elements with high z-index (likely floating toolbars)
      .replace(/<[^>]*style="[^"]*z-index:\s*9[0-9][0-9][^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, '')
      // Clean up excessive whitespace and non-breaking spaces
      .replace(/(&nbsp;\s*){2,}/g, ' ')
      .replace(/\s*&nbsp;\s*/g, ' ')
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