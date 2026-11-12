import handler from '../api/mementos';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
let FIXED = Date.parse('2026-12-07T10:00:00Z'); // a Monday
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a: any[]) { if (a.length === 0) super(FIXED); else super(...(a as [any])); } static now() { return FIXED; } }
(globalThis as any).Date = FakeDate;
const U1 = '00000000-0000-4000-9000-000000000001';
let fails = 0, n = 0; const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
async function call(body: any) { const r = await handler(new Request('http://x/api/mementos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer t1' }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() as any }; }
(async () => {
  DB.tokens = { t1: U1 }; DB.chatSeq = 0;
  DB.tables = { memento_events: [{ user_id: U1, kind: 'purchase', amount: 100000, ref: 'seed', created_at: new RealDate().toISOString() }], player_profiles: [{ user_id: U1, level: 5 }], memento_sync: [{ id: 1, last_run: new RealDate().toISOString() }] };
  const bought = new Map<string, number>(); // id -> week offset it could be bought
  const expected: Record<string, number> = { m01: 60, m08: 100, m09: 150, m13: 85, m15: 60, m16: 110, m18: 85 };
  for (let w = 0; w < 9; w++) {
    for (const id of Object.keys(expected)) {
      const before = DB.tables.memento_events.reduce((t: number, e: any) => t + e.amount, 0);
      const r = await call({ action: 'item', id });
      if (r.status === 200) { bought.set(id, w); ok(before - r.body.balance === expected[id], `${id} costs ${expected[id]}`); }
      else ok(r.status === 409, `${id} off-sale week answers 409 (got ${r.status})`);
    }
    FIXED += 7 * 86400000;
  }
  ok([...bought.keys()].length === Object.keys(expected).length, 'every tested keepsake (including the new m13, m15, m16, m18) is on sale once per 9-week cycle');
  ok((await call({ action: 'item', id: 'm99' })).status === 400, 'unknown keepsake refused');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' keepsake checks pass');
})();
