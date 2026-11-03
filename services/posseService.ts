import { getAccessToken } from './authService';
import { apiUrl } from './api';

export type PosseRole = 'owner' | 'co' | 'member';
export interface PosseRosterEntry { userId: string; role: PosseRole; name: string; level: number; squadPower: number; title: string | null; weekPoints: number; joinedAt: string; nameColor: string | null; nameFont: string | null }
export interface PosseSummary { id: string; name: string; tag: string; faction: string; emblem: string; memberCount: number; maxMembers: number; createdAt: string; level: number; totalPoints: number; nextLevelAt: number | null }
export interface PosseInvite { id: string; kind: 'invite' | 'request'; fromName: string; posse: { id: string; name: string; tag: string; faction: string; emblem: string; member_count: number } }
export interface PosseInfo { posse: PosseSummary | null; myRole?: PosseRole; myUserId?: string; roster?: PosseRosterEntry[]; weekPoints?: number; weekGoal?: number; faction: string | null; pendingInvites: PosseInvite[]; notice: string | null; lfp?: boolean }
export interface PosseSearchResult { id: string; name: string; tag: string; faction: string; emblem: string; member_count: number }

async function call<T>(body?: object): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  const response = await fetch(apiUrl('/api/posse'), {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || `Posse request failed (${response.status}).`);
  return data as T;
}

export const fetchPosse = () => call<PosseInfo>();
export const createPosse = (name: string, tag: string, emblem: string) => call<PosseInfo>({ action: 'create', name, tag, emblem });
export const searchPosseByTag = (tag: string) => call<{ results: PosseSearchResult[] }>({ action: 'search_by_tag', tag });
export const requestToJoinPosse = (posseId: string) => call<{ result: string }>({ action: 'request', posseId });
export const invitePlayerToPosse = (who: { code?: string; userId?: string }) => call<{ result: string; to: string }>({ action: 'invite', ...who });
export const respondToPosseInvite = (inviteId: string, accept: boolean) => call<PosseInfo>({ action: 'respond', inviteId, accept });
export const leavePosse = () => call<PosseInfo>({ action: 'leave' });
export const posseMemberAction = (action: 'kick' | 'promote' | 'demote' | 'transfer_owner', userId: string) => call<PosseInfo>({ action, userId });
export const setPosseEmblem = (emblem: string) => call<PosseInfo>({ action: 'set_emblem', emblem });
export const setMyPosseStyle = (color: string, font: string) => call<PosseInfo>({ action: 'set_my_style', color, font });
export interface RecruitPlayer { userId: string; name: string; level: number; squadPower: number; invited: boolean }
export interface PosseChatMessage { id: number; userId: string; name: string; preset: string; createdAt: string; nameColor: string | null; nameFont: string | null }
export const browsePosses = () => call<{ posses: PosseSearchResult[] }>({ action: 'browse_posses' });
export const setLookingForPosse = (on: boolean) => call<{ lfp: boolean }>({ action: 'set_lfp', on });
export const browseRecruits = () => call<{ players: RecruitPlayer[] }>({ action: 'browse_lfp' });
export const searchPlayers = (query: string) => call<{ players: RecruitPlayer[] }>({ action: 'search_players', query });
export const sendPosseChat = (preset: string, after?: number) => call<{ messages: PosseChatMessage[] }>({ action: 'chat_send', preset, after });
export const fetchPosseChat = (after?: number) => call<{ messages: PosseChatMessage[] }>({ action: 'chat_list', after });
