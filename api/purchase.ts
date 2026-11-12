// Self-contained on purpose (shared helper files were not being included in the deployed bundle here). Edge runtime.
//
// Google Play Billing, server side: the app sends the purchase token it got from the store; this route asks Google
// whether that purchase is real and paid, grants the Mementos EXACTLY ONCE (purchase_token is unique), and books the
// money into the ledger. The client never decides what a purchase is worth.
//
// Needs these environment variables (see ANDROID_SETUP.md):
//   GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY (the PEM private key, \n escapes allowed),
//   PLAY_PACKAGE_NAME (defaults to com.geriatricpark.game)
export const config = { runtime: 'edge' };
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!url || !key) return json({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return json({ error: 'Authentication required' }, 401);
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'purchase-api' } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}

// Product catalog. The SERVER decides what each product is worth. Ids must match the in-app products in Play Console.
export const PRODUCTS: Record<string, { mementos: number; priceUsd: number }> = {
  mementos_100: { mementos: 100, priceUsd: 0.99 },
  mementos_550: { mementos: 550, priceUsd: 4.99 },
  mementos_1150: { mementos: 1150, priceUsd: 9.99 },
};
const STORE_NET = 0.85;      // assumed share left after Google's fee (15% on the first 1M USD a year)
const RESERVE_SHARE = 0.3;   // of net revenue, booked to the community reserve; the rest to development (ECONOMY.md 6t)

const b64url = (buf: ArrayBuffer | Uint8Array) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; b.forEach(c => s += String.fromCharCode(c)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const pemToPkcs8 = (pem: string) => { const b = atob(pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };

async function googleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL, pem = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  if (!email || !pem) throw new Error('Play billing is not configured');
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 })}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${unsigned}.${b64url(sig)}` });
  const body = await res.json().catch(() => ({} as any));
  if (!res.ok || !body.access_token) throw new Error('Google sign-in failed');
  return body.access_token as string;
}
async function lookupPurchase(productId: string, purchaseToken: string): Promise<{ purchaseState?: number; orderId?: string; purchaseType?: number } | null> {
  const pkg = process.env.PLAY_PACKAGE_NAME || 'com.geriatricpark.game';
  const access = await googleAccessToken();
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`, { headers: { Authorization: `Bearer ${access}` } });
  if (res.status === 404 || res.status === 410 || res.status === 400) return null; // not a real purchase for this product
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  return await res.json();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const ctx = await requireAccount(req);
  if (ctx instanceof Response) return ctx;
  const { userId, supabase } = ctx;

  let body: any; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const productId = String(body?.productId || ''), purchaseToken = String(body?.purchaseToken || '');
  const product = PRODUCTS[productId];
  if (!product) return json({ error: 'Unknown product' }, 400);
  if (purchaseToken.length < 10 || purchaseToken.length > 2000) return json({ error: 'Invalid purchase token' }, 400);

  // Already granted? Answer with the same amount so the app can finish crediting after a crash, but never grant twice.
  const { data: existing, error: exErr } = await supabase.from('purchases').select('id, user_id, mementos').eq('purchase_token', purchaseToken).maybeSingle();
  if (exErr) { console.error('purchase lookup failed', exErr.message); return json({ error: 'Purchases unavailable', detail: exErr.message }, 500); }
  if (existing) {
    if ((existing as any).user_id !== userId) return json({ error: 'That purchase belongs to another account' }, 403);
    return json({ ok: true, duplicate: true, purchaseId: String((existing as any).id), mementos: (existing as any).mementos });
  }

  let purchase: Awaited<ReturnType<typeof lookupPurchase>>;
  try { purchase = await lookupPurchase(productId, purchaseToken); }
  catch (e) { console.error('purchase verification failed', (e as Error).message); return json({ error: 'Could not verify the purchase right now. Try again shortly.' }, 503); }
  if (!purchase) return json({ error: 'Purchase not found' }, 404);
  if (purchase.purchaseState !== 0) return json({ error: 'Purchase is not paid (cancelled or pending)' }, 402);
  if (purchase.purchaseType === 0) return json({ error: 'Test purchases are not accepted here' }, 402); // 0 = license-testing purchase; remove this line to test with a license tester

  const { data: inserted, error: insErr } = await supabase.from('purchases').insert({ user_id: userId, product_id: productId, purchase_token: purchaseToken, order_id: purchase.orderId ?? null, mementos: product.mementos, price_usd: product.priceUsd }).select('id').single();
  if (insErr) {
    if (insErr.code === '23505') { // a parallel request got there first
      const { data: again } = await supabase.from('purchases').select('id, user_id, mementos').eq('purchase_token', purchaseToken).maybeSingle();
      if (again && (again as any).user_id === userId) return json({ ok: true, duplicate: true, purchaseId: String((again as any).id), mementos: (again as any).mementos });
    }
    console.error('purchase insert failed', insErr.message); return json({ error: 'Purchases unavailable', detail: insErr.message }, 500);
  }

  // The purchased Mementos go into the account's server-held balance (idempotent per purchase token).
  const { error: mErr } = await supabase.from('memento_events').insert({ user_id: userId, kind: 'purchase', amount: product.mementos, ref: purchaseToken, meta: { productId, purchase: (inserted as any).id } });
  if (mErr && mErr.code !== '23505') console.error('purchase memento credit failed', mErr.message);

  // Money in: the reserve gets its share of NET revenue, development the rest (idempotent per purchase token).
  const net = +(product.priceUsd * STORE_NET).toFixed(8), reserve = +(net * RESERVE_SHARE).toFixed(8);
  const { error: lErr } = await supabase.from('ledger_entries').insert([
    { user_id: userId, account: 'community_reserve', amount: reserve, source: 'purchase', ref: purchaseToken, assumed_revenue_usd: net },
    { user_id: userId, account: 'development', amount: +(net - reserve).toFixed(8), source: 'purchase', ref: purchaseToken, assumed_revenue_usd: net },
  ]);
  if (lErr && lErr.code !== '23505') console.error('purchase ledger write failed (grant stands)', lErr.message);
  return json({ ok: true, duplicate: false, purchaseId: String((inserted as any).id), mementos: product.mementos });
}
