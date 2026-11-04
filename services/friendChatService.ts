import { getAccessToken } from './authService';
import { apiUrl } from './api';

export interface FriendChatMessage { id: number; mine: boolean; preset: string; createdAt: string }

async function call<T>(body: object): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  const response = await fetch(apiUrl('/api/friendchat'), { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Chat failed (${response.status}).`);
  return data as T;
}
export const fetchFriendChat = (friendId: string, after?: number) => call<{ messages: FriendChatMessage[] }>({ action: 'list', friendId, after });
export const sendFriendChat = (friendId: string, preset: string, after?: number) => call<{ messages: FriendChatMessage[] }>({ action: 'send', friendId, preset, after });
export const fetchFriendChatSummary = () => call<{ latest: Record<string, number> }>({ action: 'summary' });

const SEEN_KEY = 'gp_friendchat_seen';
export function readSeen(): Record<string, number> { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
export function markSeen(friendId: string, id: number) { try { const s = readSeen(); if ((s[friendId] ?? 0) < id) { s[friendId] = id; localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } } catch { /* storage unavailable */ } }
