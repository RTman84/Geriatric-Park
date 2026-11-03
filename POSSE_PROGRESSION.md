# Posse progression: points, missions, competitions, reward tracks (design v1, 2026-11-01, account B)
Status: DESIGN for owner approval. Built already: Posse levels (from lifetime points), emblem/name-colour/font unlocks. NOT built: points counting, missions, competitions, tracks. Numbers are starting points to tune with real data. Every reward obeys the standing rules: Tickets / Materials / TV Dinners / XP / cosmetics only; never PP or passive income; every faucet has a daily or weekly cap and an `ECONOMY.md` entry.

## 0. No Posse currency (agreed)
Posse rewards are paid in the existing currencies (TV Dinners mainly, plus Tickets and Materials) and in cosmetics. Fewer currencies to balance, nothing new to explain, no new solvency/legal surface. Cosmetics are the long-term prize: emblems, name colours, fonts (all fixed choices, so no moderation burden), banner frames, member titles and profile frames, Quick Chat sticker packs.

## 1. Posse Points (the one progress number)
Counted SERVER-side, inside the routes that already resolve the action (`api/arena.ts`, `api/mail.ts` Friend Battle, `api/court.ts`, raid hits), never from client-reported numbers. Written to `posse_members.week_points`, `posse_week_points` (Posse total, per week; also feeds Posse level) and capped by `posse_daily`.
| Action | Points | Notes |
|---|---|---|
| Raid hit | 3 | +2 more if the boss is defeated that raid |
| Arena attack won | 2 | per defender beaten, within existing Arena daily caps |
| Arena dues claimed | 1 | once a day |
| Friend / Court / PvP win | 1 | within existing PvP caps |
| Mission completed (your share met) | 5 | once per mission |
Per-member cap: **30 points/day**, so alts and spam cannot inflate a Posse. Points only count while you are a member and in the Posse's faction.

## 2. Posse Missions (weekly, shared)
3 missions per week (Mon-Sun UTC), chosen deterministically from a pool, same for every Posse. Goal scales with roster: `goal = active members x per-member target`. A mission pays when the Posse total reaches the goal; a member only collects if their own contribution is at least 10 points (stops pure freeloading). Examples (pool of about 12):
- Raid Party: land N raid hits (per member 4)
- Hold the Line: win N Arena fights (per member 3)
- Friendly Rivals: win N PvP battles (per member 5)
- Show Up: N members earn 10+ points this week (half the roster)
- Boss Down: the Posse defeats N raid bosses (per 10 members, 1)
Reward per member per completed mission (Mailbox, auto): 10 TV Dinners + 20 Tickets (mission 3 adds 5 Materials), cap 3 missions/week = at most 30 TV Dinners + 60 Tickets + 5 Materials weekly. Completing all 3 also grants a Posse chest bonus: +25 Posse level points (fast-tracks Posse level, counted like points but not by actions).

## 3. Reward tracks
**Posse track (shared, Posse level 1-10, from lifetime points):** levels 1-6 already exist (0 / 100 / 400 / 1,000 / 2,500 / 6,000 points). Extend: L7 12,000, L8 22,000, L9 40,000, L10 70,000. Unlocks, no stat or economy power: emblems (29 now, more later), name colours (8), fonts (6), banner frames (L3, L6, L9), mission slot cosmetics, Quick Chat sticker packs, a Posse trophy shelf on the Posse screen. Leader (owner) chooses what is displayed.
**Individual track ("Posse Standing", per player, per 4-week season, 12 ranks):** from your own points. Every rank pays a small reward (Tickets, TV Dinners, Materials), ranks 4/8/12 give cosmetics (a member title such as Posse Regular / Veteran / Pillar, a profile frame). Season rollover keeps titles and frames, resets rank. Approximate total free payout per season: 600 Tickets + 150 TV Dinners + 40 Materials (small next to the Elder Pass, by design). Leaving a Posse keeps earned cosmetics but pauses points until you join another.

## 4. Competitions
**Weekly Posse Race:** every Posse's weekly total points divided by active members (points per member, so small and large Posses compete fairly), in three size brackets (1-25, 26-60, 61-100 members) and per faction plus overall. Top 3 per bracket: members who earned at least 30 points that week get 40 / 25 / 15 TV Dinners and 10 / 6 / 4 Materials by Mailbox; the Posse wears a Winner banner on its screen for the next week; first-place Posses add +50 Posse level points.
**Posse Cup (4-week season):** cumulative race, same brackets. Winners get permanent member titles (`posse:cup:<season>:<place>`, server-verified like the Court honors) and a limited seasonal banner frame and emblem, only obtainable by winning.
**Faction War (weekly):** sum of Posse points per faction; the winning faction's members get a small one-time Ticket gift and a "Faction Champion" title for the week. Doubles as the reason to recruit within your faction.
Settlement is lazy and idempotent, exactly like the Boards weekly settlement (`board_settlements` pattern): the first request after the week closes settles it; tables `posse_week_points.settled`, new `posse_rewards_paid`.

## 5. What we take from Raid: Shadow Legends (and leave out)
Take: a shared weekly boss/goal everyone contributes to, visible contribution lists, clan tiers that unlock perks, seasonal clan competitions. Leave out: clan shop with its own currency, real-time clan chat, mandatory daily clan boss attendance, donation pressure. Ours stays asynchronous, optional and capped.

## 6. Build order (each a small pushed step)
1. **Points counting** (arena, raid, PvP, court) + `posse_daily` caps + level from points (level already computed) + ECONOMY.md section. Needs migration 033 (`posse_rewards_paid`, `posse_missions`).
2. **Missions**: weekly mission pool, progress bars on the Posse screen, auto Mailbox rewards.
3. **Individual track** + member titles/frames (cosmetic art needed, GP app 2).
4. **Weekly Race + Cup + Faction War** with settlement and the Posse leaderboard screen.
5. Quick Chat for friends and Posse (fixed phrases and stickers).
6. Banner frames, trophy shelf and the real Posse emblem art replacing the emoji (GP app 2, W7.7).

## 7. Questions for the owner
P1 Points table and the 30/day cap OK? P2 Mission rewards (10 TV Dinners + 20 Tickets each, 3 a week) too low / too high? P3 Race brackets by size (1-25 / 26-60 / 61-100) OK? P4 Cup length 4 weeks? P5 Should the leader or co-leads pick which of the 3 weekly missions are "featured", or is a fixed deterministic set better? P6 Faction War: keep, or drop to keep Posses the only competition?
