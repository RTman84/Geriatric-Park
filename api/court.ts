// Self-contained on purpose (see the note at the top of api/friends.ts). Edge runtime: written against the Web Fetch API.
// Bracket thrones: one reigning Grand Shuffle Court champion per power bracket. Everything resolves from server-held
// values (player_profiles.squad_power); the browser never sends a power number. Rewards are Tickets only, never PP.
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };

function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function getBearerToken(req: Request): string | null {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = getBearerToken(req);
  if (!url || !serviceKey) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'court-api' } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}
function isAccountContext(v: AccountContext | Response): v is AccountContext { return v instanceof Response === false; }

// Same thresholds as POWER_BRACKETS in constants.tsx (duplicated: shared imports are not bundled on Vercel here).
const BRACKET_MINS = [0, 300, 700, 1300, 2300, 3800, 6000, 9500, 15000, 21000];
const bracketOf = (power: number) => { let b = 1; BRACKET_MINS.forEach((m, i) => { if (power >= m) b = i + 1; }); return b; };

const LADDER_SIZE = 10;
const STALE_MS = 7 * 24 * 3600 * 1000; // a ladder spot is lost after 7 days without opening the Court
const DAILY_CHALLENGES = 3;
const CHALLENGE_REACH = 3; // you can challenge up to 3 ranks above you
const PURSE_BASE_TICKETS = 45;
const PLACE_PURSE_MULT = [1, 0.6, 0.4]; // ranks 1, 2, 3
const purseFor = (bracket: number, rank: number) => Math.round(PURSE_BASE_TICKETS * (1 + (bracket - 1) * 0.25) * (PLACE_PURSE_MULT[rank - 1] ?? 0));
const INCUMBENT_EDGE = 1.05;

type Entry = { bracket: number; rank: number; user_id: string; display_name: string | null; power: number; joined_at: string; last_active: string; purse_day: string | null };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return serverJson({ error: 'Method not allowed' }, 405);
  const ctx = await requireAccount(req);
  if (!isAccountContext(ctx)) return ctx;
  const { userId, supabase } = ctx;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine for state */ }
  const action = String(body?.action || 'state');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: me, error: meErr } = await supabase.from('player_profiles').select('squad_power, display_name').eq('user_id', userId).maybeSingle();
  if (meErr) { console.error('Court profile lookup failed', meErr.message); return serverJson({ error: 'Court unavailable', detail: meErr.message }, 500); }
  const myPower = Math.max(0, Math.floor(Number(me?.squad_power) || 0));
  const myBracket = bracketOf(myPower);
  const myName = (me?.display_name && String(me.display_name).slice(0, 40)) || 'Park Visitor';

  // Rewrites one bracket's ladder as ranks 1..n in the given order (used for compaction and removals).
  async function rewriteBracket(bracket: number, entries: Entry[]) {
    const del = await supabase.from('court_ladder').delete().eq('bracket', bracket);
    if (del.error) throw new Error(del.error.message);
    for (let i = 0; i < Math.min(entries.length, LADDER_SIZE); i++) {
      const e = entries[i];
      const ins = await supabase.from('court_ladder').insert({ bracket, rank: i + 1, user_id: e.user_id, display_name: e.display_name, power: e.power, joined_at: e.joined_at, last_active: e.last_active, purse_day: e.purse_day });
      if (ins.error) throw new Error(ins.error.message);
    }
  }

  // Loads every ladder, drops anyone idle for 7+ days, and moves the caller if their power put them in a new bracket.
  async function loadLadders(): Promise<Entry[][]> {
    const { data, error } = await supabase.from('court_ladder').select('bracket, rank, user_id, display_name, power, joined_at, last_active, purse_day');
    if (error) throw new Error(error.message);
    const byBracket: Entry[][] = Array.from({ length: 10 }, () => []);
    (data ?? []).forEach((e: any) => { if (e.bracket >= 1 && e.bracket <= 10) byBracket[e.bracket - 1].push(e as Entry); });
    for (let b = 1; b <= 10; b++) {
      const sorted = byBracket[b - 1].sort((x, y) => x.rank - y.rank);
      let kept = sorted.filter(e => now.getTime() - new Date(e.last_active).getTime() < STALE_MS || e.user_id === userId);
      if (myPower > 0 && b !== myBracket) kept = kept.filter(e => e.user_id !== userId);
      if (kept.length !== sorted.length || kept.some((e, i) => e.rank !== i + 1)) await rewriteBracket(b, kept);
      kept.forEach((e, i) => { e.rank = i + 1; });
      byBracket[b - 1] = kept;
    }
    return byBracket;
  }

  const view = (ladders: Entry[][], attemptsLeft: number) => {
    const mineEntry = ladders[myBracket - 1].find(e => e.user_id === userId) ?? null;
    return {
      myBracket, myPower, challengesLeft: attemptsLeft, dailyChallenges: DAILY_CHALLENGES, challengeReach: CHALLENGE_REACH,
      mine: mineEntry ? { bracket: myBracket, rank: mineEntry.rank, purseAvailable: mineEntry.rank <= 3 && mineEntry.purse_day !== today, purse: purseFor(myBracket, mineEntry.rank) } : null,
      top3: ladders.map((l, i) => ({ bracket: i + 1, entries: l.slice(0, 3).map(e => ({ rank: e.rank, user_id: e.user_id, display_name: e.display_name, power: e.power, mine: e.user_id === userId })) })),
      myLadder: ladders[myBracket - 1].map(e => ({ rank: e.rank, user_id: e.user_id, display_name: e.display_name, power: e.power, mine: e.user_id === userId })),
    };
  };
  const attemptsLeftFor = async () => {
    const { data } = await supabase.from('court_attempts').select('attempts').eq('user_id', userId).eq('day', today).maybeSingle();
    return { used: data?.attempts ?? 0, left: Math.max(0, DAILY_CHALLENGES - (data?.attempts ?? 0)) };
  };

  try {
    const ladders = await loadLadders();
    const mine = ladders[myBracket - 1].find(e => e.user_id === userId);
    if (mine) { // opening the Court keeps your spot warm and refreshes your power
      mine.last_active = now.toISOString(); mine.power = myPower || mine.power; mine.display_name = myName;
      await supabase.from('court_ladder').update({ last_active: mine.last_active, power: mine.power, display_name: myName }).eq('bracket', myBracket).eq('rank', mine.rank);
    }

    const recordHonor = async (rank: number) => {
      if (rank <= 3) await supabase.from('court_honors').upsert({ user_id: userId, key: `court:${myBracket}:${rank}`, earned_at: now.toISOString() }, { onConflict: 'user_id,key' });
    };
    if (mine) await recordHonor(mine.rank);

    if (action === 'state') return serverJson(view(ladders, (await attemptsLeftFor()).left));

    if (action === 'challenge') {
      if (myPower <= 0) return serverJson({ error: 'Put a squad together and let the app sync first.' }, 400);
      const ladder = ladders[myBracket - 1];
      const { used, left } = await attemptsLeftFor();
      if (left <= 0) return serverJson({ error: `You've used today's ${DAILY_CHALLENGES} ladder challenges. They reset at midnight UTC.` }, 429);

      // Unranked: take the next open spot, or fight the bottom spot when the ladder is full.
      let targetRank = Number(body?.targetRank) || 0;
      if (!mine) {
        if (ladder.length < LADDER_SIZE) {
          await supabase.from('court_ladder').insert({ bracket: myBracket, rank: ladder.length + 1, user_id: userId, display_name: myName, power: myPower, joined_at: now.toISOString(), last_active: now.toISOString(), purse_day: null });
          return serverJson({ result: 'joined', rank: ladder.length + 1, bracket: myBracket, challengesLeft: left, ...{ view: view(await loadLadders(), left) } });
        }
        targetRank = LADDER_SIZE;
      } else {
        if (mine.rank === 1) return serverJson({ error: "You're already at the top of your bracket." }, 409);
        if (!targetRank) targetRank = mine.rank - 1;
        if (targetRank >= mine.rank || targetRank < mine.rank - CHALLENGE_REACH || targetRank < 1) return serverJson({ error: `You can only challenge up to ${CHALLENGE_REACH} ranks above you.` }, 400);
      }
      const target = ladder.find(e => e.rank === targetRank);
      if (!target) return serverJson({ error: 'That spot is empty.' }, 404);
      if (target.user_id === userId) return serverJson({ error: "That's you." }, 409);

      const { error: attErr } = await supabase.from('court_attempts').upsert({ user_id: userId, day: today, attempts: used + 1 }, { onConflict: 'user_id,day' });
      if (attErr) return serverJson({ error: 'Court unavailable', detail: attErr.message }, 500);

      const { data: tp } = await supabase.from('player_profiles').select('squad_power').eq('user_id', target.user_id).maybeSingle();
      const targetPower = Math.max(1, Math.floor(Number(tp?.squad_power) || target.power));
      const tSnap = { ...target }; const mSnap = mine ? { ...mine } : null; // snapshots: both rows are rewritten below
      const won = myPower * (0.85 + Math.random() * 0.3) > targetPower * INCUMBENT_EDGE * (0.9 + Math.random() * 0.2);
      if (won) {
        if (mSnap) { // swap the two spots
          await supabase.from('court_ladder').update({ user_id: tSnap.user_id, display_name: tSnap.display_name, power: targetPower, last_active: tSnap.last_active, purse_day: tSnap.purse_day }).eq('bracket', myBracket).eq('rank', mSnap.rank);
          await supabase.from('court_ladder').update({ user_id: userId, display_name: myName, power: myPower, last_active: now.toISOString(), purse_day: mSnap.purse_day }).eq('bracket', myBracket).eq('rank', targetRank);
        } else { // takes the bottom spot, the old holder drops off the ladder
          await supabase.from('court_ladder').update({ user_id: userId, display_name: myName, power: myPower, joined_at: now.toISOString(), last_active: now.toISOString(), purse_day: null }).eq('bracket', myBracket).eq('rank', targetRank);
        }
      }
      if (won) {
        await recordHonor(targetRank);
        // Tell the displaced player (Mailbox, no reward). ref keeps several notices on one day apart.
        const dropTo = mSnap ? mSnap.rank : 0;
        await supabase.from('mail_inbox').insert({
          recipient_id: tSnap.user_id, sender_id: userId, sender_name: myName, kind: 'court_displaced', day: today,
          ref: `${myBracket}:${targetRank}:${now.getTime()}`.slice(0, 60), note: `displaced:${myBracket}:${targetRank}:${dropTo}`, updated_at: now.toISOString(),
        });
      }
      const after = await loadLadders();
      return serverJson({ result: won ? 'won' : 'lost', beaten: tSnap.display_name, bracket: myBracket, challengesLeft: left - 1, view: view(after, left - 1) });
    }

    if (action === 'claim_purse') {
      if (!mine || mine.rank > 3) return serverJson({ error: 'Only the top 3 of a bracket collect a purse.' }, 404);
      if (mine.purse_day === today) return serverJson({ error: "Today's purse is already collected." }, 409);
      const { error } = await supabase.from('court_ladder').update({ purse_day: today }).eq('bracket', myBracket).eq('rank', mine.rank).eq('user_id', userId);
      if (error) return serverJson({ error: 'Court unavailable', detail: error.message }, 500);
      return serverJson({ tickets: purseFor(myBracket, mine.rank), bracket: myBracket, rank: mine.rank });
    }

    return serverJson({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    console.error('Court route failed', e?.message || e);
    return serverJson({ error: 'Court unavailable', detail: String(e?.message || e) }, 500);
  }
}
