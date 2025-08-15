export const environment = {
  production: false,
  staging: false,
  ssr: true,
  apiUrl: 'http://localhost:3000/api', // Direct API URL for SSR
  frontendUrl: 'http://localhost:4000', // SSR server URL
  enableSSRCache: true,
  ssrCacheTTL: 5 * 60 * 1000, // 5 minutes
  relatedContentCacheTTL: 10 * 60 * 1000, // 10 minutes
};