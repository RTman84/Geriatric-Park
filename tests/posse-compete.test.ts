import handler from '../api/posse';
const DB = (globalThis as any).__DB;
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
const FIXED = Date.parse('2026-12-09T12:00:00Z'); // Wednesday; current week starts 2026-12-07
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a: any[]) { if (a.length === 0) super(FIXED); else super(...(a as [any])); } static now() { return FIXED; } }
(globalThis as any).Date = FakeDate;
const uid = (n: number) => '00000000-0000-4000-9000-' + String(n).padStart(12, '0');
const pid = (n: number) => '00000000-0000-4000-d000-' + String(n).padStart(12, '0');
let fails = 0, n = 0; const ok = (c: any, m: string) => { n++; if (!c) { fails++; console.log('FAIL:', m); } };
async function call(who: string, body: any) { const r = await handler(new Request('http://x/api/posse', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + who }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() as any }; }
(async () => {
  const W = '2026-11-23', W3 = '2026-11-02', W2 = '2026-11-09', W1 = '2026-11-16';
  DB.tokens = {}; DB.chatSeq = 0;
  DB.tables = { player_profiles: [], posses: [], posse_members: [], posse_invites: [], mail_inbox: [], posse_week_points: [], posse_member_weeks: [], posse_race_scores: [], posse_settlements: [], posse_results: [], posse_standing_paid: [], posse_week_stats: [], posse_featured: [], posse_mission_votes: [], posse_mission_paid: [] };
  // Posses 1-3 in bracket 0 (<=5 members): scores differ. Posse 4 (8 members) is alone and merges to the last bracket. Posse 5 belongs to another faction.
  const defs = [
    { n: 1, count: 3, f: 'early_birds', pts: [40, 40, 10], total: 90 },   // active 3 -> 30
    { n: 2, count: 4, f: 'early_birds', pts: [60, 35, 5, 5], total: 105 }, // active 2 -> 52.5
    { n: 3, count: 5, f: 'night_owls', pts: [32, 31, 30, 20, 10], total: 123 }, // active 5 -> 24.6
    { n: 4, count: 8, f: 'early_birds', pts: [50, 50, 12, 12, 12, 12, 12, 12], total: 172 },
  ];
  let u = 1;
  for (const d of defs) {
    DB.tables.posses.push({ id: pid(d.n), name: 'Posse' + d.n, name_key: 'posse' + d.n, tag: 'P' + d.n, faction: d.f, emblem: 'sunrise', owner_id: uid(u), member_count: d.count, deleted_at: null });
    DB.tables.posse_week_points.push({ posse_id: pid(d.n), week_start: W, points: d.total });
    d.pts.forEach((p, i) => { DB.tokens['t' + u] = uid(u); DB.tables.player_profiles.push({ user_id: uid(u), display_name: 'U' + u, faction: d.f, level: 5, squad_power: 1, friend_code: 'C' + u }); (i % 2 ? DB.tables.posse_member_weeks : DB.tables.posse_members).push(i % 2 ? { user_id: uid(u), week_start: W, posse_id: pid(d.n), points: p } : { posse_id: pid(d.n), user_id: uid(u), role: i === 0 ? 'owner' : 'member', joined_at: '2026-11-01', week_start: W, week_points: p }); u++; });
  }
  // members whose rows are archived above (odd index) still need membership rows to be able to call the API: not needed for these tests.
  // Earlier cup weeks: scores for Posse 1-3 so the cup can be ranked.
  for (const [w, s1, s2, s3] of [[W3, 20, 40, 10], [W2, 25, 45, 15], [W1, 30, 50, 20]] as any[]) { [[1, s1], [2, s2], [3, s3]].forEach(([p, s]: any) => DB.tables.posse_race_scores.push({ posse_id: pid(p), week_start: w, points: s * 3, active: 3, score: s })); }
  // caller: member of Posse 1 (user 1, first row is a live member row)
  let r = await call('t1', { action: 'compete' });
  ok(r.status === 200 && r.body.bracket === '1-5 members', 'compete works and shows my bracket');
  const rr = DB.tables.posse_results.filter((x: any) => x.kind === 'race' && x.period === W);
  ok(DB.tables.posse_settlements.length === 3, 'three finished weeks settled once');
  ok(rr.filter((x: any) => x.bracket === 5).length === 1 && rr.filter((x: any) => x.posse_id === pid(4) && x.place === 1).length === 1, 'lone big Posse merged into the last bracket and wins it');
  const early = DB.tables.posse_race_scores.filter((x: any) => x.week_start === W);
  ok(early.find((x: any) => x.posse_id === pid(2)).score === 52.5 && early.find((x: any) => x.posse_id === pid(1)).score === 30, 'score = points per active member');
  // posses 1, 2, 3 (+4) all qualify: 4 posses end up in groups: bracket 0 has 3 posses -> own group; posse 4 alone -> last group
  ok(rr.filter((x: any) => x.bracket === 0).sort((a: any, b: any) => a.place - b.place).map((x: any) => x.posse_id).join() === [pid(2), pid(1), pid(3)].join(), 'bracket 0 ranked by score (Posse2, Posse1, Posse3)');
  const raceMails = DB.tables.mail_inbox.filter((m: any) => m.note.startsWith('race:'));
  ok(raceMails.length === 9, 'race rewards: only members with 30+ points are paid (2 + 2 + 3 + 2)');
  const p2Mail = raceMails.filter((m: any) => m.note.startsWith('race:1:'));
  ok(p2Mail.length >= 1 && p2Mail.every((m: any) => m.reward_diners === 40 && m.reward_materials === 10), 'first place pays 40 TV Dinners + 10 Materials');
  ok(DB.tables.posse_week_points.find((x: any) => x.posse_id === pid(2) && x.week_start === W).points === 105 + 50, 'winner gets +50 Posse points');
  const fac = DB.tables.posse_results.find((x: any) => x.kind === 'faction' && x.period === W);
  ok(fac && fac.note === 'early_birds', 'faction war: Early Birds win (90+105+172 vs 123)');
  ok(DB.tables.mail_inbox.filter((m: any) => m.note.startsWith('faction:')).every((m: any) => m.reward_tickets === 50), 'faction champions get 50 Tickets');
  const cup = DB.tables.posse_results.filter((x: any) => x.kind === 'cup');
  ok(cup.length >= 3 && cup.every((x: any) => x.period === 's0'), 'cup settled for season 1 on its last week');
  ok(DB.tables.mail_inbox.some((m: any) => m.note.startsWith('cup:1:')), 'cup winners mailed');
  // idempotent
  const before = DB.tables.mail_inbox.length;
  await call('t1', { action: 'compete' });
  ok(DB.tables.mail_inbox.length === before && DB.tables.posse_settlements.length === 3, 'settlement and payouts are not repeated');
  // standing: user 1 has 40 live points this week; archived history
  DB.tables.posse_member_weeks.push({ user_id: uid(1), week_start: '2026-11-30', posse_id: pid(1), points: 100 }, { user_id: uid(1), week_start: '2026-11-23', posse_id: pid(1), points: 30 });
  r = await call('t1', { action: 'compete' });
  ok(r.body.standing.season === 2 && r.body.standing.points === 100 && r.body.standing.rank === 3, 'standing: 100 season points = rank 3');
  ok(DB.tables.mail_inbox.filter((m: any) => m.note.startsWith('standing:')).length === 3 && DB.tables.mail_inbox.filter((m: any) => m.note.startsWith('standing:')).every((m: any) => m.reward_tickets === 50 && m.reward_diners === 12 && m.reward_materials === 3), 'standing ranks pay 50 Tickets + 12 TV Dinners + 3 Materials each');
  await call('t1', { action: 'compete' });
  ok(DB.tables.mail_inbox.filter((m: any) => m.note.startsWith('standing:')).length === 3, 'standing ranks are paid once');
  console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' compete checks pass');
})();
