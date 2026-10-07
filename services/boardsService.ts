import { getAccessToken } from './authService';
import { apiUrl } from './api';

export type BoardMode = 'golden' | 'arena' | 'raid' | 'friend';
export interface BoardRow { display_name: string; score: number; me: boolean }
export interface BoardData { mode: BoardMode; period: string; bracket: number; top: BoardRow[]; mine: { score: number; bracket: number } | null; rank: number | null }

async function headers(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
export async function fetchBoard(mode: BoardMode, bracket?: number): Promise<BoardData> {
  const res = await fetch(apiUrl(`/api/boards?mode=${mode}${bracket ? `&bracket=${bracket}` : ''}`), { headers: await headers(), cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || body.error || `Leaderboard request failed (${res.status}).`);
  return body as BoardData;
}
export async function submitBoardScore(mode: BoardMode, score: number): Promise<void> {
  const res = await fetch(apiUrl('/api/boards'), { method: 'PUT', headers: await headers(), body: JSON.stringify({ mode, score: Math.floor(score) }) });
  if (!res.ok) throw new Error(`Leaderboard submit failed (${res.status}).`);
}
