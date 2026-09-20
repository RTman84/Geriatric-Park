// In the browser the game and its serverless API share an origin, so '/api/...' just works.
// Inside the native (Capacitor) app the page is served from the device, so API calls must go
// to the deployed backend instead. Set VITE_API_BASE_URL in .env.native (no trailing slash).
const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const API_BASE = rawBase.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
