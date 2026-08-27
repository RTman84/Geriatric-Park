import { isAccountContext, requireAccount, serverJson } from '../../lib/accountServer';

const MAX_EVENT_BYTES = 32_000;
const MAX_EVENT_TYPE = 100;
const MAX_NONCE = 200;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export default async function handler(req: Request): Promise<Response> {
  const context = await requireAccount(req);
  if (!isAccountContext(context)) return context;

  if (req.method === 'GET') {
    const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get('limit') || 50), 1), 100);
    const { data, error } = await context.supabase
      .from('player_event_intents')
      .select('id, event_type, client_nonce, payload, created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Player event read failed', error.message);
      return serverJson({ error: 'Player events unavailable' }, 500);
    }
    return serverJson({ events: data ?? [] });
  }

  if (req.method !== 'POST') return serverJson({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }

  const eventType = typeof body?.eventType === 'string' ? body.eventType.trim() : '';
  const clientNonce = typeof body?.clientNonce === 'string' ? body.clientNonce.trim() : '';
  const payload = body?.payload ?? {};

  if (!eventType || eventType.length > MAX_EVENT_TYPE) return serverJson({ error: 'Invalid event type' }, 400);
  if (!clientNonce || clientNonce.length > MAX_NONCE) return serverJson({ error: 'Invalid event nonce' }, 400);
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return serverJson({ error: 'Invalid event payload' }, 400);

  const serialized = JSON.stringify({ eventType, clientNonce, payload });
  if (byteLength(serialized) > MAX_EVENT_BYTES) return serverJson({ error: 'Event is too large' }, 413);

  const { data, error } = await context.supabase
    .from('player_event_intents')
    .insert({
      user_id: context.userId,
      event_type: eventType,
      client_nonce: clientNonce,
      payload,
    })
    .select('id, event_type, client_nonce, payload, created_at')
    .single();

  if (error?.code === '23505') {
    const { data: existing } = await context.supabase
      .from('player_event_intents')
      .select('id, event_type, client_nonce, payload, created_at')
      .eq('user_id', context.userId)
      .eq('client_nonce', clientNonce)
      .maybeSingle();
    return serverJson({ event: existing ?? null, duplicate: true }, 200);
  }

  if (error) {
    console.error('Player event insert failed', error.message);
    return serverJson({ error: 'Player event unavailable' }, 500);
  }

  return serverJson({ event: data, duplicate: false }, 201);
}
