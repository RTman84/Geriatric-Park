// Self-contained on purpose (shared helper files were not being included in the deployed bundle here). Edge runtime.
export const config = { runtime: 'edge' };
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!url || !key) return json({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return json({ error: 'Authentication required' }, 401);
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'boards-api' } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}

// Modes, whether they reset weekly, and the highest score a legitimate player could plausibly report.
const MODES: Record<string, { weekly: boolean; max: number }> = {
  golden: { weekly: false, max: 100 },        // highest Golden Games tier cleared (all-time)
  arena: { weekly: true, max: 400 },          // Arena defenders beaten this week
  raid: { weekly: true, max: 50_000_000 },    // total Raid damage this week
  friend: { weekly: true, max: 250 },         // Friend Battle wins this week
};
// Must match POWER_BRACKETS in constants.tsx
const BRACKET_MINS = [0, 300, 700, 1300, 2300, 3800, 6000, 9500, 15000, 21000];
const bracketFor = (power: number) => { let b = 1; BRACKET_MINS.forEach((m, i) => { if (power >= m) b = i + 1; }); return b; };
function weekKey(d = new Date()): string { // ISO week, UTC
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
const periodFor = (mode: string) => (MODES[mode].weekly ? weekKey() : 'all');
const TOP_N = 10;

// ---- Weekly settlement ---------------------------------------------------------------------------------------------
// Whoever touches the boards first after a week ends settles that week: the top 3 of every bracket get a Mailbox reward
// (TV Dinners + Building Materials, bigger in higher brackets). A row in board_settlements is written FIRST, so two
// requests racing can never both pay. Players only receive rewards for weeks they were on the board.
const PLACE_DINERS = [25, 15, 10], PLACE_MATERIALS = [10, 6, 4];
const bracketMult = (b: number) => 1 + 0.1 * (b - 1);
function previousWeekKey(): string { const d = new Date(); d.setUTCDate(d.getUTCDate() - 7); return weekKey(d); }
async function settleLastWeek(supabase: SupabaseClient): Promise<void> {
  try {
    const period = previousWeekKey();
    for (const mode of Object.keys(MODES).filter(m => MODES[m].weekly)) {
      const { error: lockErr } = await supabase.from('board_settlements').insert({ mode, period });
      if (lockErr) continue; // already settled (or being settled) by someone else
      const today = new Date().toISOString().slice(0, 10);
      for (let bracket = 1; bracket <= 10; bracket++) {
        const { data: top } = await supabase.from('board_scores').select('user_id, score').eq('mode', mode).eq('period', period).eq('bracket', bracket).order('score', { ascending: false }).limit(3);
        const rows = (top ?? []).filter((r: any) => Number(r.score) > 0).map((r: any, i: number) => ({
          recipient_id: r.user_id, sender_id: r.user_id, sender_name: 'Weekly Boards', kind: 'board_reward', day: today, ref: `${mode}:${period}:${bracket}`,
          reward_diners: Math.round(PLACE_DINERS[i] * bracketMult(bracket)), reward_materials: Math.round(PLACE_MATERIALS[i] * bracketMult(bracket)),
          note: `board:${mode}:${bracket}:${i + 1}:${period}`,
        }));
        if (rows.length) {
          // Permanent title, recorded by the server so other players can see it (api/account/save.ts verifies against this table).
          const honors = (top ?? []).filter((r: any) => Number(r.score) > 0).map((r: any, i: number) => ({ user_id: r.user_id, key: `board:${mode}:${bracket}:${i + 1}`, earned_at: new Date().toISOString() }));
          const { error: hErr } = await supabase.from('court_honors').upsert(honors, { onConflict: 'user_id,key' });
          if (hErr) console.error('board honor write failed', hErr.message);
        }
        if (rows.length) { const { error } = await supabase.from('mail_inbox').insert(rows); if (error) console.error('board reward mail failed', error.message); }
      }
    }
  } catch (e) { console.error('board settlement crashed', e); } // never let settlement break a leaderboard request
}
const cleanName = (n: unknown, uid: string) => { const c = String(n ?? '').replace(/[^a-zA-Z0-9 _'-]/g, '').trim().slice(0, 20); return c || `Park Visitor ${uid.slice(0, 4)}`; };

export default async function handler(req: Request): Promise<Response> {
  const ctx = await requireAccount(req);
  if (ctx instanceof Response) return ctx;
  const { userId, supabase } = ctx;
  const url = new URL(req.url);
  await settleLastWeek(supabase);

  async function myBracket(): Promise<number> {
    const { data } = await supabase.from('player_profiles').select('squad_power').eq('user_id', userId).maybeSingle();
    return bracketFor(Number((data as any)?.squad_power) || 0);
  }

  if (req.method === 'GET') {
    const mode = url.searchParams.get('mode') || '';
    if (!MODES[mode]) return json({ error: 'Unknown mode' }, 400);
    const period = periodFor(mode);
    const wanted = Number(url.searchParams.get('bracket'));
    const bracket = Number.isInteger(wanted) && wanted >= 1 && wanted <= 10 ? wanted : await myBracket();
    const { data: top, error } = await supabase.from('board_scores').select('user_id, display_name, score').eq('mode', mode).eq('period', period).eq('bracket', bracket).order('score', { ascending: false }).limit(TOP_N);
    if (error) { console.error('boards read failed', error.message); return json({ error: 'Boards unavailable', detail: error.message }, 500); }
    const { data: mine } = await supabase.from('board_scores').select('score, bracket').eq('mode', mode).eq('period', period).eq('user_id', userId).maybeSingle();
    let rank: number | null = null;
    if (mine && (mine as any).bracket === bracket) {
      const { count } = await supabase.from('board_scores').select('user_id', { count: 'exact', head: true }).eq('mode', mode).eq('period', period).eq('bracket', bracket).gt('score', (mine as any).score);
      rank = (count ?? 0) + 1;
    }
    return json({ mode, period, bracket, top: (top ?? []).map((r: any) => ({ display_name: r.display_name, score: Number(r.score), me: r.user_id === userId })), mine: mine ? { score: Number((mine as any).score), bracket: (mine as any).bracket } : null, rank });
  }

  if (req.method === 'PUT') {
    let body: any; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const mode = String(body?.mode || ''); const score = Number(body?.score);
    if (!MODES[mode]) return json({ error: 'Unknown mode' }, 400);
    // Arena, Raid and Friend Battle scores are counted by the server routes that resolve those results; only Golden Games
    // (resolved on the device) is reported by the game.
    if (mode !== 'golden') return json({ error: 'That board is counted by the server' }, 403);
    if (!Number.isFinite(score) || score < 0 || score > MODES[mode].max) return json({ error: 'Invalid score' }, 400);
    const period = periodFor(mode);
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const name = cleanName(authUser?.user?.user_metadata?.display_name, userId);
    const bracket = await myBracket();
    const { data: existing, error: readErr } = await supabase.from('board_scores').select('score').eq('user_id', userId).eq('mode', mode).eq('period', period).maybeSingle();
    if (readErr) { console.error('boards read failed', readErr.message); return json({ error: 'Boards unavailable', detail: readErr.message }, 500); }
    const next = Math.max(Number((existing as any)?.score ?? 0), Math.floor(score)); // scores only ever go up within a period
    const { error } = await supabase.from('board_scores').upsert({ user_id: userId, mode, period, bracket, display_name: name, score: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,mode,period' });
    if (error) { console.error('boards write failed', error.message); return json({ error: 'Boards unavailable', detail: error.message }, 500); }
    return json({ ok: true, mode, period, score: next, bracket });
  }
  return json({ error: 'Method not allowed' }, 405);
}
