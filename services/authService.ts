import { createClient, type Session, type User } from '@supabase/supabase-js';
import { accountConfig } from './accountConfig';

export type AuthProvider = 'google' | 'email';

export interface AccountUser {
  id: string;
  email?: string;
  provider?: string;
  country?: string;
  ageVerified?: boolean;
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
  const { data, error } = await client.auth.signUp({ email, password });
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
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function startGoogleSignIn(redirectTo = window.location.origin): Promise<void> {
  const { error } = await requireClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
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

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function isCloudAccountsConfigured(): boolean {
  return supabase !== null;
}
