import { getAccessToken } from './authService';
import { apiUrl } from './api';

// Shapes mirror api/resident-exchange.ts's ROW_FIELDS.
export interface LoanSnapshot { level: number; rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; powerType: string; strength: number; wit: number; agility: number; tenacity: number; maxHp: number; hp: number }

export interface ResidentExchangeRow {
  id: string;
  owner_id: string;
  host_id: string;
  elder_id: string;
  elder_name: string;
  elder_type: string;
  elder_evolution_stage: number;
  duration_hours: 8 | 12 | 24;
  gift_type?: 'materials' | 'quest' | 'boost';
  mode?: 'visit' | 'loan';
  snapshot?: LoanSnapshot | null;
  placed_at: string;
  ends_at: string;
  host?: { display_name: string | null } | null;   // present on `mine` rows
  owner?: { display_name: string | null } | null;   // present on `hosting` rows
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to your account to use Resident Exchange.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Resident Exchange request failed (${response.status}).`);
  return body;
}

export async function fetchResidentExchange(): Promise<{ mine: ResidentExchangeRow[]; hosting: ResidentExchangeRow[] }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/resident-exchange'), { headers, cache: 'no-store' });
  return parse(response);
}

async function post(payload: Record<string, unknown>) {
  const headers = await authHeaders();
  return parse(await fetch(apiUrl('/api/resident-exchange'), { method: 'POST', headers, body: JSON.stringify(payload) }));
}

export const placeResident = (
  hostId: string, elderId: string, elderName: string, elderType: string, elderEvolutionStage: number, durationHours: 8 | 12 | 24, giftType: 'materials' | 'quest' | 'boost' = 'materials', loan?: LoanSnapshot
): Promise<{ placement: ResidentExchangeRow }> =>
  post({ action: 'place', hostId, elderId, elderName, elderType, elderEvolutionStage, durationHours, giftType, ...(loan ? { mode: 'loan', snapshot: loan } : {}) });

export const recallResident = (placementId: string): Promise<{ elderId: string; xpEarned: number }> =>
  post({ action: 'recall', placementId });
