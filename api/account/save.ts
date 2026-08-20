import { isAccountContext, requireAccount, serverJson } from '../_accountServer';

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
