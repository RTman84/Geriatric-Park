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

const SESSION_KEY = 'geriatric_park_auth_session_v1';

function authUrl(path: string): string {
  if (!accountConfig) throw new Error('Cloud account services are not configured.');
  return `${accountConfig.supabaseUrl}/auth/v1${path}`;
}

function headers(accessToken?: string): HeadersInit {
  if (!accountConfig) throw new Error('Cloud account services are not configured.');
  return {
    apikey: accountConfig.supabasePublishableKey,
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

function normalizeUser(user: any): AccountUser {
  return {
    id: String(user.id),
    email: user.email,
    provider: user.app_metadata?.provider ?? user.app_metadata?.providers?.[0],
    country: user.user_metadata?.country,
    ageVerified: user.user_metadata?.age_verified === true
  };
}

function saveSession(session: AuthSession | null) {
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function parseResponse(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.msg || body.error_description || body.message || 'Authentication request failed.');
  }
  return body;
}

function buildSession(body: any): AuthSession {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
    user: normalizeUser(body.user)
  };
}

async function hydrateOAuthRedirect(): Promise<void> {
  if (!accountConfig || !window.location.hash.includes('access_token=')) return;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;

  try {
    const response = await fetch(authUrl('/user'), { headers: headers(accessToken) });
    const user = await parseResponse(response);
    saveSession({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Number(params.get('expires_in') || 3600) * 1000,
      user: normalizeUser(user)
    });
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  } catch {
    // Leave the URL untouched so the failed auth can be retried rather than inventing a session.
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ session: AuthSession | null; needsConfirmation: boolean }> {
  const response = await fetch(authUrl('/signup'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password })
  });
  const body = await parseResponse(response);
  const session = body.access_token ? buildSession(body) : null;
  saveSession(session);
  return { session, needsConfirmation: !session };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(authUrl('/token?grant_type=password'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password })
  });
  const session = buildSession(await parseResponse(response));
  saveSession(session);
  return session;
}

export async function sendMagicLink(email: string): Promise<void> {
  const response = await fetch(authUrl('/otp'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, create_user: true })
  });
  await parseResponse(response);
}

export function startGoogleSignIn(redirectTo = window.location.origin): void {
  const url = new URL(authUrl('/authorize'));
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  window.location.assign(url.toString());
}

export async function refreshSession(): Promise<AuthSession | null> {
  const existing = readSession();
  if (!existing) return null;
  if (existing.expiresAt > Date.now() + 60_000) return existing;

  try {
    const response = await fetch(authUrl('/token?grant_type=refresh_token'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: existing.refreshToken })
    });
    const session = buildSession(await parseResponse(response));
    saveSession(session);
    return session;
  } catch {
    saveSession(null);
    return null;
  }
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!accountConfig) return null;
  await hydrateOAuthRedirect();
  const session = await refreshSession();
  if (!session) return null;

  try {
    const response = await fetch(authUrl('/user'), { headers: headers(session.accessToken) });
    const user = await parseResponse(response);
    const updated = { ...session, user: normalizeUser(user) };
    saveSession(updated);
    return updated;
  } catch {
    saveSession(null);
    return null;
  }
}

export async function signOut(): Promise<void> {
  const session = readSession();
  if (session && accountConfig) {
    await fetch(authUrl('/logout'), {
      method: 'POST',
      headers: headers(session.accessToken)
    }).catch(() => undefined);
  }
  saveSession(null);
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null;
}

export function isCloudAccountsConfigured(): boolean {
  return accountConfig !== null;
}
