// Posse ("The Old Gang"): player groups locked to one faction. See POSSE_CHAT_PLAN.md.
// Self-contained edge route (shared files are not bundled by Vercel in this project).
// Rewards are Tickets/Materials/TV Dinners/XP/cosmetics only -- never PP or passive income.
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// --- WORDFILTER START (identical copy lives in services/wordFilter.ts and every api route that uses it; scripts/check-wordfilter.mjs verifies) ---
const WF_LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't' };
// Matched anywhere inside the squashed text (spaces, symbols and repeats removed): unambiguous severe terms only.
const WF_ALWAYS = ['nigg', 'nigr', 'fagg', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'gook', 'wetback', 'spic', 'cunt', 'fuck', 'shit', 'bitch', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'cock', 'dick', 'pussy', 'bastard', 'twat', 'wank', 'jizz', 'porn', 'dildo', 'penis', 'vagina', 'molest', 'pedo'];
// Matched only as whole words (so "class", "grape", "assistant" stay fine).
const WF_WORDS = ['ass', 'asshole', 'coon', 'dyke', 'rape', 'rapes', 'raped', 'sex', 'sexy', 'nude', 'nudes', 'tits', 'boob', 'boobs', 'anal', 'cum', 'hoe', 'damn', 'piss', 'crap', 'fag', 'negro', 'homo', 'suicide', 'kys', 'kkk'];
// Innocent words that contain a blocked fragment; removed whole before the squashed check.
const WF_SAFE = ['scunthorpe', 'cockburn', 'dickens', 'dickinson', 'dickson', 'hancock', 'peacock', 'cockatoo', 'cocktail', 'cockpit', 'shiitake', 'shitake', 'penistone', 'analysis', 'analyst', 'assassin', 'bassett', 'classic', 'grape', 'therapist', 'mishit', 'pussycat', 'pussy willow', 'cumberland', 'cucumber', 'document', 'accumulate', 'circumstance', 'specific', 'spice', 'spicy', 'helen'];
const WF_RESERVED = ['admin', 'administrator', 'moderator', 'support', 'staff', 'official', 'geriatricpark', 'anthropic', 'claude'];
type WordCheck = { ok: boolean; reason?: 'empty' | 'length' | 'blocked' | 'contact' | 'reserved' };
function wfSquash(text: string): string {
  const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) out += WF_LEET[ch] ?? ch;
  return out.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
}
function wfTokens(text: string): string[] {
  const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) out += WF_LEET[ch] ?? ch;
  return out.split(/[^a-z]+/).filter(Boolean);
}
function wfVariants(t: string): string[] { return [t, t.replace(/(.)\1{2,}/g, '$1'), t.replace(/(.)\1{2,}/g, '$1$1')]; }
function checkText(raw: unknown, opts: { min?: number; max?: number; reserved?: boolean } = {}): WordCheck {
  const text = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim() : '';
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length < (opts.min ?? 1) || text.length > (opts.max ?? 40)) return { ok: false, reason: 'length' };
  if (/https?:|www\.|\.(com|net|org|io|gg|ly|me|co|tv)\b|@\w+\.\w+|\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/i.test(text)) return { ok: false, reason: 'contact' };
  const tokens = wfTokens(text);
  if (tokens.some(t => wfVariants(t).some(v => WF_WORDS.includes(v)))) return { ok: false, reason: 'blocked' };
  const kept = tokens.filter(t => !WF_SAFE.includes(t)).join(' ');
  const squashed = wfSquash(kept);
  if (WF_ALWAYS.some(w => squashed.includes(w.replace(/(.)\1+/g, '$1')))) return { ok: false, reason: 'blocked' };
  const wholeSquash = wfSquash(text);
  if (opts.reserved && WF_RESERVED.some(w => { const d = w.replace(/(.)\1+/g, '$1'); return wholeSquash === d || wholeSquash.startsWith(d); })) return { ok: false, reason: 'reserved' };
  return { ok: true };
}
function wordCheckMessage(c: WordCheck): string {
  if (c.ok) return '';
  if (c.reason === 'empty') return 'Please enter something.';
  if (c.reason === 'length') return 'That is too short or too long.';
  if (c.reason === 'contact') return 'Links, emails and phone numbers are not allowed.';
  if (c.reason === 'reserved') return 'That name is reserved. Please pick another.';
  return 'That is not allowed. Please pick something friendlier.';
}
// --- WORDFILTER END ---

type Ctx = { userId: string; supabase: SupabaseClient };
function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
async function requireAccount(req: Request): Promise<Ctx | Response> {
  const url = process.env.SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!url || !serviceKey) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'posse-api' } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}

const FACTIONS = ['early_birds', 'night_owls', 'sunday_drivers'];
// Cosmetic catalogs: id -> Posse level needed. (Keep in sync with components/PossePanel.tsx.)
const EMBLEM_LEVEL: Record<string, number> = {
  sunrise: 1, owl: 1, sedan: 1, bingo: 1, cane: 1, teapot: 1, trophy: 1, star: 1, shield: 1, yarn: 1, sunflower: 1, fishing: 1,
  cat: 2, dog: 2, pie: 2, glasses: 2, bell: 2, key: 2, anchor: 3, rose: 3, clover: 3, compass: 3, crown: 4, dragon: 4, rocket: 4, diamond: 4, flame: 5, lightning: 5, unicorn: 5,
  // art emblems (W7-A, GP app 2): ids kept stable
  skirmish: 1, porch: 1, knit: 1, casserole: 2, gnome: 2, swing: 3,
  // E3 (GP app 2, 2026-11-03): the Old Gang seal, top level
  oldgang: 5,
};
const COLOR_LEVEL: Record<string, number> = { default: 1, gold: 2, red: 2, green: 3, sky: 3, purple: 4, pink: 4, rainbow: 5 };
const FONT_LEVEL: Record<string, number> = { default: 1, rounded: 1, serif: 2, mono: 3, script: 4, display: 5 };
// Lifetime Posse Points needed for each Posse level (index 0 = level 1).
const LEVEL_AT = [0, 100, 400, 1000, 2500, 6000];
// Preset chat ids accepted by chat_send (keep in sync with services/posseChat.ts).
const PRESET_IDS = new Set(['hello', 'hi', 'morning', 'afternoon', 'evening', 'night', 'welcome', 'brb', 'back', 'busy', 'thanks', 'welcome_back', 'bye', 'howdy', 'great', 'gg', 'raid_on', 'raid_soon', 'raid_hit', 'raid_need', 'raid_low', 'raid_won', 'raid_lost', 'raid_done', 'raid_where', 'raid_join', 'raid_hard', 'raid_tier', 'raid_ready', 'raid_thanks', 'arena_hold', 'arena_lost', 'arena_atk', 'arena_help', 'arena_dues', 'arena_won', 'arena_full', 'arena_open', 'arena_shield', 'arena_strong', 'arena_swap', 'arena_thanks', 'loan', 'loan_offer', 'visit', 'visited', 'visit_back', 'exchange', 'exchange_sent', 'battle', 'battle_yes', 'help', 'help_ok', 'heal', 'materials', 'tip', 'guide', 'daily', 'mission', 'mission_need', 'mission_done', 'mission_pick', 'mission_raid', 'mission_arena', 'mission_pvp', 'mission_close', 'mission_time', 'points', 'pvp_gl', 'pvp_won', 'pvp_lost', 'pvp_rematch', 'pvp_nice', 'pvp_ladder', 'pvp_tower', 'pvp_squad', 'pvp_gear', 'pvp_rest', 'nice', 'wow', 'haha', 'oops', 'yes', 'no', 'ok', 'wait', 'congrats', 'luck', 'sorry', 'please', 'maybe', 'sure', 'awesome', 'love', 'st_wave', 'st_thumbs', 'st_rematch', 'st_bingo', 'st_morning', 'st_night', 'st_thanks', 'st_goodfight', 'st_horn', 'st_flag', 'st_hands', 'st_tea', 'st_scroll', 'st_cheer', 'st_laugh', 'st_sorry', 'st_okay', 'st_highfive', 'st_surprised', 'st_sleepy', 'st_casserole', 'st_puck', 'st_heart', 'st_confetti']);
// Weekly Posse missions. goal = max(3, active members) x perMember (active = earned at least 1 point this week).
// stat: which posse_week_stats counter feeds it; 'show_up' counts members with 10+ points.
const MISSION_POOL: { id: string; title: string; desc: string; stat: string; perMember: number; per?: 'ten' | 'half' }[] = [
  { id: 'raid_party', title: 'Raid Party', desc: 'Land raid hits together.', stat: 'raid_hit', perMember: 4 },
  { id: 'hold_line', title: 'Hold the Line', desc: 'Win Arena fights.', stat: 'arena_win', perMember: 3 },
  { id: 'rivals', title: 'Friendly Rivals', desc: 'Win PvP battles (friends, ladder, Court).', stat: 'pvp_win', perMember: 5 },
  { id: 'boss_down', title: 'Boss Down', desc: 'Defeat raid bosses as a Posse.', stat: 'boss_down', perMember: 1, per: 'ten' },
  { id: 'dues_run', title: 'Dues Day', desc: 'Members claim their daily Arena Dues.', stat: 'dues', perMember: 1, per: 'half' },
  { id: 'show_up', title: 'Show Up', desc: 'Members who earn 10+ points this week.', stat: 'show_up', perMember: 1, per: 'half' },
];
const MISSION_REWARD_DINERS = 20;
const MISSION_REWARD_MATERIALS = 8;
const MISSION_MIN_POINTS = 10;
const CHAT_PER_10S = 4;
const CHAT_PER_HOUR = 120;
const LFP_DAYS = 14;
const levelFor = (points: number) => { let l = 1; LEVEL_AT.forEach((t, i) => { if (points >= t) l = i + 1; }); return l; };
async function posseLevel(supabase: SupabaseClient, posseId: string): Promise<number> {
  const { data } = await supabase.from('posse_week_points').select('points').eq('posse_id', posseId);
  return levelFor(((data ?? []) as any[]).reduce((a, r) => a + (Number(r.points) || 0), 0));
}
const POSSE_MAX = 100;
const MAX_CO = 5;
const CREATES_PER_DAY = 3;
const INVITES_PER_DAY = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 '_-]*$/;
const todayKey = () => new Date().toISOString().slice(0, 10);
const weekStartKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const dow = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - dow); return t.toISOString().slice(0, 10); };
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const WEEKLY_GOAL_PER_MEMBER = 10;

type Profile = { user_id: string; display_name: string | null; faction: string | null; level: number | null; squad_power: number | null; friend_code: string | null; selected_title: string | null };
const PROFILE_COLS = 'user_id, display_name, faction, level, squad_power, friend_code, selected_title';
const nameOf = (p?: Partial<Profile> | null) => String(p?.display_name || 'A player').slice(0, 40);

async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('player_profiles').select(PROFILE_COLS).eq('user_id', userId).maybeSingle();
  return (data as Profile | null) ?? null;
}
async function getMembership(supabase: SupabaseClient, userId: string): Promise<{ member: any; posse: any } | null> {
  const { data: member } = await supabase.from('posse_members').select('posse_id, user_id, role, joined_at, week_start, week_points').eq('user_id', userId).maybeSingle();
  if (!member) return null;
  const { data: posse } = await supabase.from('posses').select('id, name, tag, faction, emblem, owner_id, member_count, created_at, deleted_at').eq('id', (member as any).posse_id).maybeSingle();
  if (!posse || (posse as any).deleted_at) { await supabase.from('posse_members').delete().eq('user_id', userId); return null; }
  return { member, posse };
}
async function recount(supabase: SupabaseClient, posseId: string): Promise<number> {
  const { data } = await supabase.from('posse_members').select('user_id').eq('posse_id', posseId);
  const n = (data ?? []).length;
  await supabase.from('posses').update({ member_count: n }).eq('id', posseId);
  return n;
}
async function sendMail(supabase: SupabaseClient, to: string, from: string, fromName: string, kind: string, ref: string, note: string) {
  const { error } = await supabase.from('mail_inbox').insert({ recipient_id: to, sender_id: from, sender_name: fromName.slice(0, 40), kind, day: todayKey(), ref, note, updated_at: new Date().toISOString() });
  if (error) console.error('posse mail failed', error.message);
}

// Removes a member; hands the Posse to the next in line if the owner leaves, or closes it when empty.
async function removeMember(supabase: SupabaseClient, posse: any, userId: string): Promise<void> {
  await supabase.from('posse_members').delete().eq('user_id', userId);
  const { data: rest } = await supabase.from('posse_members').select('user_id, role, joined_at').eq('posse_id', posse.id);
  const members = (rest ?? []) as any[];
  if (members.length === 0) {
    await supabase.from('posses').update({ deleted_at: new Date().toISOString(), member_count: 0 }).eq('id', posse.id);
    await supabase.from('posse_invites').update({ status: 'cancelled' }).eq('posse_id', posse.id).eq('status', 'pending');
    return;
  }
  if (posse.owner_id === userId) {
    const next = members.filter(m => m.role === 'co').sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)))[0]
      ?? members.sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)))[0];
    await supabase.from('posse_members').update({ role: 'owner' }).eq('posse_id', posse.id).eq('user_id', next.user_id);
    await supabase.from('posses').update({ owner_id: next.user_id }).eq('id', posse.id);
  }
  await recount(supabase, posse.id);
}

async function addMember(supabase: SupabaseClient, posseId: string, userId: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: posse } = await supabase.from('posses').select('id, name, faction, owner_id, member_count, deleted_at').eq('id', posseId).maybeSingle();
  if (!posse || (posse as any).deleted_at) return { ok: false, error: 'That Posse no longer exists.', status: 404 };
  const prof = await getProfile(supabase, userId);
  if (!prof?.faction || prof.faction !== (posse as any).faction) return { ok: false, error: 'You must be in the same faction as this Posse.', status: 403 };
  if (await getMembership(supabase, userId)) return { ok: false, error: 'You are already in a Posse. Leave it first.', status: 409 };
  const { data: current } = await supabase.from('posse_members').select('user_id').eq('posse_id', posseId);
  if ((current ?? []).length >= POSSE_MAX) return { ok: false, error: 'That Posse is full.', status: 409 };
  const { error } = await supabase.from('posse_members').insert({ posse_id: posseId, user_id: userId, role: 'member', week_start: weekStartKey(), week_points: 0 });
  if (error) return { ok: false, error: String(error.code) === '23505' ? 'You are already in a Posse.' : 'Could not join.', status: 409 };
  await supabase.from('posse_lfp').delete().eq('user_id', userId);
  await recount(supabase, posseId);
  return { ok: true };
}

function missionGoal(m: typeof MISSION_POOL[number], active: number, roster: number): number {
  if (m.id === 'show_up') return Math.max(2, Math.ceil(roster / 2));
  const base = Math.max(3, active);
  if (m.per === 'ten') return Math.max(1, Math.ceil(base / 10));
  if (m.per === 'half') return Math.max(2, Math.ceil(base / 2));
  return base * m.perMember;
}
// Same default set for every Posse in a given week.
function defaultMissionIds(ws: string): string[] {
  let h = 0; for (const ch of ws) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const start = h % MISSION_POOL.length;
  return [0, 1, 2].map(i => MISSION_POOL[(start + i * 2) % MISSION_POOL.length].id).filter((v, i, a) => a.indexOf(v) === i);
}

async function buildMissions(supabase: SupabaseClient, posseId: string, ws: string, rosterRows: any[], userId: string) {
  const roster = rosterRows.length;
  const pts = (m: any) => (m.week_start === ws ? Number(m.week_points) || 0 : 0);
  const active = rosterRows.filter(m => pts(m) >= 1).length;
  const showUp = rosterRows.filter(m => pts(m) >= MISSION_MIN_POINTS).length;
  const { data: statRows } = await supabase.from('posse_week_stats').select('kind, count').eq('posse_id', posseId).eq('week_start', ws);
  const stats = new Map<string, number>(((statRows ?? []) as any[]).map(r => [String(r.kind), Number(r.count) || 0]));
  const { data: feat } = await supabase.from('posse_featured').select('mission_ids').eq('posse_id', posseId).eq('week_start', ws).maybeSingle();
  let ids = String((feat as any)?.mission_ids ?? '').split(',').filter(id => MISSION_POOL.some(m => m.id === id));
  if (ids.length !== 3) ids = defaultMissionIds(ws);
  const { data: votes } = await supabase.from('posse_mission_votes').select('user_id, mission_id').eq('posse_id', posseId).eq('week_start', ws);
  const voteCount = new Map<string, number>(); let myVote: string | null = null;
  for (const v of (votes ?? []) as any[]) { voteCount.set(v.mission_id, (voteCount.get(v.mission_id) ?? 0) + 1); if (v.user_id === userId) myVote = v.mission_id; }
  const mine = rosterRows.find(m => m.user_id === userId);
  const myPoints = mine ? pts(mine) : 0;
  const { data: paidRows } = await supabase.from('posse_mission_paid').select('mission_id').eq('posse_id', posseId).eq('week_start', ws).eq('user_id', userId);
  const paid = new Set(((paidRows ?? []) as any[]).map(r => r.mission_id));
  const featured: any[] = [];
  let paidNow = 0;
  for (const id of ids) {
    const m = MISSION_POOL.find(x => x.id === id)!;
    const goal = missionGoal(m, active, roster);
    const progressLive = m.stat === 'show_up' ? showUp : (stats.get(m.stat) ?? 0);
    let done = (stats.get(`done_${id}`) ?? 0) > 0;
    if (!done && progressLive >= goal) { // freeze completion so a growing roster cannot undo it
      done = true;
      await supabase.from('posse_week_stats').insert({ posse_id: posseId, week_start: ws, kind: `done_${id}`, count: 1 });
    }
    const progress = done ? Math.max(goal, Math.min(progressLive, goal * 10)) : progressLive;
    const eligible = done && myPoints >= MISSION_MIN_POINTS;
    if (eligible && !paid.has(id) && mine) {
      const { error } = await supabase.from('posse_mission_paid').insert({ posse_id: posseId, week_start: ws, mission_id: id, user_id: userId });
      if (!error) {
        await supabase.from('mail_inbox').insert({ recipient_id: userId, sender_id: userId, sender_name: 'Posse Missions', kind: 'posse_reward', day: todayKey(), ref: `mission:${ws}:${id}`, reward_diners: MISSION_REWARD_DINERS, reward_materials: MISSION_REWARD_MATERIALS, note: `mission:${m.title}:${ws}`, updated_at: new Date().toISOString() });
        paid.add(id); paidNow++;
      }
    }
    featured.push({ id, title: m.title, desc: m.desc, progress: Math.min(progress, goal), goal, done, paid: paid.has(id), eligible });
  }
  const pool = MISSION_POOL.map(m => ({ id: m.id, title: m.title, desc: m.desc, votes: voteCount.get(m.id) ?? 0, featured: ids.includes(m.id) }));
  return { weekStart: ws, featured, pool, myVote, minPoints: MISSION_MIN_POINTS, rewardDiners: MISSION_REWARD_DINERS, rewardMaterials: MISSION_REWARD_MATERIALS, paidNow };
}

// ---------------- Competitions: weekly Race, 4-week Cup, Faction War, personal Standing ----------------
const BRACKET_MAX = [5, 12, 25, 45, 70, 100]; // roster-size brackets (small gaps so matches stay close)
const bracketIdx = (n: number) => { const i = BRACKET_MAX.findIndex(b => n <= b); return i < 0 ? BRACKET_MAX.length - 1 : i; };
const bracketLabel = (i: number) => `${i === 0 ? 1 : BRACKET_MAX[i - 1] + 1}-${BRACKET_MAX[i]} members`;
const COMPETE_ANCHOR = '2026-11-02'; // first week of Cup 1 (a Monday, UTC)
const DAY_MS = 86400000;
const addDaysKey = (ws: string, n: number) => new Date(Date.parse(ws) + n * DAY_MS).toISOString().slice(0, 10);
const weekIndexOf = (ws: string) => Math.round((Date.parse(ws) - Date.parse(COMPETE_ANCHOR)) / (7 * DAY_MS));
const seasonOfWeek = (ws: string) => Math.floor(weekIndexOf(ws) / 4);
const RACE_REWARDS = [{ d: 40, m: 10 }, { d: 25, m: 6 }, { d: 15, m: 4 }];
const CUP_REWARDS = [{ d: 100, m: 25 }, { d: 60, m: 15 }, { d: 40, m: 10 }];
const FACTION_WAR_TICKETS = 50;
const RACE_MIN_POINTS = 30, CUP_MIN_POINTS = 60, FACTION_MIN_POINTS = 10, ACTIVE_MIN_POINTS = 10, RACE_WINNER_BONUS = 50;
const STANDING_AT = [15, 40, 75, 120, 175, 240, 315, 400, 495, 600, 710, 800];
const STANDING_REWARD = { tickets: 50, diners: 12, materials: 3 };
const FACTION_NAMES: Record<string, string> = { early_birds: 'Early Birds', night_owls: 'Night Owls', sunday_drivers: 'Sunday Drivers' };

type Entry = { posseId: string; name: string; tag: string; emblem: string; faction: string; members: number; points: number; active: number; score: number; group: number };

// Points per member for a given week: archived history plus live counters that still carry that week.
async function weekMemberPoints(supabase: SupabaseClient, ws: string): Promise<Map<string, { userId: string; points: number }[]>> {
  const out = new Map<string, { userId: string; points: number }[]>();
  const seen = new Set<string>();
  const push = (posseId: string, userId: string, points: number) => { if (!posseId || seen.has(userId)) return; seen.add(userId); if (!out.has(posseId)) out.set(posseId, []); out.get(posseId)!.push({ userId, points }); };
  const { data: live } = await supabase.from('posse_members').select('posse_id, user_id, week_start, week_points').eq('week_start', ws);
  for (const r of (live ?? []) as any[]) push(r.posse_id, r.user_id, Number(r.week_points) || 0);
  const { data: hist } = await supabase.from('posse_member_weeks').select('posse_id, user_id, points').eq('week_start', ws);
  for (const r of (hist ?? []) as any[]) push(r.posse_id, r.user_id, Number(r.points) || 0);
  return out;
}
async function weekEntries(supabase: SupabaseClient, ws: string): Promise<Entry[]> {
  const { data: wp } = await supabase.from('posse_week_points').select('posse_id, points').eq('week_start', ws);
  const rows = ((wp ?? []) as any[]).filter(r => Number(r.points) > 0);
  if (!rows.length) return [];
  const ids = rows.map(r => r.posse_id);
  const { data: ps } = await supabase.from('posses').select('id, name, tag, faction, emblem, member_count, deleted_at').in('id', ids);
  const members = await weekMemberPoints(supabase, ws);
  const entries: Entry[] = [];
  for (const p of (ps ?? []) as any[]) {
    if (p.deleted_at) continue;
    const points = Number(rows.find(r => r.posse_id === p.id)?.points) || 0;
    const active = (members.get(p.id) ?? []).filter(m => m.points >= ACTIVE_MIN_POINTS).length;
    if (active < 1) continue; // needs at least one active member to qualify
    entries.push({ posseId: p.id, name: p.name, tag: p.tag, emblem: p.emblem, faction: p.faction, members: p.member_count, points, active, score: Math.round((points / active) * 100) / 100, group: bracketIdx(p.member_count) });
  }
  return entries;
}
// Small brackets merge into the next one so every group has at least 3 Posses (the last group absorbs any remainder).
function assignGroups(entries: Entry[]): Map<number, Entry[]> {
  const groups = new Map<number, Entry[]>();
  let carry: Entry[] = [];
  for (let i = 0; i < BRACKET_MAX.length; i++) {
    const cur = [...carry, ...entries.filter(e => bracketIdx(e.members) === i)];
    if (cur.length < 3 && i < BRACKET_MAX.length - 1) { carry = cur; continue; }
    carry = [];
    if (cur.length) { cur.forEach(e => { e.group = i; }); groups.set(i, cur); }
  }
  return groups;
}
const rankSort = (a: Entry, b: Entry) => b.score - a.score || b.points - a.points || a.name.localeCompare(b.name);

async function payMail(supabase: SupabaseClient, userId: string, ref: string, note: string, r: { tickets?: number; diners?: number; materials?: number }) {
  const { error } = await supabase.from('mail_inbox').insert({ recipient_id: userId, sender_id: userId, sender_name: 'Posse Competitions', kind: 'posse_reward', day: todayKey(), ref, note, reward_tickets: r.tickets ?? 0, reward_diners: r.diners ?? 0, reward_materials: r.materials ?? 0, updated_at: new Date().toISOString() });
  if (error && String((error as any).code) !== '23505') console.error('posse pay mail failed', error.message);
}

async function settleWeek(supabase: SupabaseClient, W: string): Promise<void> {
  const { error: lockErr } = await supabase.from('posse_settlements').insert({ week_start: W });
  if (lockErr) return; // already settled (or being settled) elsewhere
  const entries = await weekEntries(supabase, W);
  const members = await weekMemberPoints(supabase, W);
  for (const e of entries) {
    await supabase.from('posse_race_scores').delete().eq('posse_id', e.posseId).eq('week_start', W);
    await supabase.from('posse_race_scores').insert({ posse_id: e.posseId, week_start: W, points: e.points, active: e.active, score: e.score });
  }
  // Weekly Race
  for (const [bracket, list] of assignGroups(entries)) {
    const ranked = [...list].sort(rankSort).slice(0, 3);
    for (let i = 0; i < ranked.length; i++) {
      const e = ranked[i];
      await supabase.from('posse_results').insert({ kind: 'race', period: W, bracket, place: i + 1, posse_id: e.posseId, score: e.score });
      for (const m of members.get(e.posseId) ?? []) if (m.points >= RACE_MIN_POINTS) await payMail(supabase, m.userId, `race:${W}`, `race:${i + 1}:${bracketLabel(bracket)}:${W}`, { diners: RACE_REWARDS[i].d, materials: RACE_REWARDS[i].m });
      if (i === 0) await supabase.from('posse_week_points').update({ points: e.points + RACE_WINNER_BONUS }).eq('posse_id', e.posseId).eq('week_start', W);
    }
  }
  // Faction War
  const totals: Record<string, number> = {};
  for (const e of entries) totals[e.faction] = (totals[e.faction] ?? 0) + e.points;
  const winner = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (winner && winner[1] > 0 && (Object.values(totals).filter(v => v === winner[1]).length === 1)) {
    await supabase.from('posse_results').insert({ kind: 'faction', period: W, bracket: 0, place: 1, posse_id: null, score: winner[1], note: winner[0] });
    for (const e of entries.filter(x => x.faction === winner[0])) for (const m of members.get(e.posseId) ?? []) if (m.points >= FACTION_MIN_POINTS) await payMail(supabase, m.userId, `faction:${W}`, `faction:${FACTION_NAMES[winner[0]] ?? winner[0]}:${W}`, { tickets: FACTION_WAR_TICKETS });
  }
  // Cup: closes on the last week of each 4-week season.
  if (weekIndexOf(W) >= 3 && weekIndexOf(W) % 4 === 3) {
    const weeks = [0, 1, 2, 3].map(i => addDaysKey(W, -7 * (3 - i)));
    const { data: sc } = await supabase.from('posse_race_scores').select('posse_id, week_start, score, points').in('week_start', weeks);
    const sums = new Map<string, { score: number; points: number }>();
    for (const r of (sc ?? []) as any[]) { const c = sums.get(r.posse_id) ?? { score: 0, points: 0 }; c.score += Number(r.score) || 0; c.points += Number(r.points) || 0; sums.set(r.posse_id, c); }
    const ids = [...sums.keys()];
    const { data: ps } = ids.length ? await supabase.from('posses').select('id, name, tag, faction, emblem, member_count, deleted_at').in('id', ids) : { data: [] as any[] };
    const cupEntries: Entry[] = ((ps ?? []) as any[]).filter(p => !p.deleted_at).map(p => ({ posseId: p.id, name: p.name, tag: p.tag, emblem: p.emblem, faction: p.faction, members: p.member_count, points: sums.get(p.id)!.points, active: 1, score: Math.round(sums.get(p.id)!.score * 100) / 100, group: bracketIdx(p.member_count) }));
    const season = seasonOfWeek(W);
    const { data: hist } = await supabase.from('posse_member_weeks').select('posse_id, user_id, week_start, points').in('week_start', weeks);
    const { data: live } = await supabase.from('posse_members').select('posse_id, user_id, week_start, week_points').in('week_start', weeks);
    const memberTotals = new Map<string, Map<string, number>>(); // posse -> user -> points over the cup
    const addPts = (posseId: string, userId: string, pts: number) => { if (!memberTotals.has(posseId)) memberTotals.set(posseId, new Map()); const mm = memberTotals.get(posseId)!; mm.set(userId, (mm.get(userId) ?? 0) + pts); };
    for (const r of (hist ?? []) as any[]) if (r.posse_id) addPts(r.posse_id, r.user_id, Number(r.points) || 0);
    const histKeys = new Set(((hist ?? []) as any[]).map(r => `${r.user_id}:${r.week_start}`));
    for (const r of (live ?? []) as any[]) if (!histKeys.has(`${r.user_id}:${r.week_start}`)) addPts(r.posse_id, r.user_id, Number(r.week_points) || 0);
    for (const [bracket, list] of assignGroups(cupEntries.filter(e => e.score > 0))) {
      const ranked = [...list].sort(rankSort).slice(0, 3);
      for (let i = 0; i < ranked.length; i++) {
        const e = ranked[i];
        await supabase.from('posse_results').insert({ kind: 'cup', period: `s${season}`, bracket, place: i + 1, posse_id: e.posseId, score: e.score });
        for (const [uid, pts] of memberTotals.get(e.posseId) ?? []) if (pts >= CUP_MIN_POINTS) await payMail(supabase, uid, `cup:${season}`, `cup:${i + 1}:${bracketLabel(bracket)}:${season + 1}`, { diners: CUP_REWARDS[i].d, materials: CUP_REWARDS[i].m });
      }
    }
  }
}
// Settles every finished week (never earlier than the first competition week) that has not been settled yet.
async function settleDue(supabase: SupabaseClient): Promise<void> {
  try {
    const cur = weekStartKey();
    const due: string[] = [];
    for (let i = 3; i >= 1; i--) { const w = addDaysKey(cur, -7 * i); if (w >= COMPETE_ANCHOR) due.push(w); }
    if (!due.length) return;
    const { data: done } = await supabase.from('posse_settlements').select('week_start').in('week_start', due);
    const doneSet = new Set(((done ?? []) as any[]).map(r => String(r.week_start)));
    for (const w of due) if (!doneSet.has(w)) await settleWeek(supabase, w);
  } catch (e) { console.error('posse settle failed', e); }
}

async function standingFor(supabase: SupabaseClient, userId: string, ws: string) {
  const season = seasonOfWeek(ws);
  const first = addDaysKey(COMPETE_ANCHOR, season * 28);
  const weeks = [0, 1, 2, 3].map(i => addDaysKey(first, i * 7));
  const { data: hist } = await supabase.from('posse_member_weeks').select('week_start, points').eq('user_id', userId).in('week_start', weeks);
  const histWeeks = new Set(((hist ?? []) as any[]).map(r => String(r.week_start)));
  let points = ((hist ?? []) as any[]).reduce((a, r) => a + (Number(r.points) || 0), 0);
  const { data: live } = await supabase.from('posse_members').select('week_start, week_points').eq('user_id', userId).maybeSingle();
  if (live && weeks.includes(String((live as any).week_start)) && !histWeeks.has(String((live as any).week_start))) points += Number((live as any).week_points) || 0;
  const reached = STANDING_AT.filter(t => points >= t).length;
  const { data: paidRows } = await supabase.from('posse_standing_paid').select('rank').eq('user_id', userId).eq('season', season);
  const paid = new Set(((paidRows ?? []) as any[]).map(r => Number(r.rank)));
  for (let r = 1; r <= reached; r++) {
    if (paid.has(r)) continue;
    const { error } = await supabase.from('posse_standing_paid').insert({ user_id: userId, season, rank: r });
    if (!error) { await payMail(supabase, userId, `standing:${season}:${r}`, `standing:${r}:${season + 1}`, STANDING_REWARD); paid.add(r); }
  }
  return { season: season + 1, points, rank: reached, thresholds: STANDING_AT, reward: STANDING_REWARD, weeksLeft: Math.max(0, 4 - weeks.findIndex(w => w === ws) - 1), paid: [...paid].sort((a, b) => a - b) };
}

async function buildCompete(supabase: SupabaseClient, userId: string, ms: { posse: any; member: any } | null) {
  await settleDue(supabase);
  const ws = weekStartKey();
  const standing = await standingFor(supabase, userId, ws);
  const entries = await weekEntries(supabase, ws);
  const groups = assignGroups(entries);
  let mine: Entry | undefined; let myGroup: number | null = null; let standings: any[] = [];
  if (ms) {
    mine = entries.find(e => e.posseId === ms.posse.id);
    myGroup = mine ? mine.group : bracketIdx(ms.posse.member_count);
    const list = [...(groups.get(myGroup) ?? [])].sort(rankSort);
    standings = list.slice(0, 10).map((e, i) => ({ rank: i + 1, posseId: e.posseId, name: e.name, tag: e.tag, emblem: e.emblem, members: e.members, score: e.score, points: e.points, active: e.active, mine: e.posseId === ms.posse.id }));
    if (mine && !standings.some(s => s.mine)) { const r = list.findIndex(e => e.posseId === mine!.posseId); standings.push({ rank: r + 1, posseId: mine.posseId, name: mine.name, tag: mine.tag, emblem: mine.emblem, members: mine.members, score: mine.score, points: mine.points, active: mine.active, mine: true }); }
  }
  const factionTotals: Record<string, number> = { early_birds: 0, night_owls: 0, sunday_drivers: 0 };
  for (const e of entries) factionTotals[e.faction] = (factionTotals[e.faction] ?? 0) + e.points;
  const prevWeek = addDaysKey(ws, -7);
  const { data: lastRace } = await supabase.from('posse_results').select('bracket, place, posse_id, score').eq('kind', 'race').eq('period', prevWeek);
  const { data: lastFaction } = await supabase.from('posse_results').select('note, score').eq('kind', 'faction').eq('period', prevWeek).maybeSingle();
  const raceRows = ((lastRace ?? []) as any[]).filter(r => myGroup === null || r.bracket === myGroup);
  const { data: rps } = raceRows.length ? await supabase.from('posses').select('id, name, tag, emblem').in('id', raceRows.map(r => r.posse_id)) : { data: [] as any[] };
  const lastRaceTop = raceRows.sort((a, b) => a.place - b.place).map(r => { const p = ((rps ?? []) as any[]).find(x => x.id === r.posse_id); return { place: r.place, name: p?.name ?? 'A Posse', tag: p?.tag ?? '', emblem: p?.emblem ?? 'sunrise', score: Number(r.score) }; });
  // Cup standing for my group: settled weeks of this season plus the live week.
  const season = seasonOfWeek(ws); const first = addDaysKey(COMPETE_ANCHOR, season * 28);
  const cupWeeks = [0, 1, 2, 3].map(i => addDaysKey(first, i * 7)).filter(w => w < ws);
  const { data: sc } = cupWeeks.length ? await supabase.from('posse_race_scores').select('posse_id, score').in('week_start', cupWeeks) : { data: [] as any[] };
  const cupScore = new Map<string, number>(); for (const r of (sc ?? []) as any[]) cupScore.set(r.posse_id, (cupScore.get(r.posse_id) ?? 0) + Number(r.score));
  for (const e of entries) cupScore.set(e.posseId, (cupScore.get(e.posseId) ?? 0) + e.score);
  let cup: any[] = [];
  if (ms && myGroup !== null) {
    const ids = [...cupScore.keys()];
    const { data: cps } = ids.length ? await supabase.from('posses').select('id, name, tag, emblem, member_count, deleted_at').in('id', ids) : { data: [] as any[] };
    cup = ((cps ?? []) as any[]).filter(p => !p.deleted_at && bracketIdx(p.member_count) === myGroup).map(p => ({ posseId: p.id, name: p.name, tag: p.tag, emblem: p.emblem, score: Math.round((cupScore.get(p.id) ?? 0) * 100) / 100, mine: ms.posse.id === p.id })).sort((a, b) => b.score - a.score).slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
  }
  return {
    weekStart: ws, bracket: myGroup === null ? null : bracketLabel(myGroup), myScore: mine?.score ?? 0, myActive: mine?.active ?? 0, qualifies: !!mine, standings, lastRaceTop,
    minPointsForReward: RACE_MIN_POINTS, raceRewards: RACE_REWARDS,
    faction: { totals: factionTotals, lastWinner: (lastFaction as any)?.note ?? null, names: FACTION_NAMES, reward: FACTION_WAR_TICKETS, minPoints: FACTION_MIN_POINTS },
    cup: { season: season + 1, standings: cup, weeksLeft: Math.max(0, 4 - [0, 1, 2, 3].map(i => addDaysKey(first, i * 7)).findIndex(w => w === ws) - 1), rewards: CUP_REWARDS, minPoints: CUP_MIN_POINTS },
    standing,
  };
}

async function buildInfo(supabase: SupabaseClient, userId: string) {
  let ms = await getMembership(supabase, userId);
  const prof = await getProfile(supabase, userId);
  let notice: string | null = null;
  if (ms && prof?.faction !== ms.posse.faction) {
    // Changing faction means leaving the Posse (every member must share its faction).
    await removeMember(supabase, ms.posse, userId);
    ms = null; notice = 'You left your Posse because you changed faction.';
  }
  const { data: inv } = await supabase.from('posse_invites').select('id, posse_id, kind, from_user_id, created_at, expires_at').eq('to_user_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(20);
  const nowIso = new Date().toISOString();
  const pendingInvites: any[] = [];
  for (const i of (inv ?? []) as any[]) {
    if (i.expires_at < nowIso) continue;
    const { data: p } = await supabase.from('posses').select('id, name, tag, faction, emblem, member_count, deleted_at').eq('id', i.posse_id).maybeSingle();
    if (!p || (p as any).deleted_at) continue;
    const fromProf = await getProfile(supabase, i.from_user_id);
    pendingInvites.push({ id: i.id, kind: i.kind, posse: p, fromName: nameOf(fromProf) });
  }
  if (!ms) { const { data: l } = await supabase.from('posse_lfp').select('user_id').eq('user_id', userId).maybeSingle(); return { posse: null, faction: prof?.faction ?? null, pendingInvites, notice, lfp: !!l }; }
  const { data: rows } = await supabase.from('posse_members').select('user_id, role, joined_at, week_start, week_points, name_color, name_font').eq('posse_id', ms.posse.id);
  const { data: wp } = await supabase.from('posse_week_points').select('points').eq('posse_id', ms.posse.id);
  const totalPoints = ((wp ?? []) as any[]).reduce((a, r) => a + (Number(r.points) || 0), 0);
  const level = levelFor(totalPoints);
  const ws = weekStartKey();
  const roster: any[] = [];
  let weekTotal = 0;
  const ids = ((rows ?? []) as any[]).map(m => m.user_id);
  const { data: profs } = await supabase.from('player_profiles').select(PROFILE_COLS).in('user_id', ids);
  const byId = new Map<string, Profile>(((profs ?? []) as Profile[]).map(p => [p.user_id, p]));
  for (const m of (rows ?? []) as any[]) {
    const p = byId.get(m.user_id);
    const pts = m.week_start === ws ? m.week_points : 0;
    weekTotal += pts;
    roster.push({ userId: m.user_id, role: m.role, name: nameOf(p), level: p?.level ?? 1, squadPower: p?.squad_power ?? 0, title: p?.selected_title ?? null, weekPoints: pts, joinedAt: m.joined_at, nameColor: m.name_color ?? null, nameFont: m.name_font ?? null });
  }
  const rank = (r: string) => (r === 'owner' ? 0 : r === 'co' ? 1 : 2);
  roster.sort((a, b) => rank(a.role) - rank(b.role) || b.weekPoints - a.weekPoints || a.name.localeCompare(b.name));
  return {
    posse: { id: ms.posse.id, name: ms.posse.name, tag: ms.posse.tag, faction: ms.posse.faction, emblem: ms.posse.emblem, memberCount: roster.length, maxMembers: POSSE_MAX, createdAt: ms.posse.created_at, level, totalPoints, nextLevelAt: LEVEL_AT[level] ?? null },
    myRole: ms.member.role, myUserId: userId, missions: await buildMissions(supabase, ms.posse.id, ws, (rows ?? []) as any[], userId), roster, weekStart: ws, weekPoints: weekTotal, weekGoal: roster.length * WEEKLY_GOAL_PER_MEMBER, faction: prof?.faction ?? null, pendingInvites, notice,
  };
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (context instanceof Response) return context;
    const { supabase, userId } = context;
    if (req.method === 'GET') return serverJson(await buildInfo(supabase, userId));
    if (req.method !== 'POST') return serverJson({ error: 'Method not allowed' }, 405);
    let body: any;
    try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }
    const action = String(body?.action || '');
    const me = await getProfile(supabase, userId);
    if (!me) return serverJson({ error: 'Play a bit first so your profile syncs, then try again.' }, 409);

    if (action === 'info') return serverJson(await buildInfo(supabase, userId));

    if (action === 'create') {
      if (!me.faction || !FACTIONS.includes(me.faction)) return serverJson({ error: 'Pick a faction at an Arena first. A Posse belongs to one faction.' }, 403);
      if (await getMembership(supabase, userId)) return serverJson({ error: 'You are already in a Posse.' }, 409);
      const name = String(body?.name ?? '').replace(/\s+/g, ' ').trim();
      const tag = String(body?.tag ?? '').toUpperCase().trim();
      const emblem = (EMBLEM_LEVEL[String(body?.emblem)] ?? 99) <= 1 ? String(body.emblem) : 'sunrise';
      if (!NAME_RE.test(name)) return serverJson({ error: 'Use letters, numbers, spaces, - and _ in the name.' }, 400);
      const nameCheck = checkText(name, { min: 3, max: 20, reserved: true });
      if (!nameCheck.ok) return serverJson({ error: wordCheckMessage(nameCheck) }, 400);
      if (!/^[A-Z0-9]{2,4}$/.test(tag)) return serverJson({ error: 'The tag is 2-4 letters or numbers.' }, 400);
      const tagCheck = checkText(tag, { min: 2, max: 4, reserved: true });
      if (!tagCheck.ok) return serverJson({ error: wordCheckMessage(tagCheck) }, 400);
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data: recent } = await supabase.from('posses').select('id').eq('owner_id', userId).gte('created_at', since);
      if ((recent ?? []).length >= CREATES_PER_DAY) return serverJson({ error: 'You have created a few Posses today already. Try again tomorrow.' }, 429);
      const { data: created, error } = await supabase.from('posses').insert({ name, name_key: keyOf(name), tag, faction: me.faction, emblem, owner_id: userId, member_count: 1 }).select('id').single();
      if (error || !created) return serverJson({ error: String((error as any)?.code) === '23505' ? 'That Posse name is taken.' : 'Could not create the Posse.' }, String((error as any)?.code) === '23505' ? 409 : 500);
      const { error: mErr } = await supabase.from('posse_members').insert({ posse_id: (created as any).id, user_id: userId, role: 'owner', week_start: weekStartKey(), week_points: 0 });
      if (mErr) { await supabase.from('posses').delete().eq('id', (created as any).id); return serverJson({ error: 'Could not create the Posse.' }, 500); }
      return serverJson(await buildInfo(supabase, userId));
    }

    if (action === 'search_by_tag') {
      const tag = String(body?.tag ?? '').toUpperCase().trim();
      if (!/^[A-Z0-9]{2,4}$/.test(tag)) return serverJson({ error: 'Enter the 2-4 character tag.' }, 400);
      if (!me.faction) return serverJson({ results: [] });
      const { data } = await supabase.from('posses').select('id, name, tag, faction, emblem, member_count').eq('tag', tag).eq('faction', me.faction).is('deleted_at', null).limit(5);
      return serverJson({ results: (data ?? []).filter((p: any) => p.member_count < POSSE_MAX) });
    }

    if (action === 'browse_posses') {
      if (!me.faction) return serverJson({ posses: [] });
      const { data } = await supabase.from('posses').select('id, name, tag, faction, emblem, member_count').eq('faction', me.faction).is('deleted_at', null).limit(60);
      const list = ((data ?? []) as any[]).filter(p => p.member_count < POSSE_MAX).sort((a, b) => b.member_count - a.member_count).slice(0, 25);
      return serverJson({ posses: list });
    }

    if (action === 'set_lfp') {
      if (!me.faction) return serverJson({ error: 'Pick a faction first.' }, 403);
      if (await getMembership(supabase, userId)) return serverJson({ error: 'You are already in a Posse.' }, 409);
      await supabase.from('posse_lfp').delete().eq('user_id', userId);
      if (body?.on === true) await supabase.from('posse_lfp').insert({ user_id: userId, faction: me.faction });
      return serverJson({ lfp: body?.on === true });
    }

    if (action === 'compete') {
      const msC = await getMembership(supabase, userId);
      return serverJson(await buildCompete(supabase, userId, msC));
    }

    if (action === 'respond') {
      const id = String(body?.inviteId || ''); const accept = body?.accept === true;
      if (!UUID_RE.test(id)) return serverJson({ error: 'Invalid invite.' }, 400);
      const { data: inv } = await supabase.from('posse_invites').select('id, posse_id, kind, from_user_id, to_user_id, status, expires_at').eq('id', id).maybeSingle();
      const i = inv as any;
      if (!i || i.to_user_id !== userId || i.status !== 'pending') return serverJson({ error: 'That invitation is no longer available.' }, 404);
      if (i.expires_at < new Date().toISOString()) { await supabase.from('posse_invites').update({ status: 'cancelled' }).eq('id', id); return serverJson({ error: 'That invitation expired.' }, 410); }
      if (!accept) { await supabase.from('posse_invites').update({ status: 'declined' }).eq('id', id); return serverJson(await buildInfo(supabase, userId)); }
      // invite: I (to) join; request: I (the officer/owner) approve the requester (from) joining.
      const joiner = i.kind === 'invite' ? userId : i.from_user_id;
      if (i.kind === 'request') {
        const ms = await getMembership(supabase, userId);
        if (!ms || ms.posse.id !== i.posse_id || ms.member.role === 'member') return serverJson({ error: 'Only an officer of that Posse can approve requests.' }, 403);
      }
      const res = await addMember(supabase, i.posse_id, joiner);
      if ('error' in res) return serverJson({ error: res.error }, res.status);
      await supabase.from('posse_invites').update({ status: 'accepted' }).eq('id', id);
      await supabase.from('posse_invites').update({ status: 'cancelled' }).eq('to_user_id', joiner).eq('kind', 'invite').eq('status', 'pending');
      return serverJson(await buildInfo(supabase, userId));
    }

    // Everything below needs a current Posse membership.
    const ms = await getMembership(supabase, userId);

    if (action === 'request') {
      if (ms) return serverJson({ error: 'You are already in a Posse.' }, 409);
      const posseId = String(body?.posseId || '');
      if (!UUID_RE.test(posseId)) return serverJson({ error: 'Invalid Posse.' }, 400);
      const { data: p } = await supabase.from('posses').select('id, name, faction, owner_id, member_count, deleted_at').eq('id', posseId).maybeSingle();
      const posse = p as any;
      if (!posse || posse.deleted_at) return serverJson({ error: 'That Posse no longer exists.' }, 404);
      if (posse.faction !== me.faction) return serverJson({ error: 'You must be in the same faction as this Posse.' }, 403);
      if (posse.member_count >= POSSE_MAX) return serverJson({ error: 'That Posse is full.' }, 409);
      const { data: dup } = await supabase.from('posse_invites').select('id').eq('posse_id', posseId).eq('from_user_id', userId).eq('kind', 'request').eq('status', 'pending').maybeSingle();
      if (dup) return serverJson({ error: 'You already asked to join. The owner has to answer first.' }, 409);
      const { data: row, error } = await supabase.from('posse_invites').insert({ posse_id: posseId, kind: 'request', from_user_id: userId, to_user_id: posse.owner_id }).select('id').single();
      if (error || !row) return serverJson({ error: 'Could not send the request.' }, 500);
      await sendMail(supabase, posse.owner_id, userId, nameOf(me), 'posse_invite', (row as any).id, `${(row as any).id}|${posse.name}|request`);
      return serverJson({ result: 'sent' });
    }

    if (!ms) return serverJson({ error: 'You are not in a Posse.' }, 404);
    const role: string = ms.member.role;
    const isOfficer = role === 'owner' || role === 'co';

    if (action === 'invite') {
      if (!isOfficer) return serverJson({ error: 'Only the owner or a co-lead can invite.' }, 403);
      const code = String(body?.code || '').toUpperCase().trim();
      const wantId = String(body?.userId || '');
      let t: Profile | null = null;
      if (UUID_RE.test(wantId)) {
        const { data: target } = await supabase.from('player_profiles').select(PROFILE_COLS).eq('user_id', wantId).maybeSingle();
        t = (target as Profile | null) ?? null;
        if (!t) return serverJson({ error: 'That player could not be found.' }, 404);
      } else {
        if (code.length !== 8) return serverJson({ error: 'Pick a player or enter an 8-character friend code.' }, 400);
        const { data: target } = await supabase.from('player_profiles').select(PROFILE_COLS).eq('friend_code', code).maybeSingle();
        t = (target as Profile | null) ?? null;
        if (!t) return serverJson({ error: 'No player has that friend code.' }, 404);
      }
      if (t.user_id === userId) return serverJson({ error: 'That is your own code.' }, 400);
      if (t.faction !== ms.posse.faction) return serverJson({ error: 'That player is in a different faction. A Posse is one faction only.' }, 403);
      if (await getMembership(supabase, t.user_id)) return serverJson({ error: 'That player is already in a Posse.' }, 409);
      if (ms.posse.member_count >= POSSE_MAX) return serverJson({ error: 'Your Posse is full.' }, 409);
      const { data: dup } = await supabase.from('posse_invites').select('id').eq('posse_id', ms.posse.id).eq('to_user_id', t.user_id).eq('status', 'pending').maybeSingle();
      if (dup) return serverJson({ error: 'That player already has an invitation.' }, 409);
      const { data: sentToday } = await supabase.from('posse_invites').select('id').eq('from_user_id', userId).gte('created_at', new Date(Date.now() - 86400000).toISOString());
      if ((sentToday ?? []).length >= INVITES_PER_DAY) return serverJson({ error: 'Invitation limit reached for today.' }, 429);
      const { data: row, error } = await supabase.from('posse_invites').insert({ posse_id: ms.posse.id, kind: 'invite', from_user_id: userId, to_user_id: t.user_id }).select('id').single();
      if (error || !row) return serverJson({ error: 'Could not send the invitation.' }, 500);
      await sendMail(supabase, t.user_id, userId, nameOf(me), 'posse_invite', (row as any).id, `${(row as any).id}|${ms.posse.name}|invite`);
      return serverJson({ result: 'sent', to: nameOf(t) });
    }

    if (action === 'set_emblem') {
      if (role !== 'owner') return serverJson({ error: 'Only the Posse owner can change the emblem.' }, 403);
      const e = String(body?.emblem || '');
      if (!(e in EMBLEM_LEVEL)) return serverJson({ error: 'Unknown emblem.' }, 400);
      if (EMBLEM_LEVEL[e] > await posseLevel(supabase, ms.posse.id)) return serverJson({ error: `That emblem unlocks at Posse level ${EMBLEM_LEVEL[e]}.` }, 403);
      await supabase.from('posses').update({ emblem: e }).eq('id', ms.posse.id);
      return serverJson(await buildInfo(supabase, userId));
    }

    // Every member picks their own name colour and font (unlocked by Posse level).
    if (action === 'set_my_style') {
      const c = String(body?.color || 'default'); const f = String(body?.font || 'default');
      if (!(c in COLOR_LEVEL) || !(f in FONT_LEVEL)) return serverJson({ error: 'Unknown style.' }, 400);
      const level = await posseLevel(supabase, ms.posse.id);
      if (COLOR_LEVEL[c] > level || FONT_LEVEL[f] > level) return serverJson({ error: 'That style is not unlocked yet.' }, 403);
      await supabase.from('posse_members').update({ name_color: c === 'default' ? null : c, name_font: f === 'default' ? null : f }).eq('posse_id', ms.posse.id).eq('user_id', userId);
      return serverJson(await buildInfo(supabase, userId));
    }

    if (action === 'set_featured') {
      if (!isOfficer) return serverJson({ error: 'Only the owner or a co-lead can pick the featured missions.' }, 403);
      const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
      if (ids.length !== 3 || new Set(ids).size !== 3 || ids.some((id: string) => !MISSION_POOL.some(m => m.id === id))) return serverJson({ error: 'Pick exactly 3 different missions.' }, 400);
      const ws = weekStartKey();
      const { data: stats } = await supabase.from('posse_week_stats').select('kind, count').eq('posse_id', ms.posse.id).eq('week_start', ws);
      const hasProgress = ((stats ?? []) as any[]).some(r => String(r.kind).startsWith('done_') || Number(r.count) > 0);
      if (hasProgress) return serverJson({ error: 'Missions can only be changed before the Posse earns progress this week.' }, 409);
      await supabase.from('posse_featured').delete().eq('posse_id', ms.posse.id).eq('week_start', ws);
      await supabase.from('posse_featured').insert({ posse_id: ms.posse.id, week_start: ws, mission_ids: ids.join(',') });
      return serverJson(await buildInfo(supabase, userId));
    }

    if (action === 'request_mission') {
      const id = String(body?.missionId || '');
      if (!MISSION_POOL.some(m => m.id === id)) return serverJson({ error: 'Unknown mission.' }, 400);
      const ws = weekStartKey();
      await supabase.from('posse_mission_votes').delete().eq('posse_id', ms.posse.id).eq('week_start', ws).eq('user_id', userId);
      await supabase.from('posse_mission_votes').insert({ posse_id: ms.posse.id, week_start: ws, user_id: userId, mission_id: id });
      return serverJson(await buildInfo(supabase, userId));
    }

    // Preset-only chat. Near-real-time: clients poll chat_list every few seconds while the chat is open.
    if (action === 'chat_send' || action === 'chat_list') {
      if (action === 'chat_send') {
        const preset = String(body?.preset || '');
        if (!PRESET_IDS.has(preset)) return serverJson({ error: 'Unknown message.' }, 400);
        const { data: recent } = await supabase.from('posse_chat').select('id, created_at').eq('user_id', userId).gte('created_at', new Date(Date.now() - 3600000).toISOString());
        const list = (recent ?? []) as any[];
        if (list.length >= CHAT_PER_HOUR) return serverJson({ error: 'You have sent a lot of messages. Take a short break.' }, 429);
        if (list.filter(r => r.created_at >= new Date(Date.now() - 10000).toISOString()).length >= CHAT_PER_10S) return serverJson({ error: 'Slow down a little.' }, 429);
        const { error } = await supabase.from('posse_chat').insert({ posse_id: ms.posse.id, user_id: userId, preset });
        if (error) return serverJson({ error: 'Could not send.' }, 500);
        await supabase.from('posse_chat').delete().eq('posse_id', ms.posse.id).lt('created_at', new Date(Date.now() - 3 * 86400000).toISOString());
      }
      const after = Number(body?.after);
      let q = supabase.from('posse_chat').select('id, user_id, preset, created_at').eq('posse_id', ms.posse.id);
      if (Number.isFinite(after) && after > 0) q = q.gt('id', after);
      const { data: msgs } = await q.order('id', { ascending: false }).limit(60);
      const rowsC = ((msgs ?? []) as any[]).reverse();
      const ids = [...new Set(rowsC.map(m => m.user_id))];
      const { data: profs } = ids.length ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', ids) : { data: [] as any[] };
      const names = new Map<string, string>(((profs ?? []) as any[]).map(pr => [pr.user_id, nameOf(pr)]));
      const { data: styles } = ids.length ? await supabase.from('posse_members').select('user_id, name_color, name_font').eq('posse_id', ms.posse.id).in('user_id', ids) : { data: [] as any[] };
      const st = new Map<string, any>(((styles ?? []) as any[]).map(x => [x.user_id, x]));
      return serverJson({ messages: rowsC.map(m => ({ id: m.id, userId: m.user_id, name: names.get(m.user_id) ?? 'A player', preset: m.preset, createdAt: m.created_at, nameColor: st.get(m.user_id)?.name_color ?? null, nameFont: st.get(m.user_id)?.name_font ?? null })) });
    }

    // Officers: find recruits without a friend code.
    if (action === 'browse_lfp' || action === 'search_players') {
      if (!isOfficer) return serverJson({ error: 'Only the owner or a co-lead can recruit.' }, 403);
      let candidates: Profile[] = [];
      if (action === 'browse_lfp') {
        const { data: lfp } = await supabase.from('posse_lfp').select('user_id, faction, created_at').eq('faction', ms.posse.faction).gte('created_at', new Date(Date.now() - LFP_DAYS * 86400000).toISOString()).limit(60);
        const ids = ((lfp ?? []) as any[]).map(r => r.user_id);
        if (ids.length) { const { data } = await supabase.from('player_profiles').select(PROFILE_COLS).in('user_id', ids); candidates = (data ?? []) as Profile[]; }
      } else {
        const qText = String(body?.query ?? '').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 20);
        if (qText.length < 2) return serverJson({ error: 'Type at least 2 letters of the player name.' }, 400);
        const { data } = await supabase.from('player_profiles').select(PROFILE_COLS).eq('faction', ms.posse.faction).ilike('display_name', `%${qText}%`).limit(25);
        candidates = (data ?? []) as Profile[];
      }
      candidates = candidates.filter(c => c.user_id !== userId);
      const ids = candidates.map(c => c.user_id);
      const { data: taken } = ids.length ? await supabase.from('posse_members').select('user_id').in('user_id', ids) : { data: [] as any[] };
      const takenSet = new Set(((taken ?? []) as any[]).map(t => t.user_id));
      const { data: pend } = ids.length ? await supabase.from('posse_invites').select('to_user_id').eq('posse_id', ms.posse.id).eq('status', 'pending').in('to_user_id', ids) : { data: [] as any[] };
      const pendSet = new Set(((pend ?? []) as any[]).map(t => t.to_user_id));
      return serverJson({ players: candidates.filter(c => !takenSet.has(c.user_id)).slice(0, 20).map(c => ({ userId: c.user_id, name: nameOf(c), level: c.level ?? 1, squadPower: c.squad_power ?? 0, invited: pendSet.has(c.user_id) })) });
    }

    if (action === 'leave') {
      await removeMember(supabase, ms.posse, userId);
      return serverJson(await buildInfo(supabase, userId));
    }

    const targetId = String(body?.userId || '');
    if (['kick', 'promote', 'demote', 'transfer_owner'].includes(action)) {
      if (!UUID_RE.test(targetId) || targetId === userId) return serverJson({ error: 'Invalid player.' }, 400);
      const { data: tm } = await supabase.from('posse_members').select('user_id, role').eq('posse_id', ms.posse.id).eq('user_id', targetId).maybeSingle();
      const target = tm as any;
      if (!target) return serverJson({ error: 'That player is not in your Posse.' }, 404);
      if (action === 'kick') {
        if (!isOfficer || target.role === 'owner' || (role === 'co' && target.role !== 'member')) return serverJson({ error: 'You cannot remove that player.' }, 403);
        await removeMember(supabase, ms.posse, targetId);
      } else {
        if (role !== 'owner') return serverJson({ error: 'Only the owner can change roles.' }, 403);
        const { data: all } = await supabase.from('posse_members').select('user_id, role').eq('posse_id', ms.posse.id);
        const cos = ((all ?? []) as any[]).filter(m => m.role === 'co').length;
        if (action === 'promote') {
          if (target.role !== 'member') return serverJson({ error: 'Only members can be promoted.' }, 400);
          if (cos >= MAX_CO) return serverJson({ error: `A Posse can have ${MAX_CO} co-leads.` }, 409);
          await supabase.from('posse_members').update({ role: 'co' }).eq('posse_id', ms.posse.id).eq('user_id', targetId);
        } else if (action === 'demote') {
          if (target.role !== 'co') return serverJson({ error: 'Only co-leads can be demoted.' }, 400);
          await supabase.from('posse_members').update({ role: 'member' }).eq('posse_id', ms.posse.id).eq('user_id', targetId);
        } else {
          const freed = target.role === 'co' ? 1 : 0; // the new owner stops being a co-lead
          const oldOwnerRole = cos - freed < MAX_CO ? 'co' : 'member';
          await supabase.from('posse_members').update({ role: 'owner' }).eq('posse_id', ms.posse.id).eq('user_id', targetId);
          await supabase.from('posse_members').update({ role: oldOwnerRole }).eq('posse_id', ms.posse.id).eq('user_id', userId);
          await supabase.from('posses').update({ owner_id: targetId }).eq('id', ms.posse.id);
        }
      }
      return serverJson(await buildInfo(supabase, userId));
    }

    return serverJson({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('posse api crashed', e);
    return serverJson({ error: 'Posse unavailable' }, 500);
  }
}
