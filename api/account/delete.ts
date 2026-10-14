// Permanent account deletion (Google Play requires an in-app way to delete an account and its data). Self-contained on purpose
// (shared helper files are not bundled into the deployed functions here). Edge runtime.
//
// What happens, in this order (a failure stops the process BEFORE the sign-in account is removed, so the player can simply try again):
//   1. Rows with no link to the account table are deleted (Court ladder / attempts / honors, weekly board scores, Mementos events).
//   2. Financial records (purchases, ad views, the revenue ledger) are KEPT for accounting but disconnected from the person: their
//      user id is replaced with an all-zero id.
//   3. The sign-in account itself is deleted. Every other table (saves, profile, friends, mail, Arena/Raid rows, exchanges, leaderboard)
//      is linked to it with "on delete cascade", so it disappears with it.
export const config = { runtime: 'edge' };
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
function admin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'account-delete' } } }) : null;
}

const ANON_ID = '00000000-0000-0000-0000-000000000000';
const DELETE_TABLES = ['court_ladder', 'court_attempts', 'court_honors', 'board_scores', 'memento_events'];
const ANONYMIZE_TABLES = ['purchases', 'ad_views', 'ledger_entries'];
const MISSING_TABLE = '42P01'; // a table that does not exist yet in this database is simply skipped

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const supabase = admin();
  if (!supabase) return json({ error: 'Account service is not configured' }, 503);
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token || token.length > 8192) return json({ error: 'Authentication required' }, 401);
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Invalid or expired session' }, 401);
  const userId = auth.user.id;

  let body: any = null;
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body || body.confirm !== 'DELETE') return json({ error: 'Confirmation required' }, 400);

  const deleted: string[] = [], anonymized: string[] = [];
  for (const table of DELETE_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error && error.code !== MISSING_TABLE) return json({ error: `Could not delete ${table}`, detail: error.message }, 500);
    if (!error) deleted.push(table);
  }
  for (const table of ANONYMIZE_TABLES) {
    const { error } = await supabase.from(table).update({ user_id: ANON_ID }).eq('user_id', userId);
    if (error && error.code !== MISSING_TABLE) return json({ error: `Could not update ${table}`, detail: error.message }, 500);
    if (!error) anonymized.push(table);
  }
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'Could not delete the sign-in account', detail: deleteError.message }, 500);
  return json({ ok: true, deleted, anonymized });
}
