import { getAccessToken } from './authService';
import { apiUrl } from './api';
import type { FactionId } from '../constants';

// Shapes mirror api/arena.ts.
export interface ArenaElderSnapshot { id: string; name: string; type: string; rarity: string; level: number; evolutionStage: number }
export interface ArenaDefender { id: string; mine: boolean; owner: string; elder: ArenaElderSnapshot; power: number; placedAt: string }
export interface ArenaInfo {
  name: string | null;
  faction: FactionId | null;
  priorityFaction: FactionId | null;
  priorityUntil: string | null;
  shieldUntil: string | null;
  defenders: ArenaDefender[];
}
export interface ArenaMe {
  faction: FactionId | null;
  factionChangedAt: string | null;
  squadPower: number;
  attacksToday: number;
  winsToday: number;
  duesClaimedToday: boolean;
  dues: { tickets: number; materials: number; hours: number };
  defenders: { arenaId: string; elderId: string; placedAt: string }[];
}
export interface ArenaAttackResult {
  arenaName: string; fought: number; beaten: number; total: number; flipped: boolean; rewardedWins: number;
  tickets: number; materials: number; attackNumber: number;
  log: { owner: string; elder: string; power: number; attackerPower: number; won: boolean }[];
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to your account to use Arenas.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail && !body.error?.includes('Arenas unavailable') ? body.detail : (body.error || `Arena request failed (${response.status}).`));
  return body;
}

export async function fetchArenas(ids: string[]): Promise<{ arenas: Record<string, ArenaInfo>; me: ArenaMe }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl(`/api/arena?ids=${encodeURIComponent(ids.join(','))}`), { headers, cache: 'no-store' });
  return parse(response);
}

async function post(payload: Record<string, unknown>) {
  const headers = await authHeaders();
  return parse(await fetch(apiUrl('/api/arena'), { method: 'POST', headers, body: JSON.stringify(payload) }));
}

export const chooseFaction = (faction: FactionId): Promise<{ faction: FactionId }> => post({ action: 'faction', faction });
export const stationElder = (arenaId: string, elder: ArenaElderSnapshot, power: number): Promise<{ ok: true; claimed: boolean; elderId: string }> =>
  post({ action: 'station', arenaId, elder, power });
export const recallElder = (arenaId: string): Promise<{ ok: true; elderId: string }> => post({ action: 'recall', arenaId });
export const attackArena = (arenaId: string): Promise<{ result: ArenaAttackResult }> => post({ action: 'attack', arenaId });
export const claimArenaDues = (): Promise<{ tickets: number; materials: number; hours: number }> => post({ action: 'claim_dues' });
