import { getAccessToken } from './authService';
import { apiUrl } from './api';

// Mementos live on the SERVER. The game mirrors this state and overwrites its local copy with it on every sync.
export interface MementosState { balance: number; premiumRooms: number; items: string[]; passes?: string[] }
export class MementosError extends Error { constructor(message: string, public state?: MementosState, public status?: number) { super(message); } }

async function call(method: 'GET' | 'POST', body?: object): Promise<MementosState & { ok?: boolean; duplicate?: boolean }> {
  const token = await getAccessToken();
  if (!token) throw new MementosError('Sign in to your account to use Mementos.');
  const res = await fetch(apiUrl('/api/mementos'), { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new MementosError(data.error || `Mementos request failed (${res.status}).`, typeof data.balance === 'number' ? { balance: data.balance, premiumRooms: data.premiumRooms ?? 0, items: Array.isArray(data.items) ? data.items : [] } : undefined, res.status);
  return { balance: Number(data.balance) || 0, premiumRooms: Number(data.premiumRooms) || 0, items: Array.isArray(data.items) ? data.items.filter((x: unknown) => typeof x === 'string') : [], passes: Array.isArray(data.passes) ? data.passes.filter((x: unknown) => typeof x === 'string') : [], ok: data.ok, duplicate: data.duplicate };
}
export const fetchMementos = () => call('GET');
export const buyRoom = () => call('POST', { action: 'room' });
export const buyGoldPass = () => call('POST', { action: 'pass' });
export const buyKeepsake = (id: string) => call('POST', { action: 'item', id });
export const convertPpToMementos = (pp: number, nonce: string) => call('POST', { action: 'convert', pp, nonce });
