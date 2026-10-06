# Geriatric Park — Economy v2 (Bundle B, 2026-09-20)

Read this before changing any reward, cost, rate or XP number.

## 1. The one assumption everything hangs on

`ASSUMED_AD_REVENUE_PER_VIEW_USD = 0.008` (constants.tsx).

- **Not measured.** The AdSense account has no data yet (not connected / no earnings), so this is
  an assumption built from industry benchmarks: US rewarded video is roughly $0.016 gross per view;
  we assume half of that for fill-rate loss, frequency decay and a global mix.
- When real reports exist, change that ONE constant and re-derive the scaled values in section 3.
- Only *rewarded* ad inventory should ever pay PP (AdSense display ads may not reward viewing).

## 2. Where each ad view's money goes (`REVENUE_SPLIT`)

| Share | Per view | Goes to |
|---|---|---|
| 70% player | 0.0056 PP | the viewer's PP balance |
| 20% community | 0.0016 PP | Community Reserve (funds Dividends + passive Cash Out for everyone) |
| 10% developer | 0.0008 | app growth / development (tracked, not a game currency) |

Daily cap: **15 views/day** (`MAX_ADS_PER_DAY`, resets at local midnight).
At the cap a player earns 0.084 PP/day and adds 0.024 PP/day to the pool.
Reaching the **5 PP** redemption minimum takes ~893 views (~60 days at the cap).

## 3. PP-denominated values (all scaled by 0.08 = 0.008 / the old 0.10)

| Item | Before | Now |
|---|---|---|
| PP per ad view (player share) | 0.07 | 0.0056 |
| Redemption minimum | 10.00 | 5.00 |
| Base passive rate (per 30 s tick) | 0.00005 | 0.000004 |
| Park Assets (cost → rate boost/tick) | 0.50 PP / 0.000005 … 50 PP / 0.001 | 0.04 **Pending Yield** / 0.0000004 … 4.00 / 0.00008 (paid with Pending Yield, not PP, since 2026-09-20) |
| Parcel bonus (Common…Legendary) | 0.00001…0.0001 | 0.0000008…0.000008 |
| Reserve "healthy" threshold | 5.00 | 0.40 |
| Dividend base / cooldown | 0.01 / 15 min | 0.0008 / 60 min |
| Starting Community Reserve | 5.00 (free seed) | 0 (player/ad-funded only) |

Existing saves are migrated once (`migrateEconomy`, `economyVersion: 2`): balance, pending yield,
reserve, pension rate, earnings breakdown and parcel bonuses are all multiplied by 0.08.

Other fixes made in the same pass:
- Passive rates are **per 30-second tick**; the UI multiplied by 3600 (per second), overstating
  PP/hour 30×. Now uses `PASSIVE_TICKS_PER_HOUR` (120) and shows 6 decimals.
- Elder comfort was worth ~1e-9 per tick (nothing). `ELDER_COMFORT_RATE` 0.000008 → 0.002: a Common
  Elder adds ~5% of the base rate, Legendary ~25%.
- New saves started with `pensionRate = INITIAL_PENSION_RATE`, and the base rate was added again
  in `calculatePassiveIncome` (double base). Initial `pensionRate` is now 0.
- Battle wins used to add 0.005 to the Community Reserve with no revenue behind it. Removed.

## 3b. What raises the passive rate (Economy v3, 2026-09-20)

Rule: **gameplay never raises passive income.** The passive rate is now ONLY:
`base rate + Park Assets (bought with Pending Yield) x ad boost (2x while active)`.

Things that used to touch it and what they do now:
| Feature | Before | Now |
|---|---|---|
| Shuffleboard King (map Grand Shuffle Court) | permanent x1.5 on the whole rate for one 20-Ticket win, could never be lost | **Court Champion**: 24-hour title; collect a 45-Ticket purse once per reign; win again to renew |
| Parcel Rent (map parcels, 100 Tickets) | +passive bonus per parcel | **+1 roster room per parcel** (max +10); saves are migrated (bonus removed from pensionRate) |
| Elder Comfort | added to passive (was ~1e-9/tick, i.e. nothing) | **Building output**: each active Elder gives comfort points (rarity x evolution x (1 + 4%/level)); +1% output per point, max +50%, for Tickets/Materials producers only |

Stars (Park Score): they never touched passive income; they only raise the Park Dividend bonus
(PP, reserve-capped, and Tickets). Planned rework (needs item rarity first): Stars become "Renown" and
slightly raise rare-drop luck, small enough to matter only late in the game.

Friend Battle longevity pass: win 12-24 Tickets + 2 Materials (was 40-80 + 6), only the first 6 wins
per day pay (bragging rights after that, 25% XP), 5-minute cooldown unchanged.
Tower rewards already grow slower than difficulty (section 5). Auto-Play / Tournament / Challenge
rewards have NOT had a longevity pass yet.

## 4. Solvency guardrails (PP can never exceed real revenue)

1. PP is created only by (a) the ad-view player share and (b) reserve-capped Dividend / Cash Out.
2. **Dividend**: never more than the pool holds, never more than **5%** of it per claim.
3. **Cash Out** (Pending Yield → PP): rate falls with pool health (25% floor), and a single
   Cash Out never takes more than **25%** of the pool.
4. Passive accrual only feeds *Pending Yield*, an uncapped "earning power" number that is not a
   cash liability. It becomes PP only through Cash Out above, or is spent on Park Assets (the only way to raise the passive rate; costs are in Pending Yield, so investing creates no cash liability).
5. Consequence, by design: high passive rates cannot be cashed faster than the community's ads
   refill the pool. A whale-tier investment (Park Directorship ≈ 0.23 yield/day) will convert at
   a reduced rate unless many players are watching ads. Show Reserve Health prominently.

## 4b. The 2x ad boost (`AD_BOOST_MULTIPLIER`, 1 hour per ad, stacks by extending the timer)

Checked 2026-09-20 — it does **not** break solvency, but it is a lever to watch:
- It doubles the passive *accrual* into Pending Yield only. It never creates PP, so the Community
  Reserve caps in section 4 still bound everything that can be paid out.
- Boosted hours per day are bounded by the ad cap (15 ads = at most 15 boosted hours), so daily
  accrual is at most ~1.6x the un-boosted rate for a player who watches every ad.
- A base player (no assets, 6 Elders) accrues about 0.015-0.025 yield/day, roughly the same as the
  ~0.024 PP/day their 15 ads add to the pool, so at the start Cash Out can stay near 1:1.
- Invested players (assets) accrue far more yield than their ads fund; the pool then limits how
  much converts to PP (the Cash Out rate falls). That is the intended slow, honest ceiling.
- Watch: if Reserve Health is often "Thin", lower `AD_BOOST_MULTIPLIER` (e.g. 1.5) or the stacking
  window before touching payouts.
- Known nit: offline catch-up applies the boost only if it is still active when the player returns.

## 4c. Ad networks and platform rules (researched 2026-09-20)

- **AdSense display ads may not reward viewing** (only "rewarded inventory" is exempt).
- **Android / Google Play:** AdMob rewarded ads (supports server-side verification callbacks).
- **Web:** Google Ad Manager rewarded ads for web (GPT), or AdSense H5 Games Ads rewarded format
  (needs allowlisting/application). Server-side verification is app-only, not available on web.
- **Steam: rewarding players for watching ads is not allowed** (Steamworks advertising rules).
  The ad-funded PP model cannot ship on Steam; that build needs purchases/paid-app instead.

Implementation status (2026-09-20): the rewarded-ad path is `services/rewardedAds.ts`. AdSense display
ads are no longer shown behind any reward. Native Android uses AdMob rewarded video (test ids until
the AdMob account is set up); web uses a simulated 5-second sponsor for testing, or `VITE_ADS_MODE=off`.
See ANDROID_SETUP.md.

## 5. XP and levels (slow, but never dead)

- Player level: `xpForPlayerLevel(l) = 1000 × 1.06^(l-1)`, cap `MAX_PLAYER_LEVEL = 100`.
  Cumulative XP to level 10 / 20 / 30 / 50 ≈ 11.5k / 33.8k / 73.6k / 273k.
- Elder level: `xpForElderLevel(l) = 150 × 1.07^(l-1)`, cap `ELDER_MAX_LEVEL = 100`.
  Cumulative XP to level 10 / 25 / 50 ≈ 1.8k / 8.7k / 56.9k (evolutions at 10 and 25 unchanged).
- Golden Games Tower: 50 → **100 tiers**. Power requirement grows 1.10×/tier, but rewards grow
  slower: Tickets 1.04×, Elder XP 1.05×, Stars 1.03× — higher tiers are a challenge, not a faucet.

## 6. Tickets 🎟️ — sources and sinks (inventory; per-day expected values still to be measured)

Sources (grep of `legacyTokens` credits): level-ups (10/level), Elder Pass claims, Tasks/quests,
Park Dividend (5–25 per claim, needs reserve), Scrap Elder (4 × level × rarity: 1/2/4/8),
Golden Games wins (Tower table), Friend Battle wins (40–80) and defender bounty (25, ≤5/day),
Shuffleboard Auto-Play results, Tournament play (+10), Challenge wins (+stake), Bingo prizes.

Sinks: buying a Parcel (100), squad restore (25), minigame entry fees (10–30), Evolution, Shop items,
Challenge stakes.

**Table written 2026-10-06: see section 6m.** Rule: any new Ticket source needs a matching sink or a daily cap.

## 6b. Map-building prices (2026-09-20) — `STRUCTURE_PRICING` in `constants.tsx`
Ticket price is flat for `freeUses` visits per UTC day, then multiplies by `growth` per extra visit; `dailyCap` is a hard stop. Resets at midnight UTC (client-side count in `structureUses`; move server-side with the Bundle F ledger).

| Building | Base | Free uses | Growth | Daily cap | Note |
|---|---|---|---|---|---|
| Farmers Market | 30 | 1 | x1.50 | 8 | permanent +2 squad stat per visit; ladder 30,30,45,68,101,152,228,342 |
| Bingo Blitz | 10 | 0 | x1.35 | 12 | pays +13 Tickets on average at base price (40% x 50, else 5) -> profitable only for the first ~3 plays/day |
| Mall Circuit | 15 | 2 | x1.40 | 10 | 250 XP per visit |
| Potluck Pavilion | 10 | 2 | x1.35 | 10 | +50 Stars per visit |
| Community Garden | 10 | 2 | x1.30 | 12 | 70% chance of an item |
| Silver Springs | 25 | 2 | x1.25 | none | full heal |
| Grand Shuffle Court | 20 | 2 | x1.25 | 15 | |

Buildings are a shared world: `services/worldMap.ts` places them from a seeded grid so every player sees the same buildings at the same spots. Never change `WORLD_SEED` / `WORLD_CELL_DEG` after launch.

## 6c. Elder Challenge: the Rival Ladder (2026-09-21) -- `CHALLENGE_*` in `constants.tsx`
Replaces "stake any amount, winner takes all" (a squad stronger than the rival won every time for +stake, no cooldown, no limit = endless Tickets).
- 100 ranks; rival power `40 x 1.10^rank` (same steepness as the Golden Games Tower), +-10% each duel. Raise `CHALLENGE_MAX_TIERS` to add rungs.
- Rewards grow slower than difficulty: win Tickets `6 x 1.04^rank` (loss costs half), Elder XP `20 x 1.05^rank`, player XP `60 x 1.05^rank`, +8 Stars per paid win.
- Only the first `CHALLENGE_DAILY_PAID_WINS` (5) wins per UTC day pay Tickets/full XP/Stars; after that duels are friendly (25% XP, nothing to lose).
- First win against each rank pays 3x the purse once (rank 1-31 total is about 1,070 Tickets, one time). You can only fight up to one rank above your best win.
- Steady-state faucet: 5 x win purse per day, e.g. ~95 Tickets/day at rank 31, ~315/day at rank 61 (power ~12,000).
- Progress and the daily counter live in `challengeLadder` (client-side; move server-side with the Bundle F ledger).

## 6d. Park Assets are itemised (2026-09-21)
`parkAssets` = `{ itemId: count }`, shown in Bank ("Your Park Assets", with per-item PP/hr) and on the Park tab. Purchases made before this update are not itemised; Bank shows their combined rate as "Earlier purchases".

## 6f. Arenas, Phase A (2026-09-21) -- rules live in `api/arena.ts`, display copies in `constants.tsx`
Never PP, never passive. All rewards are Tickets + Building Materials (+ Elder/account XP for attackers), all capped:
| Source | Amount | Cap |
|---|---|---|
| Attacker: beaten defender | 8-15 Tickets + 1 Material each | first 10 beaten defenders per UTC day; XP 25 per rewarded win (+6 on a loss) |
| Arena Dues (holders) | 1 Ticket/hour + 1 Material per 6 h, per stationed Elder, up to 12 h each | one collection per UTC day (by Mailbox); at most 3 Elders stationed, so <= 36 Tickets + 6 Materials/day |
| Knocked-out owner consolation | 5 Tickets by Mailbox | max 20 per attacker per day |
| Sink: attacks | 5 free/day, then 10 x 1.4^n Tickets | hard cap 20 attacks/day; 10-minute cooldown per Arena |
Elder XP for Dues is not built yet (Dues pay Tickets/Materials only). Squad Power and Elder power are client-synced, the same trust level as Friend Battle, until the Bundle F ledger.

## 6e. Court longevity caps (2026-09-21) -- same pattern as the Challenge ladder
Found by audit: three Court modes could be farmed all day. Fixed with a daily paid-match cap (UTC day; extra matches are friendly: 25% XP, no Tickets/Materials/Stars).
| Mode | Problem | Now |
|---|---|---|
| Golden Games Tower | 20-300 Tickets/win on a 3-minute cooldown (thousands/hour); Materials `(tier+1)*2` per win, unbounded, and Tickets + Materials paid on losses too | Base purses cut to ~25% (bronze 5-10, silver 12-22, gold 25-40, legendary 50-75, still x1.04 per tier), loss consolation 2/3/5/6, Materials `min(12, 2+tier)` per win and 1 per loss. First 5 matches/day pay; first-ever win in a tier pays 3x once. Cooldown unchanged (3 min) |
| Auto-Play | Every 10 min: 5-57 Tickets + 100 XP per win (about 4,000 Tickets and 14,000 XP a day) | Every 30 min, 2-20 Tickets; first 8 collections/day pay |
| Daily Tournament | Unlimited throws, each +10 Tickets/+75 XP, and only the BEST throw counts on the board, so the most throws won | 5 throws per tournament window (`TOURNAMENT_DAILY_THROWS`); the counter resets with the window |
Progress counters live in `goldenGames.paid`, `autoPlayPaid`, `tournamentThrows` (client-side for now; move server-side with the Bundle F ledger). Leaderboard scores are still submitted by the client, so a modified client could post any score until the ledger exists.

## Watch list (not fixed, verify in testing)
- Scrapping Elders pays `4 x level x rarity` Tickets; check that capture -> scrap cannot be looped faster than intended once wild Elder spawn rates are measured.
- Quest/Task rewards are a fixed list that can be claimed once; the planned Tasks rotation (Bundle D) needs daily caps from the start.

## 6g. Tasks now rotate; Feats are actually checked (Bundle D, 2026-09-21)
Tasks (Quests) were a fixed, hand-written list of 8 that never changed. They are now drawn from pools
(`DAILY_QUEST_POOL` 13 entries / `WEEKLY_QUEST_POOL` 8 entries in constants.tsx): 5 dailies redraw every UTC
day, 3 weeklies redraw every UTC week (Monday), deterministically per day/week so reloading doesn't reshuffle
mid-day. Matching is now by a `kind` field instead of matching substrings of the title, so new quest text
doesn't risk silently matching the wrong progress event. New kinds added: `market`, `garden`, `mall`,
`potluck`, `arena`, `friend_battle`, `evolve` (each wired to its existing handler).

Feats (Achievements) had 4 entries and nothing ever checked or completed them -- confirmed dead since launch.
They are now evaluated in one effect (`checkAchievements`-equivalent in App.tsx), sticky (never un-complete
once earned), reading only already-existing state plus one new counter (`battleWins`) and one new mirror
field (`faction`, synced from the Arena faction pick for achievement purposes only -- `api/arena.ts` stays the
source of truth for the real faction). 6 new Feats reflect this arc's work: Investor (Park Assets), Rival
Slayer (Challenge ladder rank 10), Tower Climber (Golden Games league 5), Arena Defender, Faction Founder,
Neighborhood Legend (25 battle wins).

Old saves: quests missing the new `kind` field are replaced with a fresh draw of that type (forfeits one
save's in-progress, unclaimed quest progress, once); achievements are merged by id so a completed status
survives and the 6 new entries are added rather than the array being replaced outright.

## 6h. Cloud-save overwrite bug found and fixed (2026-09-22)
A real player's account appeared "reset" on 2026-09-22. Root cause found by tracing the code, not
guessed: the app's 8-second "never trap the player on the loading screen" safety timeout unblocks the
UI (`cloudCheckDone`) WITHOUT waiting for the actual cloud fetch to finish. If that fetch was slow or
hung, the player could see Starter Selection, pick a starter, and 2 seconds later the debounced
autosave effect would push that brand-new, near-empty save to the cloud using `Date.now()` as the
revision number. Since a fresh timestamp is always greater than an old one, the server's monotonic
revision check (`api/account/save.ts`, rejects `clientRevision <= existing`) would ACCEPT the write and
silently overwrite a real, much larger save with a blank one -- no confirmation, no warning, no
recoverable trace on the client side. This is believed to be exactly what happened.

Fix: the two autosave-to-cloud effects (debounced, and flush-on-hide) plus the display-name-change
save trigger now additionally require `cloudSyncSettled` -- a flag that is ONLY set once the real
cloud fetch has actually completed (success or failure), separate from `cloudCheckDone` which the 8s
timeout can set early. Local (localStorage) saves are unaffected and still happen immediately, so nothing
is lost by waiting; once the real cloud fetch does resolve, its own revision check still correctly
prefers real cloud progress over a few seconds of freshly-started local play.

Also fixed the same day: the "Clear Save & Reset" button on the loading screen was unlabeled as
destructive, required no confirmation, and was visible on every single app launch (loading screens are
normally on-screen for under a second, but a curious or accidental tap wiped local progress instantly).
It's now hidden until the loading screen has genuinely been stuck for 12+ seconds, relabeled to say
plainly what it does and that it doesn't touch the cloud save, and requires an explicit confirm.

**Not yet fixed / worth doing next:** the client-chosen `Date.now()` revision scheme is fragile by
design -- it conflates "most recently saved" with "most complete," which is exactly backwards in a
data-loss scenario. The Bundle F server-authoritative ledger should replace this with a real
monotonic counter the SERVER assigns (increment-on-write), not a client-supplied wall-clock value.

## 6i. Arena feedback from first real test (2026-09-22)
Two-account test worked correctly overall (shield timer held, faction colors updated). Two real gaps found:
- **Arena Dues is ONE claim per player per day covering every stationed Elder across every Arena, not
  a separate claim per Arena** -- the panel showed the same "Collect Dues" card in each Arena
  independently with no explanation, so claiming from one Arena and then finding the second Arena's
  claim already used looked like a bug. Copy in `ArenaPanel.tsx` now says this explicitly, and shows
  how many Arenas the combined total covers. A defender stationed only minutes ago also naturally
  contributes ~0 to the total (Dues build up hourly) -- also now called out in the copy.
- **No way to switch factions existed in the UI at all**, even though `api/arena.ts` already supports
  it (30-day lock, must have zero stationed defenders). Added a "Switch faction" control to
  `ArenaPanel.tsx` next to the "You: <faction>" line, showing days remaining if still locked, or a
  faction picker + confirm if eligible.

## 6j. Every Park building now has a real use (2026-09-22)
7 buildings were pure decoration -- built once, leveled for nothing, no functional effect ever. Each
now has a distinct, level-scaling use (still Tickets/Materials/comfort/QoL only, never PP or passive
income, per the standing rule):
| Building | Use |
|---|---|
| Water Aerobics Pool | Heals all Team Elders a % of max HP per hour (passive tick) |
| Bird Watching Post | Now a producer: small Materials/hr (moved category: decoration -> production) |
| Early Bird Line | % off every map-building's Ticket price (`STRUCTURE_PRICING`), applied in one place (`getDiscountedPrice` in App.tsx) so every handler and display gets it automatically |
| Complaint Desk | Small Community Score trickle per hour (passive tick) |
| Nap Pod Row | % output bonus to every OTHER producing building (stacks with Elder Comfort's existing bonus) |
| Prune Juice Bar | Now a producer: small Tickets/hr (moved category: decoration -> production) |
| Shuffleboard Court (decoration) | Flat Tickets added to the Court Champion purse, per level |

`GroundsPanel.tsx` now shows each effect's current value and the next-level preview, so leveling any
of these is no longer invisible. Helper functions live next to `producerStored` in constants.tsx
(`totalProducerBoost`, `totalHpRegenPerTick`, `totalScoreTricklePerTick`, `totalStructureDiscountPct`,
`totalCourtPurseBonus`).

## 6k. Golden Games Tower tier-naming bug found and fixed (2026-09-22)
Generated tiers (beyond the 4 hand-tuned ones) were named with Roman numerals ("Legendary Circuit
II", "III", ...) up to 20, then fell back to a literal `Tier ${step + 1}` string -- but `step` counts
only GENERATED tiers, while the tab number and detail card show the OVERALL tier number. The two
differ by exactly 3 (the hand-tuned tier count), so from tier 24 onward -- more than 3/4 of the
100-tier tower -- the button's own name showed a tier number 3 lower than the rest of the screen for
the same tier (reported: viewing Tier 33, button said "Legendary Circuit Tier 30"). Fixed by always
using the real overall tier number in the name (`Legendary Circuit — Tier ${i + 1}`), so it can never
disagree with the tab or detail card again.

## 6l. Raids, Phase B (2026-09-22/23) -- wired up and tested
Boss data/constants were already scaffolded in `constants.tsx` (6 bosses, 2 per theme, tier 1-3) and
`api/arena.ts` had the pure scheduling/settlement helpers written but never actually called. This pass
wired it end to end and tested the server logic against the in-memory fake-Supabase harness (12
scenarios: active-raid detection, non-arena rejection, attempt cap, two-squad cooperative defeat,
rejecting hits on a settled raid, defeat mail to every participant, damage display capped at max HP,
weak-squad survival path, settle-on-read via a plain GET after the window closes with NO further hits,
survival mail, and rejecting a hit on an upcoming-not-yet-active window). All passed.
- `GET /api/arena` now includes a `raid` block per Arena: null, upcoming (countdown only, no DB row
  needed), or active/settled (boss, HP bar, this player's damage/attempts).
- New `raid_hit` POST action: 2 free attempts, extra attempts cost `RAID_EXTRA_ATTEMPT_COST` (15)
  Tickets each (charged client-side, same pattern as the Arena attack fee), hard-capped at
  `RAID_MAX_ATTEMPTS_PER_PLAYER` (6) so one Ticket-rich player can't solo a boss meant for 5-8 squads.
  Damage = squad power x 0.8-1.2, same trust level as Arena attacks (server-held squad power).
- Settlement happens the instant a hit brings total damage to/above max HP (immediate "defeated" mail
  to every participant), OR opportunistically on ANY subsequent request (a hit or even a plain GET)
  once the window has closed, whichever comes first -- a boss that survives still pays participation
  rewards to whoever hit it, they just don't have to come back and hit it again to collect.
- Client: `ArenaPanel.tsx` shows a countdown card for upcoming raids and a live HP bar / hit button /
  result banner for active or settled ones; `raid_result` Mailbox messages render with the boss's flavor
  text baked into the server-side mail note.
- **Not yet done:** a raid badge/countdown on the Arena map marker itself (currently only visible after
  opening the Arena panel) -- worth adding next session, small.
- **Numbers are a first guess, not playtested:** tier HP pools (4000/12000/30000), participation
  rewards, and the attempt cap all need real Raid data before trusting them.

## 7. Retuning checklist (when real ad data arrives)

1. Set `ASSUMED_AD_REVENUE_PER_VIEW_USD` to the measured net revenue per rewarded view (watch the trend
   over weeks — eCPM decays with frequency and varies by region/season).
2. New scale factor = new value / 0.008. Multiply every row in section 3 by it (or leave the
   costs and change only what the ad pays, keeping payback in "ad views" constant).
3. Ship a save migration (bump `ECONOMY_VERSION`) if stored PP values must change.
4. Update this file.

## Resident Exchange (v2, 2026-10-02) — faucets and caps
- Owner: 15 Elder XP per hour stayed (capped at chosen 8/12/24h), max 3 Elders away at once. Unchanged.
- Host gift (owner picks the type at placement; paid when the Elder returns; scaled by hours stayed, none under 1h):
  Materials = round(h x 0.5) (24h = 12); Quest progress = round(h / 4) on one active Quest the host picks (24h = 6);
  Building output = round(h / 4) extra hours on one working building the host picks, never beyond its 8h storage cap.
- Caps: a host receives at most 6 gifts per UTC day; a host has at most 3 visitors at once; gifts never pay PP or raise passive income.
- Quests: Good Neighbor / Friendly Visitor (send) and Gracious Host / Open House (claim hosted gifts) pay Tickets/XP/Stars only.

## Squad Loan (2026-10-02)
- Owner lends one Elder to an accepted friend for 8/12/24h (uses the same Resident Exchange table, `mode = 'loan'`, migration 012). The owner still earns Elder XP (15/hour stayed). The host gets NO gift: the combat help is the reward.
- Limits: a borrower holds one loaned Elder at a time; the lender's 3-Elders-away cap still applies. A loaned Elder fights in Battles and Court games only. It is never used in Arenas, Raids or Friend Battle (those read the player's own saved squad), takes no permanent damage, and earns the borrower no Elder XP.
- Stats come from a snapshot taken at lending time (client-supplied, clamped by the API, same trust level as synced Squad Power; hardened by the Bundle F ledger).
- Not gated by level yet. If strong players lending to new ones proves unbalanced, add a lower-level-friends-only rule here first.

## Squad Loan and wild scaling follow-up (2026-10-02)
- Only benched Elders can be lent or sent to visit (squad members and Arena defenders stay home).
- A loaned Elder counts in Battle, Court Auto-Play, Daily Tournament, Elder Challenge and Golden Games power. It does NOT count in Court Friend Battle, the Friends-list Battle button, Arenas or Raids.
- Wild Elders are scaled when a battle starts: power = 85-115% of the player's best captured Elder (x0.9 Common, x1.0 Rare, x1.15 Epic), level = best Elder level +/-1. Battle screens show level, rarity and power for both sides.

## Rarity, wild scaling and progression curves (2026-10-02)
- Rarity now improves every Elder stat, HP and level-up growth: Common 1.0, Rare 1.2, Epic 1.45, Legendary 1.8 (`RARITY_STAT_MULTIPLIER`). Existing Elders got a one-time additive bonus (`rarityStatsV1`), so equipped gear and evolution stay intact. Comfort, scrap value and capture odds already scaled by rarity.
- Wild Elders (Common 45%, Rare 30%, Epic 12%, Legendary 3%) are previewed before a fight: level, rarity, power and a risk label. Power = your best captured Elder x rarity tier (0.85/1.0/1.2/1.4) x a 60-150% spread. A guided Elder joins at level <= 10 with the standard stats for its level and rarity, so wide wild power cannot become a Scrap Ticket faucet or an instant power-up.
- Golden Games and the Challenge ladder no longer compound 1.10 per tier (that passed 500,000 power, unreachable). Both follow a shared curve that is near-linear early and bends up late, ending at `PROGRESSION_MAX_POWER` = 24,000 at tier 100 (a max-level, evolved, Epic/Legendary squad is about 20-25k). Tier 10 is about 700-1,100 power, tier 50 about 5,500, tier 75 about 12,000.
- Golden Games league unlocks and entry count only the player's own Elders, never a loaned one. A loaned Elder still helps the win roll.
- NOT yet re-audited against these curves: Raid boss HP and damage caps, Arena power, Daily Tournament scoring, Auto-Play benchmark.

## Gear upgrades scale with rarity (2026-10-03)
- Level cap by rarity: Common 10, Rare 15, Epic 20, Legendary 30 (was 5 for all). `getGearMaxLevel`.
- Levels 1-5 are unchanged for every rarity (+15% of base per level, cost 40/60/90/135 Tickets), so gear already equipped needs no migration (its boost is baked into Elder stats).
- Past level 5: +10% of base per level x rarity (Common 1.0, Rare 1.2, Epic 1.45, Legendary 1.8). Upgrade costs climb 1.12x (Tickets) and 1.10x (Materials) per level, times a rarity factor (Rare 1.15, Epic 1.35, Legendary 1.6).
- Boost on a base-10 item at its cap: Common 21, Rare 36, Epic 64, Legendary 134 (on top of the existing rarity multiplier on the base).
- Total Tickets to max one piece: Common about 1.8k, Rare about 4.9k, Epic about 11.7k, Legendary about 48k and Materials about 130 / 330 / 740 / 2.6k. Costs are the same as before the late-gain tuning; only the boost was lowered (0.15 to 0.10 per level).
- Sell value still scales linearly with level and is a small fraction of what was spent.

## Wild captures, player battles, Golden Games text (2026-10-03, supersedes the capture note above)
- A guided wild Elder now joins exactly as fought: same level, stats and rarity, full HP, with `obtainedAt` set. About 8% of the time it arrives wearing one gear piece (best of two rarity rolls, so it tends to be better). The earlier "level 10 newcomer" rule is removed.
- Because high-level captures are now possible, Scrap counts an Elder's level only up to 25 (`SCRAP_LEVEL_CAP`) so capture-then-scrap cannot be a Ticket faucet. Watch this: raise or lower the cap after real play.
- Player battles: the 5-minute cooldown is now per opponent (attacking one player never makes you wait to attack another), with a soft cap of 30 attacks per UTC day on top of the existing reward caps (first 6 wins per day pay) and the server's 20 battles per pair per day.
- Golden Games cards show "Required X . Recommended Y"; locked cards no longer show the player's own power.

## Resident Exchange targets and visibility (2026-10-03)
- For Quest and Building-output gifts the owner now picks the host's target when leaving the Elder (from the friend's synced active quests or working buildings). The host's Mailbox then offers a one-tap claim on that target; if the target is gone by then (quest done, building missing) the host picks another.
- Both players see a plain-language line under the Resident Exchange list: what the Elder is out for, what each side receives (amounts for a full stay), and the time left on the Recall/visit row.
- Friends' active quests are synced to `player_profiles.active_quests` (migration 013). The server rejects a target that is not on the host's profile.

## Near-power opponents and brackets (2026-10-03)
- Ten power brackets (`POWER_BRACKETS`: Porch Sitters 0, Shuffle Starters 300, Bingo Regulars 700, Court Challengers 1,300, Clubhouse Contenders 2,300, Sunroom Veterans 3,800, Gold Lounge 6,000, Circuit Elite 9,500, Hall of Famers 15,000, Living Legends 21,000). Thresholds follow the same power curve as the Golden Games and Challenge ladder.
- Friends panel "Find Opponents": up to 6 opted-in players (Open to random matching), about 5 within +-25% of your squad power and up to 2 from further away. Refresh has a 60-second cooldown. Each row shows level, power, bracket and Tougher/Even/Easier, with Battle and + Friend buttons.
- Battling an opted-in non-friend uses the same rules as a friend battle (per-opponent 5-minute cooldown, 30 attacks/day, rewards capped) and leaves them the usual Mailbox note. The mail route now accepts a defender who is a friend OR opted in.
- Bracket-based titles/bonuses for the Court Champion and tiers for other modes are NOT built yet (design pending).

## Court Ladders (2026-10-04, replaces the single-throne draft)
- Each of the 10 power brackets has a top-10 Grand Shuffle Court ladder (`court_ladder`, migration 015, route `api/court.ts`). Everyone in a bracket sees their bracket's top 10; the champions (top 3) of every bracket are shown to all.
- Joining: an unranked player takes the next open spot (costs no challenge); a full ladder means fighting the bottom spot. Ranked players challenge up to 3 ranks above them: win swaps places, loss changes nothing. 3 challenges per UTC day. Fights use server-synced squad power: your power x (0.85-1.15) vs theirs x 1.05 x (0.9-1.1).
- Spots are lost after 7 days without opening the Court; ranks compact automatically. Moving to a new bracket (power change) removes you from the old ladder.
- Rewards: a daily Ticket purse for ranks 1-3 only, once per UTC day: 45 x (1 + 0.25 x (bracket - 1)) x (1.0 / 0.6 / 0.4 for rank 1 / 2 / 3). At most 79 / 47 / 32 Tickets in bracket 4, about 146 / 88 / 58 in bracket 10, per day. Never PP, never passive.
- Titles: reaching the top 3 grants a permanent cosmetic title and medal (key `court:<bracket>:<place>`), e.g. "Clubhouse Contenders Champion", "Gold Lounge Runner-Up", "Living Legends Third Place". Picked in the profile picker like other titles; other players see a well-formed court title as chosen (display only).
- Not built yet: tiers/recognition for the other modes, a Mailbox notice when displaced, more badges.

## Mode badges (2026-10-04)
- Lifetime counts per mode (from the same events that drive quests): Park Brawler (battles), Court Regular (Court games, tournament, challenge), Friendly Rival (player battles), Arena Defender (arena fights), Good Neighbor (Resident Exchange sends and claims), Bingo Buff, Park Collector (map items), Evolution Expert.
- Tiers at 10 / 50 / 150 / 400 / 1,000: Bronze, Silver, Gold, Platinum, Legend. Each tier unlocks a medal icon and a title like "Park Brawler Gold". Counts only go up, so badges are permanent. Cosmetic only, no currency.
- You can only pick badges you have earned. Other players do not see mode badges (the server cannot verify the counts), only rank and verified Court titles.

## Milestones (2026-10-05)
- New "Goals" tab in Tasks: one-time progression goals per mode (the mode badge tiers). Each tier pays a one-time reward: 20 / 50 / 120 / 250 / 400 Tickets, plus 0 / 0 / 5 / 10 / 20 Building Materials. Lifetime total per mode: 840 Tickets + 35 Materials (8 modes). Never repeats, never PP. Claim is validated against lifetime counts and a saved list of claimed keys.

## Re-audit against the 24k power curve (2026-10-05)
- Auto-Play: FOUND a gap. The benchmark was a fixed 100 power, so every squad above 150 power sat at the same 150% result forever. It now follows the player's bracket (`autoPlayBenchmark`: midway to the next bracket's floor), so readiness stays meaningful from a new squad (about 110%) to a late-game one (about 90-110%). Ticket payouts are unchanged and flat across brackets.
- Still to check with real play data: Raid boss HP and damage caps (they were tuned against squad power in the low thousands), Arena power fights (use synced squad power, so they scale with the curve), and Daily Tournament scoring (score scales with squad power, board is already ranked by it, so it scales by design).
- Ticket source/sink table (section 6) is still not written.


## 6m. Ticket source/sink table and Raid check (2026-10-06)
Computed from the constants in `constants.tsx` / `api/arena.ts` (not from live play). "Max/day" = the most a player can earn from that source if every daily cap is used.

### Sources (Tickets per player per day, upper bounds)
| Source | Cap | Max/day |
|---|---|---|
| Account level-ups | 10 per level | slow (level curve 1000 x 1.06^(l-1) XP) |
| Auto-Play | 8 paid/day, 2 + up to 12 x readiness each | about 16-160 |
| Challenge ladder | 5 paid wins/day, 6 x 1.04^tier each (tier 1: 6, 26: 16, 51: 43, 76: 114, 100: 291) | 30 -> about 1,450 |
| **Golden Games** | 5 paid matches/day (+3x first clear per tier, once), win range grows 1.04x/tier | tier 1: about 40, tier 26: about 740, tier 51: about 2,000, tier 76: about 5,300, **tier 100: about 13,500** |
| Friend Battle | 6 rewarded wins x 12-24; defender bounty 25 x 5 | about 108 + 125 |
| Arena attacks | first 10 wins/day x 8-15 | about 150 |
| Arena dues | 1/hour, 12h max, up to 3 Arenas | about 36 |
| Raids | 10 per rewarded Raid, 3/day | 30 |
| Court Ladder purses | top 3 per bracket | about 18-146 (bracket 1-10) |
| Court Champion purse | once per 24h reign | 45 |
| Dividend | 5-25 per claim, reserve-gated | small |
| Scrap Elder | 4 x level (capped at 25) x rarity (1/2/4/8) | Legendary lvl 25 = 800 per scrap; limited by captures |
| Map pickups (Lost Dentures) | spawn trickle | 25 each |
| Goals/milestones | one-time | one-time |

### Sinks
Parcel 100; squad restore 25 (x1.25 per use); map-building visits (base 10-30, growth 1.25-1.50, daily caps); Arena attack fee 10 x 1.4^n (cap 20/day); Raid extra attempt 15; Evolution stage 2 = 1,000; gear upgrades (Tickets + Materials, scale with rarity); Challenge stakes; Shop items.

### Findings
1. **Late-game Ticket inflation.** Golden Games rewards grow 1.04x per tier while the biggest recurring sinks do not: by tier 50 the daily faucet is about 2,000 and at tier 100 about 13,500 Tickets/day, against sinks measured in tens to hundreds (Evolution is a one-time 1,000). Challenge pays about one tenth of Golden Games at the same tier. Options for the owner to pick: (a) lower the Golden Games growth (1.04 -> about 1.02) or its tier-100 base; (b) add real late-game Ticket sinks (gear upgrade costs, Elder re-rolls, cosmetic crafting); (c) make the Mementos shop and PvP shop the main sinks. Not changed yet: it needs a design decision.
2. **Scrap faucet** is bounded by the level cap of 25 and by capture odds, but a Legendary at level 25 is worth 800 Tickets, about 8 Parcels. Fine while Legendaries are 3% of spawns; recheck if drop rates rise.
3. Auto-Play, Friend Battle, Arena and Raids are small and capped; no change needed.

### Raid check against the 24k curve
Boss HP: base 3,000 / 6,000 / 10,000 (tiers 1-3) x boss multiplier (0.75-1.6) x flux (0.85-1.30). A hit = squad power x 0.8-1.2, capped at 50% / 20% / 8% of max HP per hit (tiers 1-3), max 10 attempts per player.
- Tier 1 (HP about 2,500-9,400): any squad above roughly 2,000-4,000 power does the 50% cap, so 2 hits kill it. A late squad (24k) gains nothing extra.
- Tier 2: the 20% cap means 5 hits solo; squads above about 1,200-2,500 are capped.
- Tier 3: the 8% cap means about 12.5 hits solo, more than the 10-attempt limit, so at least 2 players are needed. Squads above about 800-1,000 are already capped.
- Result: past roughly 1,000-3,000 squad power, power no longer matters in Raids. What matters is the number of players who show up. With few nearby players, tier 2 and 3 Raids may often go unbeaten (participation rewards still pay, so the economy is safe). Rewards are flat (10 Tickets + 2 Materials, +8 Materials on defeat, 3 rewarded Raids/day).
- Suggested change if wanted: make the per-hit cap scale with the squad's bracket instead of a fixed share of boss HP, or scale boss HP by recent participants. Needs real Raid data before tuning.

### 6m update (2026-10-06, owner decision)
Golden Games Ticket growth lowered 1.04 -> 1.02 per tier. Win purses are now tier 26: 77-116, tier 51: 127-190, tier 76: 208-312, tier 100: 335-502 (about 2,100/day at the top with 5 paid matches, down from about 13,500). The remaining surplus is meant to be absorbed by the Mementos shop and the PvP shop (currency name leaning "TV Dinners"). Raids: players must still be able to take part and earn the flat participation rewards without being able to kill the boss; per-hit scaling stays undecided until real Raid data exists.

## 6n. TV Dinners and the PvP Shop (2026-10-06, first version)
- Currency: TV Dinners (state `tvDinners`), earned only from competitive play with ONE shared cap of `DINERS_DAILY_CAP` = 40/day: Friend Battle rewarded win 3, Arena win (rewarded) 3, Raid hit 2, Court Ladder win 4. Never PP, never passive income, never sold for money.
- Shop (`components/PvpShop.tsx`, opened from the Commissary tab): 60 antiques (30 Common 20, 18 Rare 45, 9 Epic 90, 3 Legendary 180), 4 on sale per day, deterministic from the UTC day, every antique shows once per 15-day cycle and the order reshuffles each cycle, so a missed antique returns in 1 to about 29 days. Each owned antique unlocks an icon and a title (`antique:<id>`). Collection tab shows when each missing one is next on sale. Gear sold only here (8 pieces, Epic 120 / Legendary 320).
- Sink math: at the 40/day cap a player can afford about one Epic antique every 2-3 days or a Legendary gear piece in 8 days, so completing the collection takes months of play.
- Not built yet: timed PvP/Arena/Raid boosts (extra attempts), Mementos (premium) shop, art for antiques (emoji placeholders).

## 6o. Mementos (premium currency) shop, first version (2026-10-06)
- State: `mementos`, `mementoItemsOwned`, `premiumRooms`. There is deliberately NO free source and NO purchase path yet: Mementos will be sold through Google Play Billing in the store build (needs the native project, a server-side receipt check before crediting, and a Play policy review). Until then the shop is browsable but the balance stays 0.
- Spends (convenience and cosmetics only; no PP, no passive income, no PvP/Arena/Raid power): Extra Roster Room (+1 Elder room, max 10, price 15 + 5 per room already bought, 375 total) and 12 keepsakes (60-150) that unlock an icon + title, 2 on sale per week on a 6-week cycle.
- Not built: Elder Pass premium track, ad-free, priced Park Assets, bundle/first-purchase offers, real prices per Memento pack.

## 6p. PvP boosts (2026-10-06)
Boosts tab in the PvP Shop: Attack Pass (6 TV Dinners) waives the Ticket fee on one paid Arena attack; Rally Pass (6) waives the fee on one extra Raid attempt. Hold max 10 of each (`pvpPasses`). They never raise the server's daily caps (Arena 20 attacks/day, Raid 6 attempts) and never change power or rewards; they act as a Ticket-fee relief and a TV Dinner sink. Not built: a Friend Battle pass (reward cap is client-side and easier to abuse), Court Ladder extra challenges (server-enforced 3/day).

## 6q. Server ledger, step 1: shadow mode (2026-10-06)
- Migration `017_ledger.sql`: `ad_views` (one row per ad started; unique `transaction_id` = replay protection) and an append-only `ledger_entries` (player_pp / community_reserve / development, unique per (source, ref, account); a trigger blocks any update or delete). No browser access.
- `api/ledger.ts`: POST = start an ad view (server nonce, daily cap 15); Google's AdMob server-side-verification callback (GET with `signature` + `key_id`) is checked with ECDSA-P256 against Google's published keys, then books 3 entries from `ASSUMED_AD_REVENUE_PER_VIEW_USD` (0.008 x 70/20/10); GET = this player's verified totals.
- Client: `services/ledgerService.ts`; `AdOverlay` requests a nonce and passes it to AdMob as `ssv.customData` (+ `userId`). Local PP is still granted by the client as before: this step only RECORDS what the server could verify.
- Tested against an in-memory Supabase with real generated ECDSA signatures: valid/tampered/unknown key, wrong player, replay, double booking, daily cap, per-player totals (16 checks).
- Owner steps: run 017 in Supabase; in the AdMob console set the rewarded ad unit's SSV callback URL to `https://<production domain>/api/ledger`; the callback only fires for real (non-test) ad units on a published app.
- Next steps (later): switch the client so PP from ads is credited from the server total (cap local PP by the verified total); book reserve entries into the real Community Reserve; ledger entries for Dividend/Cash Out; reconcile assumed vs. actual AdMob revenue; Play Billing receipts for Mementos use the same table pattern.

## 6r. How the Community Reserve works today, and what it can cover (2026-10-06)
- **Today it is not shared.** `communityReserve` is a number inside each player's own save. A player's own ad views add 20% of the ad's assumed revenue (0.0016 PP) to THEIR OWN reserve; their own Dividend and Cash Out take from it. No other player's actions or ads touch it, and nothing on the server holds it (the ledger of 6q is the first step towards that).
- **Caps that exist:** Dividend takes at most 5% of the pool per claim (hourly cooldown, pool must be above 0.004); Cash Out (Pending Yield -> PP) takes at most 25% of the pool per claim at a rate of reserve/0.40 (min 0.25, 1:1 at 0.40+).
- **Money in vs out per ad (assumed 0.008 USD):** player gets 0.0056 PP directly (70%), reserve gets 0.0016 (20%), development 0.0008 (10%). Everything that can ever be paid out is therefore at most 90% of ad revenue, and passive earnings (Pending Yield) can only ever be paid from the 20%.
- **Passive vs reserve inflow, per player per day:** base passive is 0.000004 per 30 s tick (0.0115 PP/day if the app were open all day, x2 with an ad boost, plus Park Assets). A player who watches the full 15 ads/day adds 0.024 PP to the reserve per day. So the base rate roughly matches what a heavy ad watcher feeds in, but a light or non-watching player accrues passive that must be funded by others, and Park Assets multiply the rate with no matching income.
- **Conclusion:** the reserve cannot "cover passive rates" in the sense of guaranteeing them; it can only cap them. Total Cash Out can never exceed total reserve inflow (the cap + rate floor guarantee that), so the real risk is expectation: Pending Yield shown in the game may exceed what can ever be converted. Options: (1) honest pool model: Pending Yield is "shares" and Cash Out pays a pro-rata slice of one global pool, shown as a live rate; (2) lower passive rates / Park Asset yields until modelled inflow (measured ads/day, purchase share) exceeds modelled claims with margin; (3) add a share of Mementos purchases to the reserve (the Atlas Earth idea).
- **Visibility:** recommended public numbers once the reserve is global and server-side: pool size, ads watched today, current conversion rate, and total paid out; never other players' individual balances.

## 6s. Free players, Park Asset limits, and how options 2 + 3 fit together (2026-10-06)
**A player who never watches an ad or buys anything:** earns Tickets, XP, Materials and cosmetics from play (never PP), and accrues Pending Yield from the base rate (0.000004 per 30 s tick, about 0.0115/day if always on). Today their own reserve stays 0, so Cash Out pays them nothing. In a global-pool model they could convert Pending Yield at the pool rate, funded by other players' ads and purchases; that is the only way a free player gets PP, and it should stay tiny by design (minimum redemption 5 PP).

**Why the old asset system was the biggest hole:** Park Assets had a flat price and no ownership limit. Payback at full uptime was 17-35 days for every asset (e.g. Park Directorship: 4.0 Yield for +0.00008/tick = 0.23/day, 20x the base rate), so a player could stack unlimited copies and accrue Pending Yield far beyond any possible reserve inflow (a maxed ad watcher feeds the reserve about 0.024 PP/day).

**Change shipped (option 2, first half):** each Park Asset now caps at 5 copies (`PARK_ASSET_MAX_OWNED`) and each extra copy costs 1.5x more (`parkAssetCost`). Existing saves keep what they own but cannot buy past the cap. Maximum possible passive rate is now bounded.

**Still needed to make options 2 + 3 balance (needs owner numbers):**
1. Yields: even capped, a fully built player accrues about 3 PP-equivalent/day with an ad boost versus 0.024 of reserve inflow per heavy ad watcher. Either scale `rateBoost` down roughly 20-50x, or keep the numbers and let the pool-limited Cash Out rate carry the difference (honest but disappointing: the rate would sit near the floor). Recommended: scale yields so a maxed park earns about 2x one heavy watcher's reserve inflow, and make costs fall in step.
2. Option 3: a fixed share of every Mementos purchase (suggested 30% of net revenue after store fees) is booked to `community_reserve` in the ledger. One 5 USD purchase at 30% adds roughly 1 PP, about as much as 900 ad views, so purchases will fund most of the pool; the rate would then be driven by purchases rather than ads.
3. A global reserve (server-side) and server-side Pending Yield, so Cash Out pays a pro-rata slice: rate = min(1, pool / total claimable). Same ledger project as Play Billing.
