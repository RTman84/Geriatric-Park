import handler from '../api/mementos';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
let FIXED = Date.parse('2026-12-01T10:00:00Z');
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a: any[]) { if (a.length === 0) super(FIXED); else super(...(a as [any])); } static now() { return FIXED; } }
(globalThis as any).Date = FakeDate;
const U1 = '00000000-0000-4000-9000-000000000001';
let fails = 0, n = 0; const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
async function call(body?: any) { const r = await handler(new Request('http://x/api/mementos', { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer t1' }, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, body: await r.json() as any }; }
const nextDay = () => { FIXED += 86400000; };
(async () => {
  DB.tokens = { t1: U1 }; DB.chatSeq = 0;
  DB.tables = { memento_events: [], player_profiles: [{ user_id: U1, level: 105 }], memento_sync: [{ id: 1, last_run: new RealDate().toISOString() }] };
  let r = await call();
  ok(r.status === 200 && r.body.faucets.canClaim && r.body.faucets.streakDay === 1 && r.body.faucets.rewardToday === 2 && r.body.faucets.canSpin, 'fresh account can claim day 1 and spin');
  r = await call({ action: 'daily' });
  ok(r.status === 200 && r.body.gained === 2 && r.body.balance === 2 && !r.body.faucets.canClaim, 'daily claim pays 2');
  ok((await call({ action: 'daily' })).status === 409, 'daily only once per day');
  r = await call({ action: 'spin' });
  const gained = r.body.gained;
  ok(r.status === 200 && [1, 2, 3, 5, 10].includes(gained) && r.body.balance === 2 + gained, 'spin pays a table amount, server-rolled');
  ok((await call({ action: 'spin' })).status === 409, 'spin only once per day');
  // streak across 7 days
  for (let d = 2; d <= 7; d++) { nextDay(); r = await call({ action: 'daily' }); if (d < 7) ok(r.body.gained === 2, `day ${d} pays 2`); }
  ok(r.body.gained === 7, 'day 7 pays 2 + 5 bonus');
  nextDay(); r = await call();
  ok(r.body.faucets.streakDay === 1 && r.body.faucets.rewardToday === 2, 'streak wraps to day 1 after 7');
  await call({ action: 'daily' }); nextDay(); nextDay(); // skip a day
  r = await call(); ok(r.body.faucets.streakDay === 1, 'missing a day resets the streak');
  // milestones
  const before = r.body.balance;
  ok((await call({ action: 'milestone', level: 110 })).status === 403, 'cannot claim a milestone above your level');
  r = await call({ action: 'milestone', level: 100 });
  ok(r.status === 200 && r.body.gained === 10 && r.body.balance === before + 10, 'level 100 milestone pays 10');
  ok((await call({ action: 'milestone', level: 100 })).status === 409, 'milestone only once');
  ok((await call({ action: 'milestone', level: 105 })).status === 400, 'unknown milestone refused');
  DB.tables.player_profiles[0].level = 300;
  r = await call();
  ok(r.body.faucets.milestones.filter((m: any) => m.claimable).length === 20, 'all later milestones become claimable at level 300');
  ok((await call({ action: 'milestone', level: 300 })).body.gained === 100 && (await call({ action: 'milestone', level: 200 })).body.gained === 25, 'level 200 pays 25 and level 300 pays 100');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' memento faucet checks pass');
})();
