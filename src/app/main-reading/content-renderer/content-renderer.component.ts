import { Component, Input, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-content-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-renderer.component.html',
  styleUrls: ['./content-renderer.component.css']
})
export class ContentRendererComponent implements OnChanges {
  @Input() html = '';
  @Input() resizable = false; // deprecated - keep for compatibility
  @Input() initialFontSize = 18; // px
  cleanedHtml: SafeHtml | null = null;
  fontSize = this.initialFontSize;

  private allowedTags = new Set([
    'P','BR','B','STRONG','I','EM','UL','OL','LI','BLOCKQUOTE',
    'A','IMG','H1','H2','H3','H4','H5','H6','SPAN','DIV','PRE','CODE'
  ]);

  constructor(private sanitizer: DomSanitizer, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['html']) {
      this.cleanedHtml = this.cleanHtml(this.html || '');
    }
    if (changes['initialFontSize'] && changes['initialFontSize'].currentValue) {
      this.fontSize = changes['initialFontSize'].currentValue;
    }
  }

  increaseFont() {
    this.fontSize = Math.min(this.fontSize + 2, 28);
  }

  decreaseFont() {
    this.fontSize = Math.max(this.fontSize - 2, 12);
  }

  private cleanHtml(input: string): SafeHtml {
    if (!input) return this.sanitizer.bypassSecurityTrustHtml('');

    // Use DOMParser in browser for robust cleaning
    if (isPlatformBrowser(this.platformId) && typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/html');
      const body = doc.body;

      const walk = (node: Node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tag = el.tagName.toUpperCase();

            // If the tag is not allowed, unwrap it (keep children)
            if (!this.allowedTags.has(tag)) {
              // Replace element with its children
              while (el.firstChild) {
                node.insertBefore(el.firstChild, el);
              }
              node.removeChild(el);
              continue; // children moved, will be visited in next iterations
            }

            // Remove inline styles and event handlers
            const attrs = Array.from(el.attributes).map(a => a.name);
            for (const name of attrs) {
              // Keep a small whitelist of attributes
              const keepAttrs = ['href','src','alt','title','target','rel','width','height'];
              if (name === 'style' || name.startsWith('on')) {
                el.removeAttribute(name);
              } else if (!keepAttrs.includes(name)) {
                el.removeAttribute(name);
              }
            }

            // For anchors ensure safe rel/target
            if (tag === 'A') {
              el.setAttribute('rel', 'noopener noreferrer');
              if (!el.getAttribute('target')) {
                el.setAttribute('target', '_blank');
              }
            }

            // Continue walking children
            walk(el);
          } else if (child.nodeType === Node.COMMENT_NODE) {
            // Remove comments
            node.removeChild(child);
          } else {
            // Text node - keep
          }
        }
      };

      walk(body);
      // Serialize cleaned HTML
      const cleaned = body.innerHTML;
      return this.sanitizer.bypassSecurityTrustHtml(cleaned);
    }

    // Fallback for SSR or environments without DOMParser: basic regex cleanup
    let fallback = input;
    // Remove style attributes
    fallback = fallback.replace(/\sstyle=("[^"]*"|'[^']*')/gi, '');
    // Remove event handlers
    fallback = fallback.replace(/\son[a-z]+=("[^"]*"|'[^']*')/gi, '');
    // Drop any script tags
    fallback = fallback.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    return this.sanitizer.bypassSecurityTrustHtml(fallback);
  }
}
