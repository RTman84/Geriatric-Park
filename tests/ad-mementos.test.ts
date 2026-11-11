import handler, { __test } from '../api/ledger';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
const U1 = '00000000-0000-4000-9000-000000000001', U2 = '00000000-0000-4000-9000-000000000002';
let fails = 0, n = 0; const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
const supabase: any = require('@supabase/supabase-js').createClient();
async function sim(nonce: string, token = 't1') { const r = await handler(new Request('http://x/api/ledger?simulate=1', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ nonce }) })); return { status: r.status, body: await r.json() as any }; }
const fresh = () => new Date().toISOString();
(async () => {
  DB.tokens = { t1: U1, t2: U2 }; DB.chatSeq = 0;
  DB.tables = { ad_views: [{ nonce: 'n1', user_id: U1, status: 'pending', created_at: fresh(), day: '2026-12-01' }, { nonce: 'n2', user_id: U1, status: 'pending', created_at: fresh(), day: '2026-12-01' }, { nonce: 'n3', user_id: U1, status: 'pending', created_at: fresh(), day: '2026-12-01' }], ledger_entries: [], memento_events: [] };
  // real path: verified Google callback books the ledger AND pays 1 Memento, once
  let res = await __test.bookVerifiedView(supabase, 'n1', U1, 'tx-1');
  ok(res === 'booked' && DB.tables.ledger_entries.length === 3, 'verified view books the ledger shares');
  const ev = DB.tables.memento_events.filter((e: any) => e.kind === 'ad');
  ok(ev.length === 1 && ev[0].amount === 1 && ev[0].ref === 'ad:tx-1' && ev[0].user_id === U1, 'verified view pays exactly 1 Memento');
  res = await __test.bookVerifiedView(supabase, 'n1', U1, 'tx-1');
  ok(res === 'duplicate' && DB.tables.memento_events.length === 1, 'replayed callback pays nothing more');
  ok(await __test.bookVerifiedView(supabase, 'n2', U2, 'tx-2') === 'unknown' && DB.tables.memento_events.length === 1, 'another player cannot claim someone else\'s view');
  await __test.grantAdMemento(supabase, U1, 'tx-1'); ok(DB.tables.memento_events.length === 1, 'grant is idempotent per transaction');
  // simulated path (Preview only)
  delete process.env.ALLOW_SIMULATED_AD_REWARD;
  ok((await sim('n2')).status === 403 && DB.tables.memento_events.length === 1, 'simulated rewards refuse unless the Preview variable is set');
  process.env.ALLOW_SIMULATED_AD_REWARD = 'true';
  let r = await sim('n2');
  ok(r.status === 200 && DB.tables.memento_events.length === 2 && DB.tables.memento_events[1].ref === 'ad:sim:n2', 'simulated view pays 1 Memento on Preview');
  ok((await sim('n2')).status === 404 && DB.tables.memento_events.length === 2, 'simulated view cannot be replayed');
  ok((await sim('n3', 't2')).status === 404, 'simulated view belongs to its owner');
  ok(DB.tables.ledger_entries.length === 3, 'simulated views never touch the revenue ledger');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' ad memento checks pass');
})();
