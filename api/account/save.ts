// Inlined intentionally — a shared file (whether under api/ or lib/) was not being
// included in the deployed function bundle in this project, causing
// ERR_MODULE_NOT_FOUND at runtime for every route that imported it. Each API route
// is self-contained instead, at the cost of duplicating this ~45-line helper.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };

function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function getBearerToken(req: Request): string | null {
  const value = req.headers.get('authorization') || '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = getBearerToken(req);

  if (!url || !serviceKey) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Geriatric-Park-Server': 'account-api' } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);

  return { userId: data.user.id, supabase };
}

function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

const MAX_SAVE_BYTES = 350_000;
const MAX_SCHEMA_VERSION = 100;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export default async function handler(req: Request): Promise<Response> {
  const context = await requireAccount(req);
  if (!isAccountContext(context)) return context;

  if (req.method === 'GET') {
    const { data, error } = await context.supabase
      .from('game_saves')
      .select('schema_version, client_revision, save_data, updated_at')
      .eq('user_id', context.userId)
      .maybeSingle();

    if (error) {
      console.error('Cloud save read failed', error.message);
      return serverJson({ error: 'Cloud save unavailable' }, 500);
    }
    return serverJson({ save: data ?? null });
  }

  if (req.method !== 'PUT') return serverJson({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }

  const schemaVersion = Number(body?.schemaVersion);
  const clientRevision = Number(body?.clientRevision);
  const saveData = body?.saveData;

  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > MAX_SCHEMA_VERSION) {
    return serverJson({ error: 'Invalid schema version' }, 400);
  }
  if (!Number.isInteger(clientRevision) || clientRevision < 0 || clientRevision > Number.MAX_SAFE_INTEGER) {
    return serverJson({ error: 'Invalid client revision' }, 400);
  }
  if (saveData === null || typeof saveData !== 'object' || Array.isArray(saveData)) {
    return serverJson({ error: 'Invalid save data' }, 400);
  }

  const serialized = JSON.stringify(saveData);
  if (byteLength(serialized) > MAX_SAVE_BYTES) return serverJson({ error: 'Save is too large' }, 413);

  const { data: existing, error: readError } = await context.supabase
    .from('game_saves')
    .select('client_revision')
    .eq('user_id', context.userId)
    .maybeSingle();

  if (readError) {
    console.error('Cloud save revision read failed', readError.message);
    return serverJson({ error: 'Cloud save unavailable' }, 500);
  }

  if (existing && clientRevision <= Number(existing.client_revision)) {
    return serverJson({
      error: 'Save conflict',
      code: 'STALE_REVISION',
      serverRevision: Number(existing.client_revision),
    }, 409);
  }

  const { data, error } = await context.supabase
    .from('game_saves')
    .upsert({
      user_id: context.userId,
      schema_version: schemaVersion,
      client_revision: clientRevision,
      save_data: saveData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('schema_version, client_revision, save_data, updated_at')
    .single();

  if (error) {
    console.error('Cloud save write failed', error.message);
    return serverJson({ error: 'Cloud save unavailable' }, 500);
  }

  return serverJson({ save: data });
}
