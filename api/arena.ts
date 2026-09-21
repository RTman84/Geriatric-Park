// Arenas (gyms): factions, stationed defenders, attacks, daily Dues. See ARENA_DESIGN.md.
// Self-contained on purpose (see the note at the top of api/friends.ts): shared helper files were not being
// included in the deployed function bundle. Edge runtime is required -- written against the Web Fetch API.
export const config = { runtime: 'edge' };

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
    global: { headers: { 'X-Geriatric-Park-Server': 'arena-api' } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}
function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

// ---- Tuning (client copies of the display numbers live in constants.tsx: keep in sync) -------------------
const FACTIONS = ['early_birds', 'night_owls', 'sunday_drivers'];
const MAX_SLOTS = 6;
const MAX_ARENAS_PER_PLAYER = 3;
const FACTION_LOCK_MS = 30 * 24 * 60 * 60 * 1000;
const ATTACK_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_ATTACKS_PER_DAY = 20;
const REWARDED_WINS_PER_DAY = 10;
const FATIGUE = 0.85;          // attacker power x0.85 for each defender already fought this attack
const VARIANCE = 0.15;         // +-15% roll
const WIN_TICKETS_MIN = 8;
const WIN_TICKETS_MAX = 15;
const WIN_MATERIALS = 1;
const KNOCKOUT_CONSOLATION = 5;      // Tickets to a knocked-out owner
const KNOCKOUT_CONSOLATION_CAP = 20; // per attacker per day, per owner
const NEW_HOLDER_SHIELD_MS = 10 * 60 * 1000;
const CLEAR_PRIORITY_MS = 5 * 60 * 1000;
const DUES_MAX_HOURS = 12;
const DUES_TICKETS_PER_HOUR = 1;
const DUES_HOURS_PER_MATERIAL = 6;
const MAX_IDS = 12;

// ---- Shared world grid: DUPLICATE of services/worldMap.ts (Arena section). Keep identical. ---------------
const WORLD_SEED = 20260920;
const WORLD_CELL_DEG = 0.02;
const ARENA_CELL_CHANCE = 0.4;
const ARENA_SALT = 1000;
const ARENA_NAMES = [
  'Sunny Acres Clubhouse', 'Maple Court Rec Hall', 'Bingo Bluff Arena', 'Shady Oaks Lodge',
  'Lakeside Legends Hall', 'Golden Years Gym', 'Cedar Springs Pavilion', 'Old Timers Coliseum',
];
function hash32(a: number, b: number, c: number): number {
  let h = (WORLD_SEED ^ Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b) ^ Math.imul(c | 0, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const ARENA_ID_RE = /^a_(-?\d{1,7})_(-?\d{1,7})$/;
// Returns the Arena's name if this id is a real Arena on the shared grid, else null.
function arenaName(id: string): string | null {
  const m = ARENA_ID_RE.exec(id);
  if (!m) return null;
  const cx = parseInt(m[1], 10), cy = parseInt(m[2], 10);
  const rand = rng(hash32(cx, cy, ARENA_SALT));
  if (rand() >= ARENA_CELL_CHANCE) return null;
  rand(); rand(); // lat, lng draws (kept so the name draw matches the client)
  return ARENA_NAMES[Math.floor(rand() * ARENA_NAMES.length)];
}

// ---- Helpers ---------------------------------------------------------------------------------------------
const num = (v: any, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const todayKey = () => new Date().toISOString().slice(0, 10);
const ms = (iso: any) => { const t = typeof iso === 'string' ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : 0; };
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => serverJson({ error, ...extra }, status);
const dbFail = (label: string, error: { message: string }) => {
  console.error(`Arena ${label} failed`, error.message);
  return serverJson({ error: 'Arenas unavailable', detail: `${label}: ${error.message}` }, 500);
};
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

function cleanElder(e: any): { id: string; name: string; type: string; rarity: string; level: number; evolutionStage: number } | null {
  if (!e || typeof e !== 'object') return null;
  const id = typeof e.id === 'string' ? e.id.slice(0, 64) : '';
  if (!id) return null;
  const rarity = ['Common', 'Rare', 'Epic', 'Legendary'].includes(e.rarity) ? e.rarity : 'Common';
  return {
    id,
    name: (typeof e.name === 'string' ? e.name : 'Elder').slice(0, 40),
    type: (typeof e.type === 'string' ? e.type : 'Unknown').slice(0, 30),
    rarity,
    level: Math.min(100, Math.max(1, Math.floor(num(e.level, 1)))),
    evolutionStage: Math.min(2, Math.max(0, Math.floor(num(e.evolutionStage, 0)))),
  };
}

// Dues owed to a set of defender rows: per defender, up to DUES_MAX_HOURS since dues_from.
function duesFor(rows: any[], now: number) {
  let tickets = 0, materials = 0, hours = 0;
  for (const r of rows) {
    const h = Math.min(DUES_MAX_HOURS, Math.max(0, (now - ms(r.dues_from)) / 3600000));
    tickets += Math.floor(h) * DUES_TICKETS_PER_HOUR;
    materials += Math.floor(h / DUES_HOURS_PER_MATERIAL);
    hours += h;
  }
  return { tickets, materials, hours: Math.round(hours * 10) / 10 };
}

async function loadMe(supabase: SupabaseClient, userId: string, now: number) {
  const [profileRes, dailyRes, defRes] = await Promise.all([
    supabase.from('player_profiles').select('display_name, faction, faction_changed_at, squad_power').eq('user_id', userId).maybeSingle(),
    supabase.from('arena_player_daily').select('attacks, wins, dues_claimed').eq('user_id', userId).eq('day', todayKey()).maybeSingle(),
    supabase.from('arena_defenders').select('id, arena_id, elder, power, placed_at, dues_from').eq('user_id', userId),
  ]);
  if (profileRes.error) return { error: dbFail('profile read', profileRes.error) };
  if (dailyRes.error) return { error: dbFail('daily read', dailyRes.error) };
  if (defRes.error) return { error: dbFail('defenders read', defRes.error) };
  const profile: any = profileRes.data;
  const defenders: any[] = defRes.data ?? [];
  const daily: any = dailyRes.data;
  return {
    profile,
    defenders,
    daily,
    me: {
      faction: FACTIONS.includes(profile?.faction) ? profile.faction : null,
      factionChangedAt: profile?.faction_changed_at ?? null,
      squadPower: num(profile?.squad_power, 0),
      attacksToday: num(daily?.attacks, 0),
      winsToday: num(daily?.wins, 0),
      duesClaimedToday: !!daily?.dues_claimed,
      dues: duesFor(defenders, now),
      defenders: defenders.map(d => ({ arenaId: d.arena_id, elderId: String(d.elder?.id ?? ''), placedAt: d.placed_at })),
    },
  };
}

async function upsertDaily(supabase: SupabaseClient, userId: string, patch: { attacks?: number; wins?: number; dues_claimed?: boolean }, existing: any) {
  return supabase.from('arena_player_daily').upsert({
    user_id: userId,
    day: todayKey(),
    attacks: patch.attacks ?? num(existing?.attacks, 0),
    wins: patch.wins ?? num(existing?.wins, 0),
    dues_claimed: patch.dues_claimed ?? !!existing?.dues_claimed,
  }, { onConflict: 'user_id,day' });
}

// Best-effort mail (a failed notice must never fail the action that caused it).
async function sendMail(supabase: SupabaseClient, row: {
  recipient: string; sender: string; senderName: string; kind: 'arena_knockout' | 'arena_dues';
  addWins?: number; tickets: number; materials: number; note: string; cap?: number;
}) {
  try {
    const day = todayKey();
    const now = new Date().toISOString();
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: existing, error: lookupErr } = await supabase.from('mail_inbox').select('id, attacker_wins, reward_tickets, reward_materials')
        .eq('recipient_id', row.recipient).eq('sender_id', row.sender).eq('kind', row.kind).eq('day', day).maybeSingle();
      if (lookupErr) { console.error('Arena mail lookup failed', lookupErr.message); return; }
      const cap = row.cap ?? Infinity;
      if (existing) {
        const { error } = await supabase.from('mail_inbox').update({
          sender_name: row.senderName,
          attacker_wins: existing.attacker_wins + (row.addWins ?? 0),
          reward_tickets: Math.min(cap, existing.reward_tickets + row.tickets),
          reward_materials: existing.reward_materials + row.materials,
          note: row.note, updated_at: now,
        }).eq('id', existing.id);
        if (error) console.error('Arena mail update failed', error.message);
        return;
      }
      const { error } = await supabase.from('mail_inbox').insert({
        recipient_id: row.recipient, sender_id: row.sender, sender_name: row.senderName, kind: row.kind, day,
        attacker_wins: row.addWins ?? 0, defender_wins: 0,
        reward_tickets: Math.min(cap, row.tickets), reward_materials: row.materials, note: row.note, updated_at: now,
      });
      if (!error) return;
      if (!(String(error.message).includes('duplicate') || String(error.message).includes('unique'))) { console.error('Arena mail insert failed', error.message); return; }
    }
  } catch (e) { console.error('Arena mail crashed', e); }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (!isAccountContext(context)) return context;
    const { supabase, userId } = context;
    const now = Date.now();

    // ---------------------------------------------------------------- GET: nearby Arenas + my status
    if (req.method === 'GET') {
      const raw = new URL(req.url).searchParams.get('ids') || '';
      const ids = uniq(raw.split(',').map(s => s.trim()).filter(id => arenaName(id) !== null)).slice(0, MAX_IDS);
      const mine = await loadMe(supabase, userId, now);
      if ('error' in mine) return mine.error as Response;

      const arenas: Record<string, any> = {};
      if (ids.length > 0) {
        const [stateRes, defRes] = await Promise.all([
          supabase.from('arena_state').select('arena_id, faction, claimed_at, priority_faction, priority_until, shield_until').in('arena_id', ids),
          supabase.from('arena_defenders').select('id, arena_id, user_id, faction, elder, power, placed_at').in('arena_id', ids).order('placed_at', { ascending: true }),
        ]);
        if (stateRes.error) return dbFail('state read', stateRes.error);
        if (defRes.error) return dbFail('defender read', defRes.error);
        const owners = uniq((defRes.data ?? []).map((d: any) => d.user_id as string));
        const names: Record<string, string> = {};
        if (owners.length > 0) {
          const { data: profs, error: profErr } = await supabase.from('player_profiles').select('user_id, display_name').in('user_id', owners);
          if (profErr) return dbFail('owner names', profErr);
          for (const p of profs ?? []) names[(p as any).user_id] = (p as any).display_name || 'Park Visitor';
        }
        for (const id of ids) {
          const st: any = (stateRes.data ?? []).find((s: any) => s.arena_id === id);
          const defenders = (defRes.data ?? []).filter((d: any) => d.arena_id === id).map((d: any) => ({
            id: d.id, mine: d.user_id === userId, owner: names[d.user_id] || 'Park Visitor',
            elder: d.elder, power: d.power, placedAt: d.placed_at,
          }));
          arenas[id] = {
            name: arenaName(id),
            faction: defenders.length > 0 ? (st?.faction ?? null) : null,
            priorityFaction: st?.priority_until && ms(st.priority_until) > now ? st.priority_faction : null,
            priorityUntil: st?.priority_until && ms(st.priority_until) > now ? st.priority_until : null,
            shieldUntil: st?.shield_until && ms(st.shield_until) > now ? st.shield_until : null,
            defenders,
          };
        }
      }
      return serverJson({ arenas, me: mine.me, serverTime: now });
    }

    if (req.method !== 'POST') return fail(405, 'Method not allowed');
    let body: any;
    try { body = await req.json(); } catch { return fail(400, 'Invalid JSON'); }
    const action = String(body?.action || '');

    const mine = await loadMe(supabase, userId, now);
    if ('error' in mine) return mine.error as Response;
    const { profile, defenders: myDefenders, daily, me } = mine as any;
    const myFaction: string | null = me.faction;
    const senderName = (profile?.display_name && String(profile.display_name).slice(0, 40)) || 'Park Visitor';

    // ---------------------------------------------------------------- faction
    if (action === 'faction') {
      const faction = String(body?.faction || '');
      if (!FACTIONS.includes(faction)) return fail(400, 'Unknown faction');
      if (faction === myFaction) return serverJson({ faction, me });
      if (myFaction && now - ms(profile?.faction_changed_at) < FACTION_LOCK_MS) {
        return fail(403, 'You can change factions once every 30 days.', { changeAvailableAt: new Date(ms(profile?.faction_changed_at) + FACTION_LOCK_MS).toISOString() });
      }
      if (myDefenders.length > 0) return fail(409, 'Recall your defenders from every Arena before switching factions.');
      // Profile row is normally created by the friends/profile sync; make sure it exists without touching other columns.
      const { data: exists, error: exErr } = await supabase.from('player_profiles').select('user_id').eq('user_id', userId).maybeSingle();
      if (exErr) return dbFail('profile check', exErr);
      if (!exists) return fail(409, 'Play for a moment first so your profile can sync, then pick a faction.');
      const { error } = await supabase.from('player_profiles').update({ faction, faction_changed_at: new Date().toISOString() }).eq('user_id', userId);
      if (error) return dbFail('faction update', error);
      return serverJson({ faction, me: { ...me, faction } });
    }

    // ---------------------------------------------------------------- claim_dues
    if (action === 'claim_dues') {
      if (me.duesClaimedToday) return fail(409, 'You already collected Arena Dues today.');
      const dues = duesFor(myDefenders, now);
      if (dues.tickets <= 0 && dues.materials <= 0) return fail(400, 'No Dues yet — each stationed Elder earns for up to 12 hours.');
      const { error: dailyErr } = await upsertDaily(supabase, userId, { dues_claimed: true }, daily);
      if (dailyErr) return dbFail('dues flag', dailyErr);
      const { error: resetErr } = await supabase.from('arena_defenders').update({ dues_from: new Date(now).toISOString() }).eq('user_id', userId);
      if (resetErr) return dbFail('dues reset', resetErr);
      await sendMail(supabase, {
        recipient: userId, sender: userId, senderName: 'Arena Committee', kind: 'arena_dues',
        tickets: dues.tickets, materials: dues.materials,
        note: `Your stationed Elders earned Dues over ${dues.hours} hours.`,
      });
      return serverJson({ tickets: dues.tickets, materials: dues.materials, hours: dues.hours });
    }

    // Everything below acts on one Arena.
    const arenaId = String(body?.arenaId || '');
    const name = arenaName(arenaId);
    if (!name) return fail(400, 'That is not an Arena.');
    const { data: stateRow, error: stateErr } = await supabase.from('arena_state')
      .select('arena_id, faction, priority_faction, priority_until, shield_until').eq('arena_id', arenaId).maybeSingle();
    if (stateErr) return dbFail('state read', stateErr);
    const { data: arenaDefs, error: defsErr } = await supabase.from('arena_defenders')
      .select('id, user_id, faction, elder, power, placed_at').eq('arena_id', arenaId).order('placed_at', { ascending: true });
    if (defsErr) return dbFail('defender read', defsErr);
    const defs: any[] = arenaDefs ?? [];
    const holder: string | null = defs.length > 0 ? (stateRow?.faction ?? null) : null;

    async function makeNeutral(priorityFaction: string | null) {
      return supabase.from('arena_state').upsert({
        arena_id: arenaId, faction: null, claimed_at: null,
        priority_faction: priorityFaction, priority_until: priorityFaction ? new Date(now + CLEAR_PRIORITY_MS).toISOString() : null,
        shield_until: null, updated_at: new Date().toISOString(),
      }, { onConflict: 'arena_id' });
    }

    // ---------------------------------------------------------------- station
    if (action === 'station') {
      if (!myFaction) return fail(403, 'Pick a faction first.');
      const elder = cleanElder(body?.elder);
      if (!elder) return fail(400, 'Invalid Elder');
      const power = Math.floor(num(body?.power, -1));
      // Same trust level as Friend Battle: power comes from the client, but it can't exceed what the player's
      // synced squad could plausibly field (floor of 100 so brand-new players aren't blocked).
      if (power < 0 || power > Math.max(me.squadPower, 100)) return fail(400, 'Elder power out of range — let your squad sync, then try again.');
      if (holder && holder !== myFaction) return fail(403, 'An opposing faction holds this Arena. Defeat its defenders first.');
      if (!holder && stateRow?.priority_until && ms(stateRow.priority_until) > now && stateRow.priority_faction && stateRow.priority_faction !== myFaction) {
        return fail(403, 'The faction that just cleared this Arena has first claim for a few minutes.', { priorityUntil: stateRow.priority_until });
      }
      if (defs.some(d => d.user_id === userId)) return fail(409, 'You already have a defender here.');
      if (defs.length >= MAX_SLOTS) return fail(409, 'This Arena is full.');
      if (myDefenders.length >= MAX_ARENAS_PER_PLAYER) return fail(409, `You can defend at most ${MAX_ARENAS_PER_PLAYER} Arenas at once.`);
      if (myDefenders.some((d: any) => String(d.elder?.id) === elder.id)) return fail(409, 'That Elder is already stationed somewhere.');

      const claiming = !holder;
      const { error: upErr } = await supabase.from('arena_state').upsert(claiming ? {
        arena_id: arenaId, faction: myFaction, claimed_at: new Date().toISOString(), priority_faction: null, priority_until: null,
        shield_until: new Date(now + NEW_HOLDER_SHIELD_MS).toISOString(), updated_at: new Date().toISOString(),
      } : { arena_id: arenaId, faction: myFaction, updated_at: new Date().toISOString() }, { onConflict: 'arena_id' });
      if (upErr) return dbFail('state write', upErr);
      const { error: insErr } = await supabase.from('arena_defenders').insert({ arena_id: arenaId, user_id: userId, faction: myFaction, elder, power });
      if (insErr) {
        if (String(insErr.message).includes('duplicate') || String(insErr.message).includes('unique')) return fail(409, 'You already have a defender here.');
        return dbFail('station insert', insErr);
      }
      return serverJson({ ok: true, claimed: claiming, elderId: elder.id });
    }

    // ---------------------------------------------------------------- recall
    if (action === 'recall') {
      const { data: removed, error: delErr } = await supabase.from('arena_defenders').delete().eq('arena_id', arenaId).eq('user_id', userId).select('id, elder');
      if (delErr) return dbFail('recall', delErr);
      if (!removed || removed.length === 0) return fail(404, 'You have no defender in this Arena.');
      if (defs.filter(d => d.user_id !== userId).length === 0) {
        const { error } = await makeNeutral(null);
        if (error) return dbFail('neutral write', error);
      }
      return serverJson({ ok: true, elderId: String((removed[0] as any).elder?.id ?? '') });
    }

    // ---------------------------------------------------------------- attack
    if (action === 'attack') {
      if (!myFaction) return fail(403, 'Pick a faction first.');
      if (me.squadPower <= 0) return fail(400, 'Put an Elder on your squad and let it sync first.');
      if (!holder) return fail(400, 'Nobody holds this Arena — station an Elder to claim it instead.');
      if (holder === myFaction) return fail(400, 'Your own faction holds this Arena — station a defender instead.');
      if (stateRow?.shield_until && ms(stateRow.shield_until) > now) return fail(403, 'New holders are shielded for a few minutes.', { shieldUntil: stateRow.shield_until });
      if (me.attacksToday >= MAX_ATTACKS_PER_DAY) return fail(429, 'You are out of Arena attacks for today.');
      const { data: cd, error: cdErr } = await supabase.from('arena_player_arena').select('last_attack_at').eq('user_id', userId).eq('arena_id', arenaId).maybeSingle();
      if (cdErr) return dbFail('cooldown read', cdErr);
      if (cd && now - ms(cd.last_attack_at) < ATTACK_COOLDOWN_MS) {
        return fail(429, 'Your squad needs a breather before attacking this Arena again.', { retryAfterMs: ATTACK_COOLDOWN_MS - (now - ms(cd.last_attack_at)) });
      }

      // Fight defenders in placement order. The attacker's power is the SERVER-HELD synced squad power.
      const log: { owner: string; elder: string; power: number; attackerPower: number; won: boolean }[] = [];
      const beatenRows: any[] = [];
      for (let i = 0; i < defs.length; i++) {
        const d = defs[i];
        const eff = me.squadPower * Math.pow(FATIGUE, i) * (1 - VARIANCE + Math.random() * VARIANCE * 2);
        const won = eff > d.power;
        log.push({ owner: '', elder: String(d.elder?.name ?? 'Elder'), power: d.power, attackerPower: Math.round(eff), won });
        if (!won) break;
        beatenRows.push(d);
      }

      // Knock out beaten defenders. Only rows we actually deleted count (protects against two attackers racing).
      let knockedOut = 0;
      for (const d of beatenRows) {
        const { data: gone, error } = await supabase.from('arena_defenders').delete().eq('id', d.id).select('id');
        if (error) { console.error('Arena knockout delete failed', error.message); continue; }
        if (!gone || gone.length === 0) continue;
        knockedOut++;
        await sendMail(supabase, {
          recipient: d.user_id, sender: userId, senderName, kind: 'arena_knockout', addWins: 1,
          tickets: KNOCKOUT_CONSOLATION, materials: 0, cap: KNOCKOUT_CONSOLATION_CAP,
          note: `${name}: ${String(d.elder?.name ?? 'Your Elder')} was knocked out and is back home.`,
        });
      }

      // Flip the Arena if nobody is left.
      let flipped = false;
      const { count: remaining, error: remErr } = await supabase.from('arena_defenders').select('id', { count: 'exact', head: true }).eq('arena_id', arenaId);
      if (remErr) console.error('Arena remaining count failed', remErr.message);
      else if ((remaining ?? 0) === 0) {
        const { error } = await makeNeutral(myFaction);
        if (error) console.error('Arena flip failed', error.message); else flipped = true;
      }

      // Rewards: first REWARDED_WINS_PER_DAY beaten defenders each day pay Tickets + Materials. Never PP.
      const rewardedWins = Math.min(knockedOut, Math.max(0, REWARDED_WINS_PER_DAY - me.winsToday));
      let tickets = 0;
      for (let i = 0; i < rewardedWins; i++) tickets += WIN_TICKETS_MIN + Math.floor(Math.random() * (WIN_TICKETS_MAX - WIN_TICKETS_MIN + 1));
      const materials = rewardedWins * WIN_MATERIALS;

      const { error: dErr } = await upsertDaily(supabase, userId, { attacks: me.attacksToday + 1, wins: me.winsToday + knockedOut }, daily);
      if (dErr) console.error('Arena daily write failed', dErr.message);
      const { error: cErr } = await supabase.from('arena_player_arena').upsert({ user_id: userId, arena_id: arenaId, last_attack_at: new Date().toISOString() }, { onConflict: 'user_id,arena_id' });
      if (cErr) console.error('Arena cooldown write failed', cErr.message);

      return serverJson({
        result: { arenaName: name, fought: log.length, beaten: knockedOut, total: defs.length, flipped, rewardedWins, tickets, materials, log, attackNumber: me.attacksToday + 1 },
      });
    }

    return fail(400, 'Unknown action');
  } catch (e) {
    console.error('Arena handler crashed', e);
    return serverJson({ error: 'Arenas unavailable', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
}
