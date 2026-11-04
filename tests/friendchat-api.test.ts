import handler from '../api/friendchat';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
const U = (n: number) => '00000000-0000-4000-9000-' + String(n).padStart(12, '0');
DB.tables = { friend_requests: [{ id: 'r1', requester_id: U(1), addressee_id: U(2), status: 'accepted' }, { id: 'r2', requester_id: U(3), addressee_id: U(1), status: 'accepted' }, { id: 'r3', requester_id: U(4), addressee_id: U(1), status: 'pending' }], friend_chat: [] };
['A', 'B', 'C', 'D'].forEach((n, i) => { DB.tokens['t' + n] = U(i + 1); });
async function call(who: string | null, body: any) { const h: any = { 'content-type': 'application/json' }; if (who) h.authorization = 'Bearer t' + who; const r = await handler(new Request('http://x/api/friendchat', { method: 'POST', headers: h, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() as any }; }
let fails = 0, n = 0; const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
(async () => {
  ok((await call(null, { action: 'list', friendId: U(2) })).status === 401, 'auth required');
  ok((await call('A', { action: 'send', friendId: U(4), preset: 'hello' })).status === 403, 'pending request is not a friend');
  ok((await call('A', { action: 'send', friendId: U(2), preset: 'not a preset' })).status === 400, 'only presets');
  let r = await call('A', { action: 'send', friendId: U(2), preset: 'st_wave' });
  ok(r.status === 200 && r.body.messages.length === 1 && r.body.messages[0].mine === true, 'friend A->B send (sticker)');
  r = await call('B', { action: 'list', friendId: U(1) });
  ok(r.body.messages.length === 1 && r.body.messages[0].mine === false && r.body.messages[0].preset === 'st_wave', 'B sees it as not mine');
  r = await call('C', { action: 'send', friendId: U(1), preset: 'hello' });
  ok(r.status === 200, 'friendship works in either direction (C requested A earlier)');
  ok((await call('C', { action: 'list', friendId: U(2) })).status === 403, 'cannot read other pairs');
  r = await call('B', { action: 'summary' });
  ok(Object.keys(r.body.latest).length === 1 && r.body.latest[U(1)] > 0, 'summary shows latest from A');
  const last = (await call('B', { action: 'list', friendId: U(1) })).body.messages.slice(-1)[0].id;
  await call('A', { action: 'send', friendId: U(2), preset: 'haha' });
  r = await call('B', { action: 'list', friendId: U(1), after: last });
  ok(r.body.messages.length === 1 && r.body.messages[0].preset === 'haha', 'poll returns only newer');
  for (let i = 0; i < 3; i++) await call('A', { action: 'send', friendId: U(2), preset: 'yes' });
  ok((await call('A', { action: 'send', friendId: U(2), preset: 'yes' })).status === 429, 'burst limit');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' friend chat checks pass');
})();
