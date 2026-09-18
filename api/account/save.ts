// Inlined intentionally — a shared file (whether under api/ or lib/) was not being
// included in the deployed function bundle in this project, causing
// ERR_MODULE_NOT_FOUND at runtime for every route that imported it. Each API route
// is self-contained instead, at the cost of duplicating this ~45-line helper.
//
// Edge runtime is required here, not optional: this file is written entirely
// against the Web Fetch API (Request/Response/Headers, req.json(), req.headers.get()).
// Without this declaration Vercel defaults to the Node.js runtime, where req is a
// plain http.IncomingMessage-like object with none of those methods -- this was
// causing a hard "TypeError: req.headers.get is not a function" crash on every
// request in production (confirmed via live Vercel function logs, 9-12-26).
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient; displayName: string | null };

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

  const displayName = typeof data.user.user_metadata?.display_name === 'string' ? data.user.user_metadata.display_name : null;
  return { userId: data.user.id, supabase, displayName };
}

function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

const MAX_SAVE_BYTES = 350_000;
const MAX_SCHEMA_VERSION = 100;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

// Mirrors getElderPower/getSquadPower in constants.tsx -- duplicated here for
// the same self-contained-file reason as everything else in this file, since
// this is a different runtime bundle than the client.
function squadPowerFrom(saveData: any): number {
  const elders = Array.isArray(saveData?.allElders) ? saveData.allElders : [];
  return elders
    .filter((e: any) => e?.status === 'Team')
    .reduce((sum: number, e: any) => sum + (Number(e?.strength) || 0) + (Number(e?.tenacity) || 0) + (Number(e?.wit) || 0), 0);
}

// Best-effort snapshot for the Social Profile / friends system (Phase 2) --
// never blocks or fails the actual cloud save if this part errors, since the
// save itself is the important write and this is purely a derived read-model
// for other players to view via api/friends.ts.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function syncPlayerProfile(supabase: SupabaseClient, userId: string, displayName: string | null, saveData: any): Promise<string | null> {
  try {
    const elders = Array.isArray(saveData?.allElders) ? saveData.allElders : [];
    const achievements = Array.isArray(saveData?.achievements) ? saveData.achievements : [];
    const favoriteIds: string[] = Array.isArray(saveData?.favoriteElderIds) ? saveData.favoriteElderIds.slice(0, 3) : [];
    const favoriteElders = favoriteIds
      .map(id => elders.find((e: any) => e?.id === id))
      .filter(Boolean)
      .map((e: any) => ({ type: e.type, evolutionStage: e.evolutionStage ?? 0, name: e.name }));

    const statFields = {
      display_name: displayName,
      level: Number.isInteger(saveData?.level) ? saveData.level : 1,
      selected_title: saveData?.selectedTitle ?? null,
      selected_account_icon: saveData?.selectedAccountIcon ?? null,
      achievements_completed: achievements.filter((a: any) => a?.completed).length,
      achievements_total: achievements.length,
      squad_power: squadPowerFrom(saveData),
      favorite_elders: favoriteElders,
      built_amenities: Array.isArray(saveData?.builtAmenityIds) ? saveData.builtAmenityIds : [],
      updated_at: new Date().toISOString(),
    };

    // BUG FOUND (9-15-26): player_profiles.friend_code is NOT NULL + UNIQUE
    // with no default, but this function's upsert never included it. If a
    // player's very first cloud autosave fires before they've ever opened
    // their own Friends screen (near-certain, since autosave debounces just
    // 2 seconds after any change, while opening Friends is a deliberate,
    // much later action), no row exists yet -- the upsert has to INSERT, and
    // that INSERT violates the not-null constraint on friend_code every
    // single time, forever, for every player. It never surfaced anywhere
    // because the { error } from that call was also never checked (see the
    // fix below this function). The end result: a player's *own* first
    // Friends-screen visit was the ONLY thing that ever successfully created
    // their row (via ensureProfile in api/friends.ts, which does supply a
    // code) -- but that row is a bare default (level 1, squad_power 0, no
    // name), and unless something happened to retry the sync after that
    // point, it could sit stale indefinitely.
    //
    // Fix: ensure a row exists first (mirroring ensureProfile's own
    // race-safe retry-on-collision pattern) using a plain INSERT with a
    // fresh code, then UPDATE (never upsert) the real stat fields separately
    // so an existing friend_code is never at risk of being touched.
    const { data: existing, error: selectErr } = await supabase.from('player_profiles').select('user_id').eq('user_id', userId).maybeSingle();
    if (selectErr) { console.error('Player profile sync failed (non-fatal)', selectErr.message); return selectErr.message; }

    if (!existing) {
      let inserted = false;
      let lastError: string | null = null;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const { error: insertErr } = await supabase.from('player_profiles').insert({ user_id: userId, friend_code: generateFriendCode(), ...statFields });
        if (!insertErr) { inserted = true; break; }
        lastError = insertErr.message;
        if (!String(insertErr.message).includes('friend_code')) break;
      }
      if (!inserted) { console.error('Player profile sync failed (non-fatal)', lastError); return lastError; }
      return null;
    }

    const { error: updateErr } = await supabase.from('player_profiles').update(statFields).eq('user_id', userId);
    if (updateErr) { console.error('Player profile sync failed (non-fatal)', updateErr.message); return updateErr.message; }
    return null;
  } catch (e: any) {
    // Deliberately swallowed -- a broken profile snapshot should never take
    // down cloud saves. api/friends.ts creates a fresh row on first access
    // anyway (ensureProfile), so a missed sync just means slightly stale
    // data until the next successful save.
    console.error('Player profile sync failed (non-fatal)', e?.message || e);
    return e?.message || String(e);
  }
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

  const profileSyncError = await syncPlayerProfile(context.supabase, context.userId, context.displayName, saveData);

  // TEMPORARY (9-15-26 profile-sync investigation): surface a failed profile
  // sync in the successful save response so it's visible in the browser
  // console via cloudSaveService.ts without needing Vercel's live Logs tab.
  // Never blocks/fails the save itself -- purely informational. Revert once
  // the underlying cause (RLS policy, column mismatch, etc.) is found.
  return serverJson({ save: data, profileSyncError: profileSyncError || undefined });
}
