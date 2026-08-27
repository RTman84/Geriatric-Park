import { isAccountContext, requireAccount, serverJson } from './_accountServer';

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
