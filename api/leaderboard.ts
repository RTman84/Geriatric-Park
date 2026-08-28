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

const MAX_SCORE = 1_000_000;
const TOP_N = 10;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC calendar day
}

function displayNameFor(email: string | undefined, userId: string): string {
  if (email) {
    const local = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    if (local.length > 0) return local;
  }
  return `Park Visitor ${userId.slice(0, 4)}`;
}

export default async function handler(req: Request): Promise<Response> {
  const context = await requireAccount(req);
  if (!isAccountContext(context)) return context;

  const day = todayUTC();

  if (req.method === 'GET') {
    const { data: top, error: topError } = await context.supabase
      .from('leaderboard_scores')
      .select('display_name, score')
      .eq('tournament_day', day)
      .order('score', { ascending: false })
      .limit(TOP_N);

    if (topError) {
      console.error('Leaderboard read failed', topError.message);
      return serverJson({ error: 'Leaderboard unavailable' }, 500);
    }

    const { data: mine, error: mineError } = await context.supabase
      .from('leaderboard_scores')
      .select('display_name, score')
      .eq('tournament_day', day)
      .eq('user_id', context.userId)
      .maybeSingle();

    if (mineError) {
      console.error('Leaderboard self-read failed', mineError.message);
      return serverJson({ error: 'Leaderboard unavailable' }, 500);
    }

    return serverJson({ top: top ?? [], mine: mine ?? null, day });
  }

  if (req.method !== 'PUT') return serverJson({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }

  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return serverJson({ error: 'Invalid score' }, 400);
  }

  const { data: authUser, error: userError } = await context.supabase.auth.admin.getUserById(context.userId);
  if (userError || !authUser?.user) {
    console.error('Leaderboard user lookup failed', userError?.message);
    return serverJson({ error: 'Leaderboard unavailable' }, 500);
  }
  const displayName = displayNameFor(authUser.user.email ?? undefined, context.userId);

  const { data: existing, error: readError } = await context.supabase
    .from('leaderboard_scores')
    .select('score')
    .eq('tournament_day', day)
    .eq('user_id', context.userId)
    .maybeSingle();

  if (readError) {
    console.error('Leaderboard revision read failed', readError.message);
    return serverJson({ error: 'Leaderboard unavailable' }, 500);
  }

  // Scores only ever increase — a lower client-submitted value never overwrites a higher one.
  const nextScore = Math.max(existing?.score ?? 0, score);

  const { data, error } = await context.supabase
    .from('leaderboard_scores')
    .upsert({
      user_id: context.userId,
      tournament_day: day,
      display_name: displayName,
      score: nextScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,tournament_day' })
    .select('display_name, score')
    .single();

  if (error) {
    console.error('Leaderboard write failed', error.message);
    return serverJson({ error: 'Leaderboard unavailable' }, 500);
  }

  return serverJson({ mine: data, day });
}
