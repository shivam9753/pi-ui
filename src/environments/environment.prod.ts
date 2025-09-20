export const environment = {
  production: true,
  apiBaseUrl: 'https://poemsindia.in/api',  // Production API endpoint

  // Build version for cache busting (set during build process)
  buildVersion: Date.now().toString()
};