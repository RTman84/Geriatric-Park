# Geriatric Park — Arenas (gyms, factions, raids) — design v1 (2026-09-21)

> **Status:** Phase A (Arena core) AND Phase B (Raids) are BUILT and server-tested (see ECONOMY.md §6l). Not yet done: a raid countdown badge on the map marker itself.
>
> **Status (superseded detail):** Phase A (Arena core) is BUILT (migration `008_arenas.sql`, `api/arena.ts`, `components/ArenaPanel.tsx`, map markers, Mailbox notices, tutorial card). Phase B (Raids) and C (Cards/bids) are not started. Differences from the plan below: Dues pay Tickets/Materials only (no Elder XP yet) and are collected once per day by Mailbox; recalling an Elder does not pay Dues; no proximity check (you only see Arenas in the map cells around you). Rules and numbers live in `api/arena.ts`.

Goal: a Pokémon-GO-style gym system that fits our existing rules. Players join one of three factions, capture shared map Arenas, stack defenders to hold them, and everyone can join scheduled community Raids. **Arenas never pay PP and never raise passive income** (standing rules). Rewards are Tickets, Building Materials, Elder XP, and later Arena Cards / Upgrade Parts.

## 0. Do we need a new (paid) server? No.
We already run a backend: **Supabase (database) + Vercel routes** (`api/mail.ts`, `api/friends.ts`, `api/tournament-board.ts`). Arenas are just more tables and one more route on the same stack. Nothing needs a live connection: every mechanic below is **asynchronous** (attack whenever, raids have a time window, rewards arrive by Mailbox), so no game-server or websockets.
Watch-outs (verify before launch): Supabase free tier limits (500 MB database, pauses after a week of inactivity); Vercel's free "Hobby" plan is meant for non-commercial use, so an ad-funded app will likely need the paid plan at launch regardless of Arenas; and the `/api/tournament-board` 504s are still unconfirmed fixed, so confirm the backend is healthy before building on it.

## 1. Factions
Pick one at your first Arena visit; stored on `player_profiles`. Can switch once per 30 days (stops faction-hopping). Defaults (rename freely):
- 🌅 **Early Birds** (amber) · 🦉 **Night Owls** (indigo) · 🚗 **Sunday Drivers** (teal)
Only the faction that does **not** hold an Arena can attack it. Your own faction's Arena is where you station defenders.

## 2. Arena placement (shared for everyone)
Same seeded-grid method as the map buildings (`services/worldMap.ts`): each ~2 km cell has a 40% chance (`ARENA_CELL_CHANCE`, tunable before launch) of exactly one Arena at a fixed spot, id `a_<cx>_<cy>`. Deterministic, so all players see the same Arenas with no server lookup; the server only stores *state* (who holds it). Arenas are separate from the 3 normal buildings per cell.

## 3. Core loop
- **Neutral Arena:** anyone can claim it by stationing one Elder.
- **Held Arena:** same-faction players station more defenders, up to **6 slots** (one Elder per player per Arena). That stack **is the team-up**.
- **Stationing** locks that Elder out of your Squad and out of Scrap until recalled or knocked out (real cost, prevents double use). A player can hold defenders in at most **3 Arenas**.
- **Attacking** (opposing faction only): your **synced Squad Power** (already stored server-side in `player_profiles.squad_power`, same value Friend Battle uses) fights defenders in placement order. Each fight: attacker power × 0.85^(defenders already fought this attack) × random 0.85–1.15 vs the defender's stored power. First loss ends the attack; each defender beaten is **knocked out and returned home** (owner gets a Mailbox note). Several attackers from one faction can whittle a full stack down over minutes.
- **Flip:** when the last defender falls the Arena becomes neutral. The clearer's faction gets a 5-minute priority to claim it; after that anyone can. New holders get a 10-minute shield.
- Free attacks: **5/day**, then Tickets with a rising price (reuse the `STRUCTURE_PRICING` pattern: base 10, growth 1.4, cap 20/day).

## 4. Rewards (all via Mailbox; all need a cap per `ECONOMY.md`)
- **Arena Dues** (holders): per stationed Elder, up to 12 hours counted per day: 1 Ticket/hour, 1 Material per 6 h, and 10 Elder XP/hour. Max per Elder/day ≈ 12 Tickets + 2 Materials + 120 XP. Claimed once a day or on recall.
- **Attacker:** 8–15 Tickets + 1 Material per defender beaten, first 10 wins/day; Elder XP as in Court.
- **Knocked-out owner:** 5 Tickets consolation by mail.
- Faction/individual "Arena Cards", extra Arena attempts and bids (earlier decision) come from rare items and Raid drops in a later phase.

## 5. Raids (scheduled, cooperative, asynchronous)
- **Schedule (deterministic, no cron):** 3 daily windows, each 90 minutes, at 15:00, 19:00 and 00:00 UTC (11am / 3pm / 8pm Eastern). For each Arena and window, a seeded roll (`RAID_CHANCE` ≈ 12%) decides if it hosts a Raid, so roughly 1–2 Raids a day among the ~4 Arenas near a player. The marker shows a **countdown** up to an hour ahead, then the boss and remaining time.
- **Boss:** picked by the same seeded roll from a roster of 6, 2 per theme so the joke doesn't wear
  thin, two bosses per tier so a given tier still has variety (`RAID_BOSSES` in constants.tsx once
  built). Boss HP is a pool sized so about 5–8 players are needed; HP scales up with tier, not with
  the roster slot within a tier.

  **Tier 1 — Bureaucracy & Authority**
  1. 🏘️ **The HOA President** — cites you for a garden gnome "in violation of Article 12, Subsection
     C." Flavor mechanic: a chunk of the boss's health bar is labeled "Pending Appeal" and regenerates
     slightly between hits unless enough players pile on in the same window — bureaucracy stalls you
     if you don't show up in force.
  2. 🪪 **The DMV Clerk** — "Now serving number 47" when you're number 112. Flavor mechanic: absurdly
     high HP for its tier but does essentially nothing back — the "damage" is entirely how long the
     fight drags on, not danger.

  **Tier 2 — Everyday Retirement-Life Menaces**
  3. 🛺 **The Golf-Cart Marshal** — patrols the walking paths at a blistering 12 mph, writes tickets
     for wearing socks with sandals. Flavor mechanic: periodically "revs up," briefly boosting the
     shared damage needed that window (represents dodging the cart).
  4. 🍽️ **The Early-Bird Buffet Line** — arrives at the dining hall at 3:45 for the 4:00 special and
     will not be moved. Flavor mechanic: a horde rather than one boss — visually many small icons
     whose combined HP bar is the "line," so it feels like wearing down a crowd, not one enemy.

  **Tier 3 — Exaggerated Aging Hazards (played for laughs, kept light)**
  5. 🦵 **Charley Horse** — a leg cramp that "strikes without warning" mid-shuffleboard swing. Flavor
     mechanic: random "surprise attack" bursts add a one-time spike to the required damage window,
     rewarding players who keep checking back rather than hitting once and forgetting about it.
  6. 🧃 **The Prune Juice Reckoning** — "hits like nature intended." Flavor mechanic: every participant
     gets exactly 2 attempts and a cheeky note that a 3rd "isn't happening" — reinforces the existing
     2-attempts-per-Raid rule with a joke instead of just a number.
- **Fight:** 2 attempts per Raid per player (second costs Tickets). Each hit adds your Squad Power × 0.8–1.2 to the shared damage total. **All factions cooperate against the boss.**
- **Result:** the first request after the window closes settles it (no scheduler needed). Everyone who hit gets a participation reward by mail; if the boss fell, a bonus (Materials / Upgrade Parts, later an Arena Card).

## 6. Anti-abuse
Server resolves every fight from **server-held values** (synced squad power, stored defender snapshots), never from numbers the browser sends. Faction switch lock, 3-Arena limit, 1 defender per player per Arena, per-arena attack cooldown (10 min per player), daily caps on every reward, dues claimable once/day, mail entries capped/merged like Friend Battle. Note: Squad Power is client-synced today, same trust level as Friend Battle; hardened by the Bundle F server ledger.

## 7. Data model (migration `008_arenas.sql`)
- `player_profiles`: add `faction text`, `faction_changed_at timestamptz`.
- `arena_state(arena_id pk, faction, claimed_at, priority_faction, priority_until, shield_until)` — created lazily on first interaction.
- `arena_defenders(id, arena_id, user_id, faction, elder jsonb, power int, placed_at, dues_from timestamptz, unique(arena_id,user_id))`.
- `arena_player_daily(user_id, day, attacks int, wins int, raid_attempts int)`.
- `arena_raids(raid_id pk = arenaId_day_slot, tier, max_hp, damage_total, settled bool)` and `arena_raid_hits(raid_id, user_id, damage, attempts, unique(raid_id,user_id))`.
- RLS on, no direct browser access (same pattern as `mail_inbox`): everything goes through the API with the service role.

## 8. API (`api/arena.ts`, edge runtime, self-contained like `api/mail.ts`)
`GET ?ids=a_1_2,a_1_3` (state of nearby Arenas + active/upcoming raid) · `POST faction` · `station` · `recall` · `attack` · `claim_dues` · `raid_hit`. The Arena existence/raid schedule hash is duplicated inline in the route (shared imports are not bundled on Vercel here — learned the hard way).

## 9. Client work
`services/arenaService.ts`; `components/ArenaPanel.tsx` (holder, 6 defender slots, Attack, Station/Recall, dues, raid countdown/join); faction picker (first visit + Settings); Arena markers on `GameMap` (faction-colored ring, raid badge with countdown); Mailbox message types (knocked out, dues, raid result); Tutorial card (hook already exists); poll nearby Arenas when the map cell changes and about every 60–90 s while the Map tab is open.

## 10. Art needed (present prompts, get OK, user generates in Leonardo)
Match the existing amenity diorama style: glossy cartoon mobile-game diorama on a round stone-and-grass base, wooden name sign, warm cozy retirement-community details, white background, no text except the sign.
1. **Arena building**: "Community Clubhouse Arena" — a cozy brick clubhouse with a bocce/shuffleboard ring in front, three empty flagpoles on the roof (faction banners get overlaid in-game), sign reads "ARENA".
2. **Faction emblems (3, flat badge icons)**: sunrise rooster (Early Birds), owl with reading glasses (Night Owls), classic sedan with a tiny flag (Sunday Drivers); each on a round shield in amber / indigo / teal.
3. **Raid boss portraits (6, one per boss above)** — same diorama base/sign style as the amenities,
   but each boss gets a comic "action pose" instead of standing still, since they're meant to be funny:
   - HOA President: clipboard raised, red pen mid-circle, one eyebrow arched
   - DMV Clerk: sliding a "take a number" ticket dispenser forward with a completely blank expression
   - Golf-Cart Marshal: leaning forward over the wheel, sunglasses, a tiny dust cloud behind the cart
   - Early-Bird Buffet Line: a cluster of trays/plates stacked precariously, steam rising, "RESERVED"
     placards scattered around
   - Charley Horse: a leg mid-cramp with comic-book style motion lines/stars, wincing
   - Prune Juice Reckoning: a giant novelty prune-juice carton/jug with a mischievous grin
   Later still: an Arena Card frame (Phase C).

## 11. Build phases
- **Phase A — Arena core:** migration 008 (Arenas + factions), `api/arena.ts`, faction picker, markers, ArenaPanel (station/attack/recall/dues), mail messages. Needs art #1 and #2 (placeholder emoji until then).
- **Phase B — Raids:** schedule, boss, pooled damage, settlement + rewards, countdown UI.
- **Phase C — Arena Cards / bids / rare-item perks** (after item rarity exists).
- Add every Ticket/Materials/XP faucet above to the `ECONOMY.md` §6 source/sink table when built.

## 12. Defaults chosen (change any before Phase A)
Faction names, 3 factions, 6 slots, 3 Arenas per player, 40% Arena density, 5 free attacks/day, raid windows (15:00/19:00/00:00 UTC), 2 raid attempts, dues numbers in §4.
