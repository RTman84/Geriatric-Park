// Self-contained on purpose (see the note at the top of api/friends.ts): shared helper files were not being
// included in the deployed function bundle. Edge runtime is required -- written against the Web Fetch API.
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---- Economy constants (duplicated from constants.tsx on purpose; keep in sync with ECONOMY.md) -------------------
const ASSUMED_AD_REVENUE_PER_VIEW_USD = 0.008; // ASSUMPTION until real AdMob revenue is reconciled (see ECONOMY.md)
const PLAYER_SHARE = 0.7, RESERVE_SHARE = 0.2, DEV_SHARE = 0.1;
const MAX_ADS_PER_DAY = 15;
const PENDING_TTL_MS = 30 * 60 * 1000;
const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

type AccountContext = { userId: string; supabase: SupabaseClient };

function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function getBearerToken(req: Request): string | null {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
function adminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'ledger-api' } } });
}
async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const supabase = adminClient();
  const token = getBearerToken(req);
  if (!supabase) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}

// ---- AdMob server-side verification -----------------------------------------------------------------------------
function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/'); const pad = s + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(pad); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
// Google signs with ECDSA-P256/SHA-256 and sends a DER signature; WebCrypto wants raw r||s (64 bytes).
function derToRaw(der: Uint8Array): Uint8Array {
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const readInt = () => { i++; let len = der[i++]; let v = der.slice(i, i + len); i += len; while (v.length > 32 && v[0] === 0) v = v.slice(1); const out = new Uint8Array(32); out.set(v, 32 - v.length); return out; };
  const r = readInt(), s = readInt(); const raw = new Uint8Array(64); raw.set(r, 0); raw.set(s, 32); return raw;
}
function pemToSpki(pem: string): Uint8Array { return b64ToBytes(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')); }

let keyCache: { at: number; keys: Record<string, string> } | null = null;
async function getGoogleKeys(): Promise<Record<string, string>> {
  if (keyCache && Date.now() - keyCache.at < 6 * 3600 * 1000) return keyCache.keys;
  const res = await fetch(KEYS_URL); if (!res.ok) throw new Error('Could not load verifier keys');
  const body = await res.json() as { keys: { keyId: number; pem: string }[] };
  const keys: Record<string, string> = {}; for (const k of body.keys) keys[String(k.keyId)] = k.pem;
  keyCache = { at: Date.now(), keys }; return keys;
}
// The signed content is the raw query string with the trailing "&signature=...&key_id=..." removed.
async function verifyAdMobSignature(rawQuery: string, signature: string, keyId: string, keysOverride?: Record<string, string>): Promise<boolean> {
  const cut = rawQuery.indexOf('&signature='); if (cut < 0) return false;
  const content = new TextEncoder().encode(rawQuery.slice(0, cut));
  const keys = keysOverride ?? await getGoogleKeys(); const pem = keys[keyId]; if (!pem) return false;
  const key = await crypto.subtle.importKey('spki', pemToSpki(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(b64ToBytes(signature)), content);
}

// Books one verified reward. Idempotent: the unique transaction_id and the (source, ref, account) constraint make a
// replay of the same Google callback a no-op.
async function bookVerifiedView(supabase: SupabaseClient, nonce: string, userId: string, transactionId: string): Promise<'booked' | 'duplicate' | 'unknown' | 'error'> {
  const { data: view, error } = await supabase.from('ad_views').select('nonce,user_id,status,created_at').eq('nonce', nonce).maybeSingle();
  if (error) { console.error('ledger: view lookup failed', error.message); return 'error'; }
  if (!view || view.user_id !== userId) return 'unknown';
  if (view.status === 'verified') return 'duplicate';
  if (view.status !== 'pending' || Date.now() - new Date(view.created_at).getTime() > PENDING_TTL_MS) return 'unknown';
  const { error: upErr } = await supabase.from('ad_views').update({ status: 'verified', transaction_id: transactionId, verified_at: new Date().toISOString() }).eq('nonce', nonce).eq('status', 'pending');
  if (upErr) { console.error('ledger: view update failed (likely a replayed transaction)', upErr.message); return upErr.code === '23505' ? 'duplicate' : 'error'; }
  const rev = ASSUMED_AD_REVENUE_PER_VIEW_USD;
  const rows = [
    { account: 'player_pp', amount: +(rev * PLAYER_SHARE).toFixed(8) },
    { account: 'community_reserve', amount: +(rev * RESERVE_SHARE).toFixed(8) },
    { account: 'development', amount: +(rev * DEV_SHARE).toFixed(8) },
  ].map(r => ({ ...r, user_id: userId, source: 'ad_view', ref: transactionId, assumed_revenue_usd: rev }));
  const { error: insErr } = await supabase.from('ledger_entries').insert(rows);
  if (insErr) { console.error('ledger: entries insert failed', insErr.message); return insErr.code === '23505' ? 'duplicate' : 'error'; }
  return 'booked';
}

export const __test = { derToRaw, verifyAdMobSignature, bookVerifiedView };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Google's server-to-server callback (no player session): GET /api/ledger?<AdMob params>&signature=..&key_id=..
  // Detected by the signature + key_id params. The signed content is the query string exactly as received (minus the
  // trailing signature/key_id), so nothing is stripped or reordered before verifying.
  if (req.method === 'GET' && url.searchParams.has('signature') && url.searchParams.has('key_id')) {
    const raw = url.search.slice(1);
    const signature = url.searchParams.get('signature') || '', keyId = url.searchParams.get('key_id') || '';
    const nonce = url.searchParams.get('custom_data') || '', userId = url.searchParams.get('user_id') || '', tx = url.searchParams.get('transaction_id') || '';
    if (!signature || !keyId || !nonce || !userId || !tx) return serverJson({ error: 'Bad callback' }, 400);
    let ok = false;
    try { ok = await verifyAdMobSignature(raw, signature, keyId); } catch (e) { console.error('ledger: signature check failed', (e as Error).message); return serverJson({ error: 'Verification unavailable' }, 503); }
    if (!ok) return serverJson({ error: 'Invalid signature' }, 403);
    const supabase = adminClient(); if (!supabase) return serverJson({ error: 'Not configured' }, 503);
    const result = await bookVerifiedView(supabase, nonce, userId, tx);
    // Google only needs a 2xx to stop retrying; unknown/duplicate are final answers, errors should be retried.
    return serverJson({ result }, result === 'error' ? 500 : 200);
  }

  const account = await requireAccount(req);
  if (account instanceof Response) return account;
  const { userId, supabase } = account;
  const today = new Date().toISOString().slice(0, 10);

  if (req.method === 'POST') {
    // Start an ad view: the nonce goes to AdMob as custom_data so Google's callback can be matched to this player.
    const { count, error: cErr } = await supabase.from('ad_views').select('nonce', { count: 'exact', head: true }).eq('user_id', userId).eq('day', today).neq('status', 'expired');
    if (cErr) { console.error('ledger: count failed', cErr.message); return serverJson({ error: 'Ledger unavailable', detail: cErr.message }, 500); }
    if ((count ?? 0) >= MAX_ADS_PER_DAY) return serverJson({ error: 'Daily sponsor limit reached' }, 429);
    const { data, error } = await supabase.from('ad_views').insert({ user_id: userId, day: today }).select('nonce').single();
    if (error || !data) { console.error('ledger: begin failed', error?.message); return serverJson({ error: 'Ledger unavailable', detail: error?.message }, 500); }
    return serverJson({ nonce: data.nonce, userId });
  }

  if (req.method === 'GET') {
    // Verified totals for this player (shadow mode: compare with the local PP before switching the client over).
    const { data, error } = await supabase.from('ledger_entries').select('account,amount').eq('user_id', userId).eq('source', 'ad_view');
    if (error) return serverJson({ error: 'Ledger unavailable', detail: error.message }, 500);
    const totals = { player_pp: 0, community_reserve: 0, development: 0 } as Record<string, number>;
    for (const r of data ?? []) totals[(r as any).account] = (totals[(r as any).account] ?? 0) + Number((r as any).amount);
    const nonce = url.searchParams.get('nonce');
    let status: string | null = null;
    if (nonce) { const { data: v } = await supabase.from('ad_views').select('status,user_id').eq('nonce', nonce).maybeSingle(); if (v && v.user_id === userId) status = v.status; }
    return serverJson({ verifiedTotals: totals, status });
  }
  return serverJson({ error: 'Method not allowed' }, 405);
}
