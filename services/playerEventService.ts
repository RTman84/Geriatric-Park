import { getAccessToken } from './authService';

export interface PlayerEvent {
  id: string;
  event_type: string;
  client_nonce: string;
  payload: Record<string, unknown>;
  created_at: string;
}

function headers(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Player event request failed.');
  return body as T;
}

export async function submitPlayerEvent(
  eventType: string,
  clientNonce: string,
  payload: Record<string, unknown> = {},
): Promise<{ event: PlayerEvent | null; duplicate: boolean }> {
  return parse(await fetch('/api/account/events', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ eventType, clientNonce, payload }),
  }));
}
