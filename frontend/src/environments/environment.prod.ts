// Production environment — swapped in by Angular's fileReplacements
// during `ng build --configuration=production`.
export const environment = {
  production: true,
  // Your Render backend WebSocket URL.
  // Used when frontend is hosted on a static CDN (Cloudflare Pages, Vercel, etc.)
  // that cannot proxy WebSocket connections to the backend.
  backendWsUrl: 'wss://syncpad-backend-7041.onrender.com/ws',
};