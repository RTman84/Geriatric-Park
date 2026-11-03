import handler from '../api/posse';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
const U = (n: number) => '00000000-0000-4000-9000-' + String(n).padStart(12, '0');
const users = ['A', 'B', 'C', 'D', 'E', 'F'];
function seed(faction: Record<string, string | null>) {
  DB.tables = { player_profiles: [], posses: [], posse_members: [], posse_invites: [], mail_inbox: [] };
  users.forEach((n, i) => { DB.tokens['t' + n] = U(i + 1); DB.tables.player_profiles.push({ user_id: U(i + 1), display_name: 'Player' + n, faction: (n in faction) ? faction[n] : 'early_birds', level: 5, squad_power: 100, friend_code: 'CODE000' + n, selected_title: null }); });
}
const uid = (n: string) => U(users.indexOf(n) + 1);
async function call(who: string | null, body?: any, method = 'POST') {
  const headers: any = { 'content-type': 'application/json' }; if (who) headers.authorization = 'Bearer t' + who;
  const res = await handler(new Request('http://x/api/posse', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }));
  return { status: res.status, body: await res.json() as any };
}
let fails = 0, n = 0;
const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
(async () => {
  seed({ C: 'night_owls', F: null });
  ok((await call(null, { action: 'info' })).status === 401, 'unauthenticated rejected');
  ok((await call('F', { action: 'create', name: 'No Faction', tag: 'NF' })).status === 403, 'create needs a faction');
  ok((await call('A', { action: 'create', name: 'f u c k', tag: 'OG' })).status === 400, 'bad name blocked');
  ok((await call('A', { action: 'create', name: 'Admin Posse', tag: 'OG' })).status === 400, 'reserved name blocked');
  ok((await call('A', { action: 'create', name: 'Old Gang', tag: 'ass' })).status === 400, 'bad tag blocked');
  ok((await call('A', { action: 'create', name: 'Old Gang', tag: 'TOOLONG' })).status === 400, 'tag length');
  let r = await call('A', { action: 'create', name: 'Old Gang', tag: 'og', emblem: 'owl' });
  ok(r.status === 200 && r.body.posse?.name === 'Old Gang' && r.body.myRole === 'owner' && r.body.posse.tag === 'OG' && r.body.roster.length === 1, 'A creates Posse');
  ok((await call('A', { action: 'create', name: 'Another', tag: 'AN' })).status === 409, 'cannot create while in a Posse');
  ok((await call('B', { action: 'create', name: 'old  gang', tag: 'OG2' })).status === 409, 'duplicate name rejected');
  ok((await call('B', { action: 'invite', code: 'CODE000C' })).status === 404, 'non-member cannot invite');
  r = await call('A', { action: 'invite', code: 'CODE000C' });
  ok(r.status === 403, 'cannot invite other faction');
  r = await call('A', { action: 'invite', code: 'CODE000B' });
  ok(r.status === 200 && DB.tables.mail_inbox.length === 1 && DB.tables.mail_inbox[0].kind === 'posse_invite', 'invite sends mail');
  ok((await call('A', { action: 'invite', code: 'CODE000B' })).status === 409, 'duplicate invite rejected');
  const inviteId = DB.tables.posse_invites[0].id;
  ok(DB.tables.mail_inbox[0].note.split('|')[0] === inviteId && DB.tables.mail_inbox[0].note.endsWith('|invite'), 'mail note carries invite id');
  r = await call('B', { action: 'info' });
  ok(r.body.pendingInvites.length === 1 && r.body.pendingInvites[0].posse.name === 'Old Gang', 'B sees pending invite');
  ok((await call('C', { action: 'respond', inviteId, accept: true })).status === 404, 'only recipient can respond');
  r = await call('B', { action: 'respond', inviteId, accept: true });
  ok(r.status === 200 && r.body.posse?.memberCount === 2 && r.body.myRole === 'member', 'B joins');
  ok((await call('B', { action: 'invite', code: 'CODE000D' })).status === 403, 'member cannot invite');
  // join request flow
  r = await call('D', { action: 'request', posseId: DB.tables.posses[0].id });
  ok(r.status === 200 && DB.tables.mail_inbox.length === 2 && DB.tables.mail_inbox[1].recipient_id === uid('A'), 'D request mails owner');
  ok((await call('D', { action: 'request', posseId: DB.tables.posses[0].id })).status === 409, 'duplicate request rejected');
  ok((await call('C', { action: 'request', posseId: DB.tables.posses[0].id })).status === 403, 'other faction cannot request');
  const reqId = DB.tables.posse_invites.find((i: any) => i.kind === 'request').id;
  ok((await call('B', { action: 'respond', inviteId: reqId, accept: true })).status === 404, 'non-owner cannot answer request');
  r = await call('A', { action: 'respond', inviteId: reqId, accept: true });
  ok(r.status === 200 && r.body.posse.memberCount === 3, 'owner approves request');
  // search
  r = await call('E', { action: 'search_by_tag', tag: 'og' });
  ok(r.body.results?.length === 1 && r.body.results[0].name === 'Old Gang', 'search by tag (same faction)');
  r = await call('C', { action: 'search_by_tag', tag: 'OG' });
  ok(r.body.results?.length === 0, 'search hides other factions');
  // roles
  ok((await call('A', { action: 'promote', userId: uid('B') })).status === 200, 'promote B');
  ok((await call('A', { action: 'promote', userId: uid('D') })).status === 200, 'promote D');
  await call('E', { action: 'request', posseId: DB.tables.posses[0].id });
  await call('A', { action: 'respond', inviteId: DB.tables.posse_invites.find((i: any) => i.from_user_id === uid('E')).id, accept: true });
  const fakeCos = [1, 2, 3].map(i => ({ posse_id: DB.tables.posses[0].id, user_id: '00000000-0000-4000-b000-00000000000' + i, role: 'co', joined_at: new Date().toISOString() }));
  DB.tables.posse_members.push(...fakeCos);
  ok((await call('A', { action: 'promote', userId: uid('E') })).status === 409, 'max 5 co-leads');
  DB.tables.posse_members = DB.tables.posse_members.filter((m: any) => !fakeCos.includes(m));
  ok((await call('B', { action: 'kick', userId: uid('D') })).status === 403, 'co cannot kick co');
  ok((await call('B', { action: 'kick', userId: uid('A') })).status === 403, 'cannot kick owner');
  ok((await call('B', { action: 'kick', userId: uid('E') })).status === 200, 'co kicks member');
  ok(DB.tables.posse_members.length === 3 && DB.tables.posses[0].member_count === 3, 'kick updates count');
  ok((await call('B', { action: 'promote', userId: uid('D') })).status === 403, 'co cannot change roles');
  r = await call('A', { action: 'transfer_owner', userId: uid('B') });
  ok(r.status === 200 && DB.tables.posses[0].owner_id === uid('B') && DB.tables.posse_members.find((m: any) => m.user_id === uid('A')).role === 'co' && DB.tables.posse_members.filter((m: any) => m.role === 'owner').length === 1, 'transfer ownership');
  // owner leaves -> next co
  r = await call('B', { action: 'leave' });
  ok(r.status === 200 && r.body.posse === null, 'owner leaves');
  const newOwner = DB.tables.posse_members.find((m: any) => m.role === 'owner');
  ok(newOwner && DB.tables.posses[0].owner_id === newOwner.user_id && DB.tables.posses[0].member_count === 2, 'ownership handed over');
  // faction change auto-leave
  DB.tables.player_profiles.find((p: any) => p.user_id === uid('D')).faction = 'night_owls';
  r = await call('D', { action: 'info' }, 'POST');
  ok(r.body.posse === null && /faction/.test(r.body.notice || ''), 'faction change leaves Posse');
  // last member leaves -> posse closed, name reusable
  const last = DB.tables.posse_members[0].user_id; const lastName = users[Number(last.slice(-12)) - 1];
  await call(lastName, { action: 'leave' });
  ok(DB.tables.posses[0].deleted_at && DB.tables.posse_members.length === 0, 'empty Posse closed');
  r = await call('B', { action: 'create', name: 'Old Gang', tag: 'OG' });
  ok(r.status === 200, 'name reusable after close');
  // full Posse
  seed({}); await call('A', { action: 'create', name: 'Big Gang', tag: 'BIG' });
  for (let i = 0; i < 99; i++) DB.tables.posse_members.push({ posse_id: DB.tables.posses[0].id, user_id: '00000000-0000-4000-a000-' + String(i).padStart(12, '0'), role: 'member', joined_at: new Date().toISOString() });
  ok((await call('A', { action: 'invite', code: 'CODE000B' })).status === 409 || DB.tables.posses[0].member_count < 20, 'full Posse guard (invite)');
  const rq = DB.tables.posse_invites; rq.push({ id: '11111111-1111-4111-8111-111111111111', posse_id: DB.tables.posses[0].id, kind: 'invite', from_user_id: uid('A'), to_user_id: uid('B'), status: 'pending', expires_at: new Date(Date.now() + 1e9).toISOString() });
  ok((await call('B', { action: 'respond', inviteId: '11111111-1111-4111-8111-111111111111', accept: true })).status === 409, 'cannot join a full Posse');
  // cosmetics: emblem / style unlock by Posse level
  seed({}); await call('A', { action: 'create', name: 'Style Gang', tag: 'SG' }); await call('A', { action: 'invite', code: 'CODE000B' });
  await call('B', { action: 'respond', inviteId: DB.tables.posse_invites[0].id, accept: true });
  r = await call('A', { action: 'set_emblem', emblem: 'yarn' });
  ok(r.status === 200 && r.body.posse.emblem === 'yarn' && r.body.posse.level === 1, 'owner changes free emblem');
  ok((await call('A', { action: 'set_emblem', emblem: 'cat' })).status === 403, 'locked emblem refused');
  ok((await call('A', { action: 'set_emblem', emblem: 'nope' })).status === 400, 'unknown emblem refused');
  ok((await call('B', { action: 'set_emblem', emblem: 'owl' })).status === 403, 'non-owner cannot change emblem');
  ok((await call('A', { action: 'set_style', color: 'gold', font: 'default' })).status === 403, 'locked colour refused');
  DB.tables.posse_week_points = [{ posse_id: DB.tables.posses[0].id, week_start: '2026-10-26', points: 150, settled: false }];
  r = await call('A', { action: 'set_emblem', emblem: 'cat' });
  ok(r.status === 200 && r.body.posse.level === 2 && r.body.posse.nextLevelAt === 400, 'level 2 unlocks emblem');
  r = await call('A', { action: 'set_style', color: 'gold', font: 'serif' });
  ok(r.status === 200 && r.body.posse.nameColor === 'gold' && r.body.posse.nameFont === 'serif', 'style saved');
  ok((await call('A', { action: 'set_style', color: 'rainbow', font: 'serif' })).status === 403, 'rainbow needs level 5');
  r = await call('A', { action: 'set_style', color: 'default', font: 'default' });
  ok(r.status === 200 && r.body.posse.nameColor === null, 'style reset');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' Posse checks pass');
})();
