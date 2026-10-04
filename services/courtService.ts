import { getAccessToken } from './authService';
import { apiUrl } from './api';

export interface Throne {
  bracket: number; user_id: string; display_name: string | null; power: number;
  claimed_at: string; expires_at: string; shield_until: string | null; purse_claimed: boolean; mine: boolean; purse: number;
}
export interface CourtState { myBracket: number; myPower: number; challengesLeft: number; dailyChallenges: number; thrones: Throne[] }

async function post<T>(body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  const res = await fetch(apiUrl('/api/court'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.error || `Court request failed (${res.status}).`);
  return json as T;
}
export const fetchCourtState = () => post<CourtState>({ action: 'state' });
export const challengeThrone = () => post<{ result: 'claimed' | 'dethroned' | 'lost'; challengesLeft: number; previousChampion: string | null }>({ action: 'challenge' });
export const claimThronePurse = () => post<{ tickets: number; bracket: number }>({ action: 'claim_purse' });
