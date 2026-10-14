import { Capacitor } from '@capacitor/core';

// Google blocks OAuth inside an app's embedded WebView, so on Android the sign-in page opens in a real browser tab (Chrome Custom Tabs)
// and the browser sends the player back to the app through this link. The same link is used for email magic links and sign-up
// confirmations. It MUST also be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs, and the matching
// intent-filter is in android/app/src/main/AndroidManifest.xml.
export const NATIVE_AUTH_SCHEME = 'com.geriatricpark.game';
export const NATIVE_AUTH_REDIRECT = `${NATIVE_AUTH_SCHEME}://auth-callback`;
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export interface AuthCallback { code?: string; accessToken?: string; refreshToken?: string; error?: string }

// Reads the link the browser opened the app with. Returns null for any other link. Untrusted input: never throws.
export function parseAuthCallback(url: unknown): AuthCallback | null {
  if (typeof url !== 'string' || !url.startsWith(`${NATIVE_AUTH_SCHEME}://`)) return null;
  try {
    const q = new URLSearchParams(url.split('#')[0].split('?')[1] ?? '');
    const h = new URLSearchParams(url.split('#')[1] ?? '');
    const get = (k: string) => q.get(k) ?? h.get(k) ?? undefined;
    const error = get('error_description') ?? get('error');
    return { code: get('code'), accessToken: get('access_token'), refreshToken: get('refresh_token'), error };
  } catch { return null; }
}
