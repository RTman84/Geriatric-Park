import { getAccessToken } from './authService';
import { apiUrl } from './api';

// Shadow-mode ledger client: asks the server for a one-time ad "nonce" before an ad plays (it goes to AdMob as
// custom_data so Google's server-side callback can be matched to this player), and can read back what the
// server has verified. The game's local PP is NOT derived from this yet.
async function authHeaders(): Promise<HeadersInit | null> {
  const token = await getAccessToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
}

export async function beginAdView(): Promise<{ nonce: string; userId: string } | null> {
  try {
    const headers = await authHeaders(); if (!headers) return null; // signed-out players can still watch (unverified)
    const res = await fetch(apiUrl('/api/ledger'), { method: 'POST', headers });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.nonce && body?.userId ? { nonce: String(body.nonce), userId: String(body.userId) } : null;
  } catch { return null; }
}

export interface VerifiedTotals { player_pp: number; community_reserve: number; development: number }
export async function fetchVerifiedTotals(nonce?: string): Promise<{ verifiedTotals: VerifiedTotals; status: string | null } | null> {
  try {
    const headers = await authHeaders(); if (!headers) return null;
    const res = await fetch(apiUrl('/api/ledger' + (nonce ? `?nonce=${encodeURIComponent(nonce)}` : '')), { headers, cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}
