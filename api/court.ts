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

const REIGN_MS = 24 * 3600 * 1000;
const SHIELD_MS = 10 * 60 * 1000;
const DAILY_CHALLENGES = 3;
const PURSE_BASE_TICKETS = 45;
const purseFor = (bracket: number) => Math.round(PURSE_BASE_TICKETS * (1 + (bracket - 1) * 0.25)); // 45 .. 146
const INCUMBENT_EDGE = 1.05; // the reigning champion starts slightly ahead

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

  async function loadThrones() {
    const { data, error } = await supabase.from('court_thrones').select('bracket, user_id, display_name, power, claimed_at, expires_at, shield_until, purse_claimed');
    if (error) throw new Error(error.message);
    return (data ?? []).filter((t: any) => new Date(t.expires_at).getTime() > now.getTime()); // expired reigns are vacant
  }

  try {
    if (action === 'state') {
      const thrones = await loadThrones();
      const { data: att } = await supabase.from('court_attempts').select('attempts').eq('user_id', userId).eq('day', today).maybeSingle();
      return serverJson({
        myBracket, myPower, challengesLeft: Math.max(0, DAILY_CHALLENGES - (att?.attempts ?? 0)), dailyChallenges: DAILY_CHALLENGES,
        thrones: thrones.map((t: any) => ({ ...t, mine: t.user_id === userId, purse: purseFor(t.bracket) })),
      });
    }

    if (action === 'challenge') {
      if (myPower <= 0) return serverJson({ error: 'Put a squad together and let the app sync first.' }, 400);
      const thrones = await loadThrones();
      const throne = thrones.find((t: any) => t.bracket === myBracket);
      if (throne?.user_id === userId) return serverJson({ error: 'You already hold this throne.' }, 409);
      if (throne?.shield_until && new Date(throne.shield_until).getTime() > now.getTime()) return serverJson({ error: 'The new champion is still shielded for a few minutes.' }, 429);

      const { data: att } = await supabase.from('court_attempts').select('attempts').eq('user_id', userId).eq('day', today).maybeSingle();
      const used = att?.attempts ?? 0;
      if (used >= DAILY_CHALLENGES) return serverJson({ error: `You've used today's ${DAILY_CHALLENGES} throne challenges. They reset at midnight UTC.` }, 429);
      const { error: attErr } = await supabase.from('court_attempts').upsert({ user_id: userId, day: today, attempts: used + 1 }, { onConflict: 'user_id,day' });
      if (attErr) return serverJson({ error: 'Court unavailable', detail: attErr.message }, 500);

      let won = true;
      if (throne) {
        const atk = myPower * (0.85 + Math.random() * 0.3);
        const def = throne.power * INCUMBENT_EDGE * (0.9 + Math.random() * 0.2);
        won = atk > def;
      }
      if (won) {
        const { error: upErr } = await supabase.from('court_thrones').upsert({
          bracket: myBracket, user_id: userId, display_name: myName, power: myPower, claimed_at: now.toISOString(),
          expires_at: new Date(now.getTime() + REIGN_MS).toISOString(), shield_until: new Date(now.getTime() + SHIELD_MS).toISOString(), purse_claimed: false,
        }, { onConflict: 'bracket' });
        if (upErr) return serverJson({ error: 'Court unavailable', detail: upErr.message }, 500);
      }
      return serverJson({ result: won ? (throne ? 'dethroned' : 'claimed') : 'lost', bracket: myBracket, challengesLeft: DAILY_CHALLENGES - (used + 1), previousChampion: throne?.display_name ?? null });
    }

    if (action === 'claim_purse') {
      const thrones = await loadThrones();
      const mine = thrones.find((t: any) => t.user_id === userId);
      if (!mine) return serverJson({ error: "You aren't a reigning champion right now." }, 404);
      if (mine.purse_claimed) return serverJson({ error: 'This reign\'s purse is already collected.' }, 409);
      const { error } = await supabase.from('court_thrones').update({ purse_claimed: true }).eq('bracket', mine.bracket).eq('user_id', userId).eq('purse_claimed', false);
      if (error) return serverJson({ error: 'Court unavailable', detail: error.message }, 500);
      return serverJson({ tickets: purseFor(mine.bracket), bracket: mine.bracket });
    }

    return serverJson({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    console.error('Court route failed', e?.message || e);
    return serverJson({ error: 'Court unavailable', detail: String(e?.message || e) }, 500);
  }
}
