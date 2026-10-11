// Server-held Mementos (premium currency). Self-contained on purpose (shared helper files were not being included in the
// deployed bundle here). Edge runtime.
//
// The SERVER's balance is the real one: the app mirrors it and overwrites its local copy on every sync. Everything that
// changes it is an event row (purchases from api/purchase.ts, spends, PP conversions, refunds). Refunds are found by asking
// Google for voided purchases (at most every 30 minutes, triggered by any request): the refunded Mementos are taken back and,
// if they were already spent, the Mementos purchases made since that purchase are revoked (newest first) until it balances.
export const config = { runtime: 'edge' };
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
function admin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'mementos-api' } } }) : null;
}
async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const supabase = admin();
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!supabase) return json({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return json({ error: 'Authentication required' }, 401);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}

// ---- Catalog (must match constants.tsx; the server is the one that decides) ------------------------------------------
const PREMIUM_ROOM_MAX = 10;
const roomPrice = (owned: number) => 15 + 5 * owned;
const GOLD_PASS_PRICE = 550; // about $5 of Mementos; keep in sync with GOLD_PASS_PRICE_MEMENTOS in constants.tsx
const SEASON_EPOCH = Date.UTC(2026, 9, 1), SEASON_LENGTH_MS = 30 * 24 * 60 * 60 * 1000; // global seasons, same as currentSeasonWindow() in constants.tsx
const currentSeasonId = (now = Date.now()) => Math.max(0, Math.floor((now - SEASON_EPOCH) / SEASON_LENGTH_MS)) + 1;
const MEMENTOS_PER_PP = 100, PP_MIN = 0.01, PP_CONVERT_PER_DAY = 2;
const ITEM_PRICES: Record<string, number> = { m01: 60, m02: 80, m03: 60, m04: 70, m05: 60, m06: 90, m07: 80, m08: 100, m09: 150, m10: 70, m11: 90, m12: 120 };
const ITEM_IDS = Object.keys(ITEM_PRICES); // same order as MEMENTO_ITEMS
const ITEMS_PER_WEEK = 2, CYCLE_WEEKS = ITEM_IDS.length / ITEMS_PER_WEEK;
const weekIndex = (now = Date.now()) => Math.floor((now / 86400000 + 3) / 7);
const seedRand = (seed: number) => { let s = (seed * 2654435761) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function itemsForWeek(week: number): string[] {
  const cycle = Math.floor(week / CYCLE_WEEKS), pos = ((week % CYCLE_WEEKS) + CYCLE_WEEKS) % CYCLE_WEEKS;
  const order = ITEM_IDS.map((_, i) => i); const rnd = seedRand(cycle + 104729);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order.slice(pos * ITEMS_PER_WEEK, pos * ITEMS_PER_WEEK + ITEMS_PER_WEEK).map(i => ITEM_IDS[i]);
}

// ---- State derived from events ----------------------------------------------------------------------------------------
type Ev = { id: number; kind: string; amount: number; ref: string; meta: any; created_at: string };
async function loadEvents(supabase: SupabaseClient, userId: string): Promise<Ev[]> {
  const { data, error } = await supabase.from('memento_events').select('id, kind, amount, ref, meta, created_at').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Ev[];
}
function deriveState(events: Ev[]) {
  const revoked = new Set(events.filter(e => e.kind === 'revoke').map(e => String(e.meta?.of ?? '')));
  const live = (kind: string) => events.filter(e => e.kind === kind && !revoked.has(e.ref));
  return { balance: events.reduce((t, e) => t + e.amount, 0), rooms: live('room').length, items: live('item').map(e => e.ref.slice(5)), passes: live('pass').map(e => e.ref.slice(5)), convertedPp: events.filter(e => e.kind === 'convert').reduce((t, e) => t + Number(e.meta?.pp ?? 0), 0) };
}
async function addEvent(supabase: SupabaseClient, userId: string, kind: string, amount: number, ref: string, meta: object = {}): Promise<'ok' | 'duplicate' | 'error'> {
  const { error } = await supabase.from('memento_events').insert({ user_id: userId, kind, amount, ref, meta });
  if (!error) return 'ok';
  return error.code === '23505' ? 'duplicate' : 'error';
}
async function snapshot(supabase: SupabaseClient, userId: string) {
  const s = deriveState(await loadEvents(supabase, userId));
  return { balance: s.balance, premiumRooms: s.rooms, items: s.items, passes: s.passes };
}

// ---- Refunds ------------------------------------------------------------------------------------------------------------
async function googleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL, pem = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  if (!email || !pem) throw new Error('Play billing is not configured');
  const b64url = (buf: ArrayBuffer | Uint8Array) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; b.forEach(c => s += String.fromCharCode(c)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const raw = atob(pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')); const der = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  const now = Math.floor(Date.now() / 1000), enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 })}`;
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${unsigned}.${b64url(sig)}` });
  const body = await res.json().catch(() => ({} as any));
  if (!res.ok || !body.access_token) throw new Error('Google sign-in failed');
  return body.access_token as string;
}

// Takes back one refunded purchase. If the Mementos were already spent, revoke what was bought since (newest first).
export async function processRefund(supabase: SupabaseClient, purchase: { id: number; user_id: string; purchase_token: string; mementos: number; created_at: string }): Promise<{ revoked: string[]; writtenOff: number }> {
  const { user_id: userId } = purchase;
  const { data: claimed } = await supabase.from('purchases').select('refunded_at').eq('id', purchase.id).maybeSingle();
  if ((claimed as any)?.refunded_at) return { revoked: [], writtenOff: 0 };
  await supabase.from('purchases').update({ refunded_at: new Date().toISOString() }).eq('id', purchase.id);
  const status = await addEvent(supabase, userId, 'refund', -purchase.mementos, `refund:${purchase.purchase_token}`, { purchase: purchase.id });
  if (status === 'duplicate') return { revoked: [], writtenOff: 0 };
  const revoked: string[] = [];
  let events = await loadEvents(supabase, userId);
  let balance = deriveState(events).balance;
  if (balance < 0) {
    const gone = new Set(events.filter(e => e.kind === 'revoke').map(e => String(e.meta?.of ?? '')));
    const spends = events.filter(e => (e.kind === 'room' || e.kind === 'item' || e.kind === 'pass') && !gone.has(e.ref) && e.created_at >= purchase.created_at).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    for (const sp of spends) {
      if (balance >= 0) break;
      if (await addEvent(supabase, userId, 'revoke', -sp.amount, `revoke:${sp.ref}`, { of: sp.ref, purchase: purchase.id }) === 'ok') { balance -= sp.amount; revoked.push(sp.ref); }
    }
  }
  let writtenOff = 0;
  if (balance < 0) { writtenOff = -balance; await addEvent(supabase, userId, 'writeoff', writtenOff, `writeoff:${purchase.purchase_token}`, { purchase: purchase.id }); }
  return { revoked, writtenOff };
}

export async function syncRefunds(supabase: SupabaseClient): Promise<void> {
  try {
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL) return;
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: sync } = await supabase.from('memento_sync').select('last_run').eq('id', 1).maybeSingle();
    if (sync && (sync as any).last_run > cutoff) return;
    await supabase.from('memento_sync').update({ last_run: new Date().toISOString() }).eq('id', 1);
    const pkg = process.env.PLAY_PACKAGE_NAME || 'com.geriatricpark.game';
    const access = await googleAccessToken();
    const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/voidedpurchases?startTime=${Date.now() - 30 * 86400000}&type=0`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) { console.error('voided purchases lookup failed', res.status); return; }
    const body = await res.json().catch(() => ({} as any));
    for (const v of (body.voidedPurchases ?? []) as { purchaseToken?: string }[]) {
      if (!v.purchaseToken) continue;
      const { data: p } = await supabase.from('purchases').select('id, user_id, purchase_token, mementos, created_at, refunded_at').eq('purchase_token', v.purchaseToken).maybeSingle();
      if (p && !(p as any).refunded_at) await processRefund(supabase, p as any);
    }
  } catch (e) { console.error('refund sync failed', (e as Error).message); } // never let this break a player's request
}

export default async function handler(req: Request): Promise<Response> {
  const ctx = await requireAccount(req);
  if (ctx instanceof Response) return ctx;
  const { userId, supabase } = ctx;
  await syncRefunds(supabase);
  try {
    if (req.method === 'GET') return json(await snapshot(supabase, userId));
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    let body: any; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const action = String(body?.action || '');
    const events = await loadEvents(supabase, userId);
    const st = deriveState(events);
    const fail = (error: string, status = 400) => json({ error, ...{ balance: st.balance, premiumRooms: st.rooms, items: st.items, passes: st.passes } }, status);

    async function spend(kind: 'room' | 'item' | 'pass', price: number, ref: string, meta: object) {
      if (st.balance < price) return fail(`You need ${price} Mementos.`, 402);
      const r = await addEvent(supabase, userId, kind, -price, ref, meta);
      if (r === 'duplicate') return fail('You already have that.', 409);
      if (r === 'error') return fail('Mementos are unavailable right now.', 500);
      if ((await snapshot(supabase, userId)).balance < 0) { // two spends raced: undo this one
        await supabase.from('memento_events').delete().eq('user_id', userId).eq('ref', ref);
        return fail(`You need ${price} Mementos.`, 402);
      }
      return json({ ok: true, ...(await snapshot(supabase, userId)) });
    }

    if (action === 'room') {
      if (st.rooms >= PREMIUM_ROOM_MAX) return fail('You already own every extra room.', 409);
      return spend('room', roomPrice(st.rooms), `room:${st.rooms}`, {});
    }
    if (action === 'pass') {
      const seasonId = String(currentSeasonId());
      if (st.passes.includes(seasonId)) return fail('You already have this season\'s Gold Pass.', 409);
      return spend('pass', GOLD_PASS_PRICE, `pass:${seasonId}`, { season: Number(seasonId) });
    }
    if (action === 'item') {
      const id = String(body?.id || '');
      if (!(id in ITEM_PRICES)) return fail('Unknown keepsake.');
      if (st.items.includes(id)) return fail('You already own that keepsake.', 409);
      if (!itemsForWeek(weekIndex()).includes(id)) return fail('That keepsake is not on sale this week.', 409);
      return spend('item', ITEM_PRICES[id], `item:${id}`, { id });
    }
    if (action === 'convert') {
      const pp = Math.round(Number(body?.pp) * 100) / 100, nonce = String(body?.nonce || '').slice(0, 60);
      if (!(pp >= PP_MIN) || !nonce) return fail('Invalid conversion.');
      // PP is only real if the server verified the ads behind it (ledger). The unverified path is for testing only.
      const { data: led } = await supabase.from('ledger_entries').select('amount').eq('user_id', userId).eq('account', 'player_pp').eq('source', 'ad_view');
      const verifiedPp = (led ?? []).reduce((t: number, r: any) => t + Number(r.amount), 0);
      const unverifiedOk = process.env.ALLOW_UNVERIFIED_PP_CONVERT === 'true';
      if (!unverifiedOk && pp > verifiedPp - st.convertedPp + 1e-9) return fail('Only PP earned from verified sponsor views can be converted.', 403);
      const today = new Date().toISOString().slice(0, 10);
      const ppToday = events.filter(e => e.kind === 'convert' && e.created_at.slice(0, 10) === today).reduce((t, e) => t + Number(e.meta?.pp ?? 0), 0);
      if (ppToday + pp > PP_CONVERT_PER_DAY + 1e-9) return fail(`You can convert at most ${PP_CONVERT_PER_DAY} PP a day.`, 429);
      const gained = Math.floor(pp * MEMENTOS_PER_PP);
      if (gained < 1) return fail('That is too small to convert.');
      const r = await addEvent(supabase, userId, 'convert', gained, `convert:${nonce}`, { pp });
      if (r === 'error') return fail('Mementos are unavailable right now.', 500);
      return json({ ok: true, duplicate: r === 'duplicate', convertedPp: pp, ...(await snapshot(supabase, userId)) });
    }
    return fail('Unknown action.');
  } catch (e) { console.error('mementos route failed', (e as Error).message); return json({ error: 'Mementos are unavailable right now.', detail: (e as Error).message }, 500); }
}
export const __test = { itemsForWeek, weekIndex };
