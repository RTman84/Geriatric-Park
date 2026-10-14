import { createClient, type Session, type User } from '@supabase/supabase-js';
import { accountConfig } from './accountConfig';
import { isNativeApp, NATIVE_AUTH_REDIRECT, parseAuthCallback } from './nativeAuth';
import { apiUrl } from './api';

export type AuthProvider = 'google' | 'email';

export interface AccountUser {
  id: string;
  email?: string;
  provider?: string;
  country?: string;
  ageVerified?: boolean;
  displayName?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AccountUser;
}

export const supabase = accountConfig
  ? createClient(accountConfig.supabaseUrl, accountConfig.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // The Android app finishes sign-in with a one-time code (PKCE) carried by the return link; the website keeps its current flow.
        flowType: isNativeApp() ? 'pkce' : 'implicit',
        storageKey: 'geriatric_park_supabase_auth',
      },
    })
  : null;

function normalizeUser(user: User): AccountUser {
  return {
    id: user.id,
    email: user.email,
    provider: user.app_metadata?.provider ?? user.app_metadata?.providers?.[0],
    country: user.user_metadata?.country,
    ageVerified: user.user_metadata?.age_verified === true,
    displayName: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined,
  };
}

function normalizeSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
    user: normalizeUser(session.user),
  };
}

function requireClient() {
  if (!supabase) throw new Error('Cloud account services are not configured.');
  return supabase;
}

export async function signUpWithEmail(email: string, password: string): Promise<{ session: AuthSession | null; needsConfirmation: boolean }> {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password, options: isNativeApp() ? { emailRedirectTo: NATIVE_AUTH_REDIRECT } : undefined });
  if (error) throw error;
  return {
    session: data.session ? normalizeSession(data.session) : null,
    needsConfirmation: !data.session,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error('Sign-in failed.');
  return normalizeSession(data.session);
}

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await requireClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, ...(isNativeApp() ? { emailRedirectTo: NATIVE_AUTH_REDIRECT } : {}) },
  });
  if (error) throw error;
}

export async function startGoogleSignIn(redirectTo = window.location.origin): Promise<void> {
  if (isNativeApp()) {
    // Open Google's page in a real browser tab (not the WebView, which Google blocks); the return link finishes it (see below).
    const { data, error } = await requireClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw error ?? new Error('Could not start Google sign-in.');
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
    return;
  }
  const { error } = await requireClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

// Android only: finishes sign-in when the browser tab hands control back to the app through the return link (also covers the app being
// closed while the browser was open). `onMessage` receives a short message to show the player (null = nothing to say). Returns cleanup.
export function startNativeAuthListener(onMessage: (text: string | null) => void): () => void {
  if (!isNativeApp() || !supabase) return () => {};
  const client = supabase;
  let cancelled = false;
  let remove: (() => void) | null = null;
  const handle = async (url: unknown) => {
    const cb = parseAuthCallback(url);
    if (!cb) return;
    try { const { Browser } = await import('@capacitor/browser'); await Browser.close(); } catch { /* not supported on every device; the tab closes itself */ }
    try {
      if (cb.error) throw new Error(cb.error);
      if (cb.code) {
        const { error } = await client.auth.exchangeCodeForSession(cb.code);
        if (error) throw error;
      } else if (cb.accessToken && cb.refreshToken) {
        const { error } = await client.auth.setSession({ access_token: cb.accessToken, refresh_token: cb.refreshToken });
        if (error) throw error;
      } else return;
      onMessage('Signed in.');
    } catch (e) {
      onMessage(e instanceof Error ? `Sign-in failed: ${e.message}` : 'Sign-in failed.');
    }
  };
  import('@capacitor/app').then(async ({ App }) => {
    if (cancelled) return;
    const h = await App.addListener('appUrlOpen', ev => { void handle(ev?.url); });
    if (cancelled) { void h.remove(); return; }
    remove = () => { void h.remove(); };
    const launch = await App.getLaunchUrl().catch(() => undefined);
    if (launch?.url) void handle(launch.url);
  }).catch(e => console.error('[Auth] native listener unavailable', e));
  return () => { cancelled = true; if (remove) remove(); };
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return normalizeSession(data.session);
}

export async function refreshSession(): Promise<AuthSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;
  return normalizeSession(data.session);
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Permanently deletes the signed-in account and its server data (api/account/delete.ts), then ends the local session.
export async function deleteAccount(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to delete your account.');
  const response = await fetch(apiUrl('/api/account/delete'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Could not delete the account. Please try again.');
  await signOut().catch(() => { /* the account is already gone on the server; the local session is cleared on reload anyway */ });
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function isCloudAccountsConfigured(): boolean {
  return supabase !== null;
}

// Player-chosen leaderboard display name, stored in Supabase Auth's
// user_metadata (no new table needed). Never derived from email -- per
// user request, the leaderboard must never show anything email-derived,
// even as a fallback (see the server-side default in tournament-board.ts).
const DISPLAY_NAME_MAX_LENGTH = 20;
export function sanitizeDisplayName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _'-]/g, '').trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
}
export async function updateDisplayName(name: string): Promise<AccountUser | null> {
  if (!supabase) return null;
  const clean = sanitizeDisplayName(name);
  if (!clean) throw new Error('Please enter a display name.');
  const { data, error } = await supabase.auth.updateUser({ data: { display_name: clean } });
  if (error) throw error;
  return data.user ? normalizeUser(data.user) : null;
}
