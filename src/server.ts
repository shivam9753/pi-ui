import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import fetch from 'node-fetch';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

// Helper function to fetch post data and generate meta tags
async function generatePostMetaTags(slug: string): Promise<{ title: string; html: string } | null> {
  try {
    const apiUrl = `https://app.poemsindia.in/api/submissions/by-slug/${slug}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log(`[Meta] API error for ${slug}:`, response.status);
      return null;
    }
    
    const postData = await response.json() as any;
    console.log(`[Meta] Fetched data for: ${postData.title}`);
    
    const title = `${postData.title} — Poems by ${postData.authorName || 'Anonymous'} - pi`;
    const description = postData.description || postData.excerpt || 
      `Read "${postData.title}" by ${postData.authorName || 'Anonymous'} on Poems in India - a curated collection of poetry and literature.`;
    
    const imageUrl = postData.ogImage || postData.imageUrl || 'https://poemsindia.in/assets/loginimage.jpeg';
    const canonicalUrl = `https://app.poemsindia.in/post/${slug}`;
    
    const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="poetry, literature, ${postData.authorName || 'Anonymous'}, Poems in India">
    
    <meta property="og:title" content="${postData.title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Poems in India">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Cover image for ${postData.title}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:locale" content="en_US">
    
    <!-- Additional image meta tags for better compatibility -->
    <meta name="image" content="${imageUrl}">
    <meta itemprop="image" content="${imageUrl}">
    <link rel="image_src" href="${imageUrl}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${postData.title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:site" content="@poemsindia">
    <meta name="twitter:creator" content="@${postData.authorName || 'Anonymous'}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="Cover image for ${postData.title}">
    
    <meta name="author" content="${postData.authorName || 'Anonymous'}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${canonicalUrl}">
    `;
    
    console.log(`[Meta] Generated meta tags for: ${postData.title}, Image: ${imageUrl}`);
    return { title, html: metaTags };
    
  } catch (error) {
    console.error(`[Meta] Error fetching data for ${slug}:`, error);
    return null;
  }
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser with careful cache headers.
 * - Keep long caching for immutable assets (js/css/images with hashed names)
 * - Ensure index.html is served with no-cache so SPA shell updates are picked up immediately
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
 * Legacy URL redirects - Handle /:slug -> /post/:slug server-side
 */
app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  
  // Known application routes that aren't post slugs
  const knownRoutes = [
    'login', 'explore', 'submit', 'admin', 'profile', 'prompts',
    'faqs', 'contact-us', 'privacy-policy', 'terms-of-use',
    'complete-profile', 'review', 'publish', 'users', 'poem-parser', 'json-parser'
  ];
  
  // If this looks like a post slug (not a known app route), redirect
  if (slug && !knownRoutes.includes(slug) && !slug.includes('.')) {
    console.log(`[Legacy Redirect] ${req.originalUrl} -> /post/${slug}`);
    return res.redirect(301, `/post/${slug}`);
  }
  
  // Continue to main handler for known routes
  next();
});

/**
 * Hybrid SSR: Only render specific routes server-side
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;
  
  // Routes that should be server-side rendered
  const ssrRoutes = [
    /^\/post\/[^\/]+$/, // /post/:slug
  ];
  
  // Check if current route should be SSR
  const shouldSSR = ssrRoutes.some(pattern => pattern.test(originalUrl));
  
  // Bot detection for better SEO coverage
  const userAgent = headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(userAgent);
  
  if (shouldSSR || isBot) {
    console.log(`[SSR] Rendering: ${originalUrl} (Bot: ${isBot})`);
    
    // Check if this is a post route that needs dynamic meta tags
    const postMatch = originalUrl.match(/^\/post\/(.+)$/);
    
    if (postMatch) {
      const slug = postMatch[1];
      console.log(`[SSR] Post detected, generating meta tags for: ${slug}`);
      
      // Generate meta tags asynchronously
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
            if (metaData) {
              // Replace default title
              html = html.replace(/<title>.*?<\/title>/, `<title>${metaData.title}</title>`);
              
              // Remove existing og:image tags to prevent duplicates
              html = html.replace(/<meta property="og:image"[^>]*>/g, '');
              html = html.replace(/<meta property="og:image:secure_url"[^>]*>/g, '');
              html = html.replace(/<meta property="og:image:width"[^>]*>/g, '');
              html = html.replace(/<meta property="og:image:height"[^>]*>/g, '');
              html = html.replace(/<meta property="og:image:alt"[^>]*>/g, '');
              html = html.replace(/<meta property="og:image:type"[^>]*>/g, '');
              
              // Remove existing og:title and og:description to prevent duplicates
              html = html.replace(/<meta property="og:title"[^>]*>/g, '');
              html = html.replace(/<meta property="og:description"[^>]*>/g, '');
              html = html.replace(/<meta name="description"[^>]*>/g, '');
              
              // Remove existing Twitter meta tags
              html = html.replace(/<meta name="twitter:image"[^>]*>/g, '');
              html = html.replace(/<meta name="twitter:title"[^>]*>/g, '');
              html = html.replace(/<meta name="twitter:description"[^>]*>/g, '');
              
              // Add our clean meta tags
              html = html.replace(/<head>/, `<head>\n${metaData.html}`);
              console.log(`[SSR] Replaced meta tags for: ${slug}`);
            }
            return html;
          });
        })
        .then((html) => {
          res.set({
            'Cache-Control': 'public, max-age=300, s-maxage=600',
            'Vary': 'User-Agent',
          });
          res.send(html);
        })
        .catch((err) => {
          console.error('[SSR] Error with post meta tags:', err);
          next(err);
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
            'Cache-Control': 'public, max-age=300, s-maxage=600',
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
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
