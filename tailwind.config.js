/** @type {import('tailwindcss').Config} */
// Replaces the runtime CDN script: classes are generated at build time from the source files below, so the app styles itself offline.
// Default settings match what the CDN used (including dark: variants following the device's dark-mode setting).
export default {
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx}', './services/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
