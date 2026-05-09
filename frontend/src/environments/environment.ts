// Local development environment — used by `ng serve` (default) and Docker Compose.
// In production builds, Angular swaps this file with environment.prod.ts
// via the fileReplacements configuration in angular.json.
export const environment = {
  production: false,
  // Empty = derive WebSocket URL from window.location (works for ng serve + Docker)
  backendWsUrl: '',
};
