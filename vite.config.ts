import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode native` builds the Capacitor (Android) bundle. The AdSense script is
// stripped there: AdSense code is not allowed inside apps (apps use AdMob instead).
const stripAdSenseForNative = (isNative: boolean) => ({
  name: 'strip-adsense-for-native',
  transformIndexHtml(html: string) {
    return isNative
      ? html.replace(/<script[^>]*pagead2\.googlesyndication\.com[^>]*><\/script>\s*/g, '')
      : html;
  },
});

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), stripAdSenseForNative(mode === 'native')],
  // Do not expose secrets through Vite's `define` or import.meta.env.
  // Gemini is accessed through the same-origin serverless API in production.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
