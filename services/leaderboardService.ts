import { getAccessToken } from './authService';

export interface LeaderboardEntry {
  display_name: string;
  score: number;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  mine: LeaderboardEntry | null;
  day: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Leaderboard request failed (${response.status}).`);
  return body as T;
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const headers = await authHeaders();
  const response = await fetch('/api/tournament-board', { headers, cache: 'no-store' });
  return parse<LeaderboardData>(response);
}

export async function submitTournamentScore(score: number): Promise<LeaderboardEntry> {
  const headers = await authHeaders();
  const response = await fetch('/api/tournament-board', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ score }),
  });
  return (await parse<{ mine: LeaderboardEntry }>(response)).mine;
}
