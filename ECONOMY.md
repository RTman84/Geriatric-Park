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

**Open:** turn this into an hourly/daily expected-value table per source and sink, then tune
against it. Rule: any new Ticket source needs a matching sink or a daily cap.

## 7. Retuning checklist (when real ad data arrives)

1. Set `ASSUMED_AD_REVENUE_PER_VIEW_USD` to the measured net revenue per rewarded view (watch the trend
   over weeks — eCPM decays with frequency and varies by region/season).
2. New scale factor = new value / 0.008. Multiply every row in section 3 by it (or leave the
   costs and change only what the ad pays, keeping payback in "ad views" constant).
3. Ship a save migration (bump `ECONOMY_VERSION`) if stored PP values must change.
4. Update this file.
