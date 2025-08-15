import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

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
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

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
        // Add cache headers for SSR content
        res.set({
          'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min browser, 10min CDN
          'Vary': 'User-Agent',
        });
        res.send(html);
      })
      .catch((err) => next(err));
  } else {
    // For non-SSR routes, serve the regular SPA
    console.log(`[CSR] Serving SPA: ${originalUrl}`);
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
