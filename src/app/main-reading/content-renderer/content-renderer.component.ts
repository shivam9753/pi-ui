import { Component, Input, OnChanges, SimpleChanges, Inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-content-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-renderer.component.html',
  styleUrls: ['./content-renderer.component.css'],
  encapsulation: ViewEncapsulation.None
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
            // Preserve alignment metadata and map to safe CSS classes (no inline styles)
            const attrs = Array.from(el.attributes).map(a => a.name);

            // Determine alignment from data-align (preferred) or from inline style.text-align
            const alignAttr = (el.getAttribute('data-align') || '').toLowerCase();
            const allowedAlign = ['left', 'center', 'right', 'justify'];
            let appliedAlign: string | null = null;
            if (alignAttr && allowedAlign.includes(alignAttr)) {
              appliedAlign = alignAttr;
            } else {
              const styleText = el.getAttribute('style') || '';
              const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(styleText);
              if (m) appliedAlign = m[1].toLowerCase();
            }

            if (appliedAlign) {
              const existingClass = el.getAttribute('class') || '';
              const classToAdd = `align-${appliedAlign}`;
              const classes = existingClass ? existingClass.split(/\s+/) : [];
              if (!classes.includes(classToAdd)) {
                classes.push(classToAdd);
                el.setAttribute('class', classes.join(' ').trim());
              }
            }

            // Keep a small whitelist of attributes (allow class so our align-* classes remain)
            const keepAttrs = ['href','src','alt','title','target','rel','width','height','class'];

            for (const name of attrs) {
              // remove any inline styles, event handlers, and the data-align attribute (we've mapped it)
              if (name === 'style' || name.startsWith('on') || name === 'data-align') {
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

    // Map data-align / style:text-align into safe align-* classes while preserving other attributes where possible.
    // This function walks over opening tags and extracts alignment metadata, removes data-align and text-align from style,
    // and appends/creates a class attribute like align-center so that the browser can style it later.
    fallback = fallback.replace(/<([a-z0-9]+)([^>]*)>/gi, (match: string, tagName: string, attrs: string) => {
      let a = attrs || '';
      let appliedAlign: string | null = null;

      // detect data-align
      const da = /data-align=(?:"|')?\s*(left|center|right|justify)(?:"|')?/i.exec(a);
      if (da) {
        appliedAlign = da[1].toLowerCase();
      } else {
        // detect text-align in style
        const st = /style=(?:"|')([^"']*)(?:"|')?/i.exec(a);
        if (st) {
          const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(st[1]);
          if (m) appliedAlign = m[1].toLowerCase();
        }
      }

      // Remove data-align attributes
      a = a.replace(/\sdata-align=(?:"|')?\s*(left|center|right|justify)(?:"|')?/gi, '');

      // Remove only the text-align declaration from style, keep other safe declarations if any
      a = a.replace(/\sstyle=(?:"|')([^"']*)(?:"|')?/gi, (m, styleContent) => {
        const newStyle = styleContent.replace(/text-align\s*:\s*(left|center|right|justify)\s*;?/gi, '').trim();
        return newStyle ? ` style="${newStyle}"` : '';
      });

      // Remove inline event handlers
      a = a.replace(/\son[a-z]+=(["'])[\s\S]*?\1/gi, '');

      // Append or create class attribute for alignment
      if (appliedAlign) {
        const classMatch = /\sclass=(['"])([^'\"]*)\1/i.exec(a);
        if (classMatch) {
          const existing = classMatch[2];
          const updated = `${existing} align-${appliedAlign}`.trim();
          a = a.replace(/\sclass=(['"])([^'\"]*)\1/i, ` class="${updated}"`);
        } else {
          a = `${a} class="align-${appliedAlign}"`;
        }
      }

      return `<${tagName}${a}>`;
    });

    // Drop any script tags entirely
    fallback = fallback.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    // Remove any remaining on* handlers (defensive)
    fallback = fallback.replace(/\son[a-z]+=(["'])[\s\S]*?\1/gi, '');

    return this.sanitizer.bypassSecurityTrustHtml(fallback);
  }
}
