import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // PERMANENT once uploaded to Google Play -- confirm before the first Play Console upload.
  appId: 'com.geriatricpark.game',
  appName: 'Geriatric Park',
  webDir: 'dist',
  plugins: {
    // Route fetch() through the native HTTP stack so calls to the Vercel API and Supabase
    // are not blocked by browser CORS rules inside the app's WebView.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
