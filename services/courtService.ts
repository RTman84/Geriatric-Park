import { getAccessToken } from './authService';
import { apiUrl } from './api';

export interface LadderEntry { rank: number; user_id: string; display_name: string | null; power: number; mine: boolean }
export interface CourtState {
  myBracket: number; myPower: number; challengesLeft: number; dailyChallenges: number; challengeReach: number;
  mine: { bracket: number; rank: number; purseAvailable: boolean; purse: number } | null;
  top3: { bracket: number; entries: LadderEntry[] }[];
  myLadder: LadderEntry[];
}
async function post<T>(body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  const res = await fetch(apiUrl('/api/court'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.error || `Court request failed (${res.status}).`);
  return json as T;
}
export const fetchCourtState = () => post<CourtState>({ action: 'state' });
export const challengeLadder = (targetRank?: number) => post<{ result: 'joined' | 'won' | 'lost'; rank?: number; beaten?: string | null; challengesLeft: number; view?: CourtState }>({ action: 'challenge', targetRank });
export const claimLadderPurse = () => post<{ tickets: number; bracket: number; rank: number }>({ action: 'claim_purse' });
