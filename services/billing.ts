import { Capacitor } from '@capacitor/core';
import { getAccessToken } from './authService';
import { apiUrl } from './api';

// Google Play Billing for Mementos packs. The app only ever starts the purchase and hands Google's purchase token to
// OUR server (api/purchase.ts), which verifies it with Google and decides what it is worth. A token that has been paid
// but not yet confirmed by the server is kept locally and retried (a crash or a bad connection never loses a purchase).
export interface VerifiedPurchase { purchaseId: string; mementos: number }
const PENDING_KEY = 'gp_pending_purchases';
type Pending = { productId: string; purchaseToken: string };

export const billingAvailable = (): boolean => Capacitor.isNativePlatform();

const readPending = (): Pending[] => { try { const v = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); return Array.isArray(v) ? v.filter(p => p && typeof p.productId === 'string' && typeof p.purchaseToken === 'string').slice(0, 20) : []; } catch { return []; } };
const writePending = (list: Pending[]) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(0, 20))); } catch { /* storage unavailable: the store still has the purchase */ } };

async function verifyWithServer(p: Pending): Promise<VerifiedPurchase> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to your account before buying Mementos.');
  const res = await fetch(apiUrl('/api/purchase'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) { const e = new Error(body.error || `Purchase check failed (${res.status}).`) as Error & { final?: boolean }; e.final = res.status === 400 || res.status === 402 || res.status === 403 || res.status === 404; throw e; }
  return { purchaseId: String(body.purchaseId), mementos: Number(body.mementos) };
}

export async function loadPackPrices(productIds: string[]): Promise<Record<string, string>> {
  if (!billingAvailable()) return {};
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const { products } = await NativePurchases.getProducts({ productIdentifiers: productIds, productType: PURCHASE_TYPE.INAPP });
    return Object.fromEntries(products.map(p => [p.identifier, p.priceString]));
  } catch { return {}; }
}

export async function buyPack(productId: string, accountId?: string): Promise<VerifiedPurchase> {
  if (!billingAvailable()) throw new Error('Mementos packs can be bought in the Android app.');
  const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
  const tx = await NativePurchases.purchaseProduct({ productIdentifier: productId, productType: PURCHASE_TYPE.INAPP, isConsumable: true, ...(accountId ? { appAccountToken: accountId.slice(0, 64) } : {}) });
  const purchaseToken = tx.purchaseToken;
  if (!purchaseToken) throw new Error('The store did not return a purchase token.');
  const pending: Pending = { productId, purchaseToken };
  writePending([...readPending().filter(p => p.purchaseToken !== purchaseToken), pending]);
  const verified = await verifyWithServer(pending);
  writePending(readPending().filter(p => p.purchaseToken !== purchaseToken));
  return verified;
}

/** Retries purchases that were paid in the store but not yet confirmed by the server. Returns the ones that are now confirmed. */
export async function retryPendingPurchases(): Promise<VerifiedPurchase[]> {
  const done: VerifiedPurchase[] = [];
  for (const p of readPending()) {
    try { done.push(await verifyWithServer(p)); writePending(readPending().filter(x => x.purchaseToken !== p.purchaseToken)); }
    catch (e) { if ((e as { final?: boolean }).final) writePending(readPending().filter(x => x.purchaseToken !== p.purchaseToken)); }
  }
  return done;
}
