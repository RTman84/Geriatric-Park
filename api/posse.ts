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
const EMBLEMS = ['sunrise', 'owl', 'sedan', 'bingo', 'cane', 'teapot', 'trophy', 'star', 'shield'];
const POSSE_MAX = 100;
const MAX_CO = 2;
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
  await recount(supabase, posseId);
  return { ok: true };
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
  if (!ms) return { posse: null, faction: prof?.faction ?? null, pendingInvites, notice };
  const { data: rows } = await supabase.from('posse_members').select('user_id, role, joined_at, week_start, week_points').eq('posse_id', ms.posse.id);
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
    roster.push({ userId: m.user_id, role: m.role, name: nameOf(p), level: p?.level ?? 1, squadPower: p?.squad_power ?? 0, title: p?.selected_title ?? null, weekPoints: pts, joinedAt: m.joined_at });
  }
  const rank = (r: string) => (r === 'owner' ? 0 : r === 'co' ? 1 : 2);
  roster.sort((a, b) => rank(a.role) - rank(b.role) || b.weekPoints - a.weekPoints || a.name.localeCompare(b.name));
  return {
    posse: { id: ms.posse.id, name: ms.posse.name, tag: ms.posse.tag, faction: ms.posse.faction, emblem: ms.posse.emblem, memberCount: roster.length, maxMembers: POSSE_MAX, createdAt: ms.posse.created_at },
    myRole: ms.member.role, roster, weekStart: ws, weekPoints: weekTotal, weekGoal: roster.length * WEEKLY_GOAL_PER_MEMBER, faction: prof?.faction ?? null, pendingInvites, notice,
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
      const emblem = EMBLEMS.includes(String(body?.emblem)) ? String(body.emblem) : 'sunrise';
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
      if (code.length !== 8) return serverJson({ error: 'Enter an 8-character friend code.' }, 400);
      const { data: target } = await supabase.from('player_profiles').select(PROFILE_COLS).eq('friend_code', code).maybeSingle();
      const t = target as Profile | null;
      if (!t) return serverJson({ error: 'No player has that friend code.' }, 404);
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
