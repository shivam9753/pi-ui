export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',  // your local Node.js server
  apiUrl: 'http://localhost:3000',          // Base URL for API calls

  // Mobile debugging options
  enableDebugLogging: true,
  enableMobileDebugging: true,

  // Fallback API URL for mobile testing (if needed)
  // You can change this to your computer's IP address for mobile device testing
  // Example: 'http://192.168.1.100:3000/api'
  mobileApiBaseUrl: 'http://localhost:3000/api',

  // Build version for cache busting
  buildVersion: Date.now().toString()
};