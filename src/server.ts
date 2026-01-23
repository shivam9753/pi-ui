import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import fetch from 'node-fetch';

// New dependencies for safer SSR meta handling
import * as cheerio from 'cheerio';
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';

// Use SITE_HOST env if provided to standardize canonical URLs and API host
const SITE_HOST = process.env['SITE_HOST'] || 'https://poemsindia.in';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

// Small in-memory cache for meta data to avoid repeated remote fetches during SSR
const metaCacheOptions = {
  max: 1000,
  // ttl in ms (10 minutes)
  ttl: 1000 * 60 * 10,
};
const metaCache: any = new LRUCache(metaCacheOptions);

// Limit concurrent remote requests during SSR to avoid overload
const fetchLimit = pLimit(5);

// Simple HTML escape for text fields used inside tags
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validate slug against conservative pattern (alphanumeric, dashes, underscores)
function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(slug);
}

// Validate image URL (basic) and return a safe fallback if invalid
function sanitizeImageUrl(url: any): string {
  try {
    if (!url || typeof url !== 'string') return `${SITE_HOST}/assets/loginimage.jpeg`;
    // Detect blob: or data: URLs which are browser-only and cannot be fetched by the server
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      console.warn(`[Meta] Received non-fetchable image URL (blob/data) for SSR: ${url}`);
      // Return a public fallback — client should upload such images to a public host before publishing
      return `${SITE_HOST}/assets/loginimage.jpeg`;
    }
    const parsed = new URL(url, 'https://poemsindia.in');
    // Only allow http(s)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return `${SITE_HOST}/assets/loginimage.jpeg`;
    }
    return parsed.toString();
  } catch (err) {
    return `${SITE_HOST}/assets/loginimage.jpeg`;
  }
}

// Fetch with timeout (uses AbortController)
async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res: any = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Helper function to fetch post data and generate sanitized meta tags with caching
async function generatePostMetaTags(slug: string): Promise<{ title: string; html: string } | null> {
  // Validate slug early
  if (!slug || !isValidSlug(slug)) {
    console.log(`[Meta] Invalid slug provided: ${slug}`);
    return null;
  }

  // Return cached value if present
  const cached = metaCache.get(slug);
  if (cached) {
    return cached;
  }

  // Use concurrency limiter to avoid many simultaneous remote calls
  return fetchLimit(async () => {
    try {
      const apiUrl = `${SITE_HOST}/api/submissions/by-slug/${encodeURIComponent(slug)}`;
      const response = await fetchWithTimeout(apiUrl, 3000);

      if (!response.ok) {
        console.log(`[Meta] API error for ${slug}:`, response.status);
        return null;
      }

      const postData = await response.json() as any;

      // Normalize common fields with safe fallbacks
      const rawTitle = postData?.title || 'Untitled';

      // author may be a string or an object { name }
      let rawAuthor: string = 'Anonymous';
      if (postData?.authorName) rawAuthor = postData.authorName;
      else if (postData?.author) rawAuthor = (typeof postData.author === 'string') ? postData.author : (postData.author.name || postData.author.username || 'Anonymous');

      const rawDescription = postData?.description || postData?.excerpt || '';

      // image may be present in several shapes
      const rawImage = postData?.ogImage || postData?.imageUrl || (postData?.image && (typeof postData.image === 'string' ? postData.image : (postData.image.url || ''))) || '';

      // published time
      const publishedTime = postData?.publishedAt || postData?.published_at || postData?.createdAt || postData?.created_at || null;

      // Collect tags: backend may return tags as array of objects [{name,slug,_id}] or strings.
      const collectTagNames = (arr: any[] = []) => {
        const names: string[] = [];
        for (const t of arr) {
          if (!t) continue;
          if (typeof t === 'string') {
            names.push(t);
          } else if (typeof t === 'object') {
            // prefer name, then tag, then slug, then id
            const name = t.name || t.tag || t.label || t.slug || (t._id ? String(t._id) : '') || '';
            if (name) names.push(name);
          }
        }
        return names.filter(Boolean);
      };

      let tagValues: string[] = [];
      if (Array.isArray(postData?.tags) && postData.tags.length > 0) {
        tagValues = collectTagNames(postData.tags);
      } else if (Array.isArray(postData?.contents)) {
        // Aggregate tags from content blocks
        for (const c of postData.contents) {
          if (Array.isArray(c.tags) && c.tags.length > 0) {
            tagValues.push(...collectTagNames(c.tags));
          }
        }
      }

      // Deduplicate and limit tags for meta
      tagValues = Array.from(new Set(tagValues)).slice(0, 20);

      const title = `${rawTitle} — Poems by ${rawAuthor} - pi`;
      const description = rawDescription || `Read "${rawTitle}" by ${rawAuthor} on Poems in India - a curated collection of poetry and literature.`;
      const imageUrl = sanitizeImageUrl(rawImage);
      const canonicalUrl = `${SITE_HOST}/post/${slug}`;

      // Build keywords (include tags if available)
      let keywords = `poetry, literature, ${rawAuthor}`;
      if (tagValues && tagValues.length > 0) {
        keywords = `${tagValues.slice(0, 10).join(', ')}, ${keywords}`;
      }

      // Build sanitized meta tags (text fields escaped)
      let metaTags = `
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(keywords)}">

    <meta property="og:title" content="${escapeHtml(rawTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="Poems in India">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Cover image for ${escapeHtml(rawTitle)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:locale" content="en_US">

    <meta name="image" content="${escapeHtml(imageUrl)}">
    <meta itemprop="image" content="${escapeHtml(imageUrl)}">
    <link rel="image_src" href="${escapeHtml(imageUrl)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(rawTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:site" content="@poemsindia">
    <meta name="twitter:creator" content="@${escapeHtml(rawAuthor)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <meta name="twitter:image:alt" content="Cover image for ${escapeHtml(rawTitle)}">

    <meta name="author" content="${escapeHtml(rawAuthor)}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    `;

      // Add article:published_time if available
      if (publishedTime) {
        try {
          const iso = new Date(publishedTime).toISOString();
          metaTags += `\n    <meta property="article:published_time" content="${escapeHtml(iso)}">`;
        } catch (e) {
          // ignore invalid dates
        }
      }

      // Add article:section (submissionType) if present
      if (postData?.submissionType) {
        metaTags += `\n    <meta property="article:section" content="${escapeHtml(postData.submissionType)}">`;
      }

      // Inject tags as article:tag and include in keywords meta already handled
      if (tagValues && tagValues.length > 0) {
        for (const t of tagValues) {
          metaTags += `\n    <meta property="article:tag" content="${escapeHtml(t)}">`;
        }
      }

      const result = { title, html: metaTags };
      // Cache result
      metaCache.set(slug, result);
      console.log(`[Meta] Cached meta for: ${slug}, Image: ${imageUrl}, Tags: ${tagValues.join(', ')}`);
      return result;
    } catch (error) {
      // Distinguish aborts/timeouts from other errors
      if ((error as any)?.name === 'AbortError') {
        console.warn(`[Meta] Timeout fetching meta for ${slug}`);
      } else {
        console.error(`[Meta] Error fetching data for ${slug}:`, error);
      }
      return null;
    }
  });
}

/**
 * Example Express Rest API endpoints can be defined here.
 */

/**
 * Serve static files from /browser with careful cache headers.
 */
app.use(express.static(browserDistFolder, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      // Prevent aggressive caching of index.html (SPA shell)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/[.](?:js|css|png|jpg|jpeg|svg|webp|woff2?|map)$/.test(filePath)) {
      // Long cache for fingerprinted assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Conservative default
      res.setHeader('Cache-Control', 'public, max-age=600');
    }
  }
}));

/**
 * Legacy URL redirects - Disabled
 * Previously this endpoint redirected unknown single-segment paths to /post/:slug which caused
 * client routes (eg. /my-submissions) to be rewritten. That behavior is removed to let the
 * application and Angular router handle these routes. If you need to enable legacy redirects
 * for specific slugs, implement an explicit whitelist or a check against the CMS data.
 */
app.get('/:slug', (req, res, next) => {
  // No-op: allow further handlers (SSR/catch-all or static serving) to handle the path
  return next();
});

/**
 * Hybrid SSR: Only render specific routes server-side
 */
app.get('*', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  const ssrRoutes = [
    /^\/post\/[^\/]+$/,
  ];

  const shouldSSR = ssrRoutes.some(pattern => pattern.test(originalUrl));

  const userAgent = headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(userAgent);

  if (shouldSSR || isBot) {
    console.log(`[SSR] Rendering: ${originalUrl} (Bot: ${isBot})`);

    const postMatch = originalUrl.match(/^\/post\/(.+)$/);

    if (postMatch) {
      const slug = postMatch[1];
      console.log(`[SSR] Post detected, generating meta tags for: ${slug}`);

      // Generate meta tags asynchronously with safe fallback
      generatePostMetaTags(slug)
        .then(metaData => {
          // Render the Angular app
          return commonEngine.render({
            bootstrap,
            documentFilePath: indexHtml,
            url: `${protocol}://${headers.host}${originalUrl}`,
            publicPath: browserDistFolder,
            providers: [
              { provide: APP_BASE_HREF, useValue: baseUrl },
            ],
          }).then(html => {
            // If we have metaData, use cheerio to manipulate head safely
            if (metaData) {
              try {
                const $ = cheerio.load(html);

                // Remove existing meta tags that we will replace
                $('meta[property="og:image"]').remove();
                $('meta[property="og:image:secure_url"]').remove();
                $('meta[property="og:image:width"]').remove();
                $('meta[property="og:image:height"]').remove();
                $('meta[property="og:image:alt"]').remove();
                $('meta[property="og:image:type"]').remove();
                $('meta[property="og:title"]').remove();
                $('meta[property="og:description"]').remove();
                $('meta[name="description"]').remove();
                $('meta[name="twitter:image"]').remove();
                $('meta[name="twitter:title"]').remove();
                $('meta[name="twitter:description"]').remove();

                // Replace title
                if ($('title').length) {
                  $('title').first().text(metaData.title);
                } else {
                  $('head').prepend(`<title>${escapeHtml(metaData.title)}</title>`);
                }

                // Inject our meta tags into head (as HTML string; values already escaped)
                $('head').append(metaData.html);

                html = $.html();
                console.log(`[SSR] Injected meta tags for: ${slug}`);
              } catch (err) {
                console.error('[SSR] Error injecting meta tags via cheerio:', err);
              }
            }
            return html;
          });
        })
        .then((html) => {
          res.set({
            'Cache-Control': 'public, max-age=60, s-maxage=300, must-revalidate',
            'Vary': 'User-Agent',
          });
          res.send(html);
        })
        .catch((err) => {
          console.error('[SSR] Error with post meta tags:', err);
          // On error, render without meta replacement as a safe fallback
          commonEngine
            .render({
              bootstrap,
              documentFilePath: indexHtml,
              url: `${protocol}://${headers.host}${originalUrl}`,
              publicPath: browserDistFolder,
              providers: [
                { provide: APP_BASE_HREF, useValue: baseUrl },
              ],
            })
            .then(html => res.send(html))
            .catch(innerErr => next(innerErr));
        });
    } else {
      // Regular SSR for non-post routes
      commonEngine
        .render({
          bootstrap,
          documentFilePath: indexHtml,
          url: `${protocol}://${headers.host}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [
            { provide: APP_BASE_HREF, useValue: baseUrl },
          ],
        })
        .then((html) => {
          res.set({
            'Cache-Control': 'public, max-age=60, s-maxage=300, must-revalidate',
            'Vary': 'User-Agent',
          });
          res.send(html);
        })
        .catch((err) => next(err));
    }
  } else {
    // For non-SSR routes, serve the regular SPA shell (index.html) with no-cache header
    console.log(`[CSR] Serving SPA: ${originalUrl}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(join(browserDistFolder, 'index.html'));
  }
});

/**
 * Start the server if this module is the main entry point.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
