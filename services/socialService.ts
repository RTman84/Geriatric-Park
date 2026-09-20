import { getAccessToken } from './authService';
import { apiUrl } from './api';

// Mirrors PROFILE_FIELDS in api/friends.ts. favorite_elders carries just
// enough per Elder to re-render it client-side with the same
// ElderAvatarImg/resolveProfileDisplay logic the owner's own profile uses --
// not a full Elder object.
export interface PlayerProfileSnapshot {
  user_id: string;
  friend_code: string;
  display_name: string | null;
  level: number;
  selected_title: string | null;
  selected_account_icon: string | null;
  achievements_completed: number;
  achievements_total: number;
  squad_power: number;
  favorite_elders: { type: string; evolutionStage: 0 | 1 | 2; name: string }[];
  built_amenities: string[];
  updated_at: string;
}

export interface FriendRequestEntry {
  id: string;
  userId: string;
  displayName: string | null;
  createdAt: string;
}

export interface FriendsData {
  myCode: string;
  myOpenToRandom: boolean;
  friends: PlayerProfileSnapshot[];
  incoming: FriendRequestEntry[];
  outgoing: FriendRequestEntry[];
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Friends request failed (${response.status}).`);
  return body as T;
}

export async function fetchFriendsData(): Promise<FriendsData> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), { headers, cache: 'no-store' });
  return parse<FriendsData>(response);
}

export async function sendFriendRequest(code: string): Promise<{ result: 'sent' | 'friends' }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'send', code: code.trim().toUpperCase() }),
  });
  return parse(response);
}

// From the Daily Tournament leaderboard: add someone you can already see by
// their (already-public on that leaderboard) user_id, no friend code needed.
export async function sendFriendRequestByUserId(targetUserId: string): Promise<{ result: 'sent' | 'friends' }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'sendByUserId', targetUserId }),
  });
  return parse(response);
}

// Opt-in only -- pairs the caller with another player who has separately
// turned on openToRandomFriends. Never matches anyone who hasn't opted in.
export async function sendRandomMatchRequest(): Promise<{ result: 'sent' | 'friends' }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'randomMatch' }),
  });
  return parse(response);
}

export async function setOpenToRandomFriends(value: boolean): Promise<{ openToRandomFriends: boolean }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ openToRandomFriends: value }),
  });
  return parse(response);
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<{ result: string }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: accept ? 'accept' : 'decline', requestId }),
  });
  return parse(response);
}

export async function removeFriend(friendUserId: string): Promise<{ result: string }> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/friends'), {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ friendUserId }),
  });
  return parse(response);
}
