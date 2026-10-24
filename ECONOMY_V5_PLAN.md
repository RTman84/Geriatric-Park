# Economy v5 plan: Atlas-style Mementos, Keepsakes/Antiques as income, shared yield pool (owner decisions 2026-10-24)
Status: DESIGN ONLY, nothing built. Supersedes the "purchases never raise passive income" rule once the owner confirms the legal gates in section 9. Read with `ATLAS_COMPARISON.md`. **Not legal advice.**

## 1. Owner decisions (all eight answered 2026-10-24)
1. Passive income moves from Park Assets to **Antiques and Keepsakes, which get rarity grades**; more of them will be added (event-only Keepsakes/Antiques available for a limited time per holiday event). **Mementos replace PP as the thing players earn and spend**; PP stays the cash-eligible yield currency.
2. **Park Assets stop earning.** They become pure customization with a NEW second function (see 4), **no ad requirement, no per-type cap**, and many more of them (more customization options).
3. Remove PP rewards from ads. Players are paid in PP **only through yield from a shared pool** (Cash Out).
4. Boost works like Atlas (large multiplier on a tiny base, stacking hours, taper) adapted to our systems.
5. **Daily system** that tracks and shows progress on login after the map loads, a **spin wheel**, ads that pay Mementos, and an **Offers section** in the Mementos Shop (rewards for milestones in other apps/games, like Atlas Arcade). Minigames later if cheap.
6. Antiques/Keepsakes follow Atlas land: **no cap on copies**, different rarities with different passive amounts, plus **Legendary-upgrade-style shop items** (permanent boosts) bought with Mementos.
7. Make the pool, ledger and honesty wording real (shared server pool, pro-rata Cash Out, "not guaranteed").
8. Reinvestment loop: Mementos (from ads, daily rewards, wheel, bid tokens, offers, purchases) -> Keepsakes/Antiques and upgrades -> more yield -> reinvest or Cash Out. Must not look like a copy of Atlas. Memento packs start at **$5**: $5 / $10 / $20 / $40 / $100.
Also: tasks and Stars rewards switch from PP-related bonuses to **Mementos**.

## 2. Currency flow (target)
Money in: ads (AdMob rewarded) + Memento pack purchases (Play Billing). Split per ad: store/network as received, development share, pool share. Per pack: store fee, development, pool share (start 30% of net).
Player side: Mementos (free sources + purchase) buy Keepsakes/Antiques (income assets) and Legacy upgrades; owned assets accrue **Pending Yield per second**, server-side; Boost multiplies it. Pending Yield -> Cash Out to PP at the pool rate, or Reinvest into more Mementos-priced assets at a bonus. **PP is never sold, Mementos never convert to PP, no direct PP from ads or gameplay.** Payouts stay OFF until section 9 is done.
Invariant: total PP paid out never exceeds pool inflow (rate = min(1, pool / total claimable)).

## 3. Mementos: sources and sinks (first-pass numbers, tune with data)
Sources (free): ad view +2 (15-20 min spacing, 8/day cap), daily login streak (day 1-7 ladder, day 7 = 25), daily spin (1/day, free; extra spin = 1 ad), milestone rewards (+10 to +100 at big benchmarks), tasks (replaces Stars/PP bonus), events, Offers (partner payouts), bid tokens from wheel/streak. Cap the free faucet so a full free day is about 60-80 Mementos (about one Common Keepsake per 3-4 days).
Sources (paid): packs 5 / 10 / 20 / 40 / 100 USD = 500 / 1,050 / 2,200 / 4,600 / 12,000 Mementos (about 5% to 20% bonus tiers). Price/ID changes need new Play products `mementos_500` ... `mementos_12000`, server price table in `api/mementos.ts`, `api/purchase.ts` grant map.
Sinks: Keepsakes/Antiques (Common 100 up to Legendary 2,500+), Legacy upgrades (permanent yield boosts, no copy cap, rising price per copy), Park Assets (cosmetic, cheap), roster rooms, passes, Gold Pass, auction bids.

## 4. Keepsakes/Antiques rarity and the Park Asset change
Rarity grades Common / Rare / Epic / Legendary (+ Event, time-limited). Yield multipliers 1 : 1.45 : 2 : 4 (Atlas-like); Event items sit at Epic/Legendary rates. Unlimited copies, per-copy price creep, **diminishing yield per extra copy past soft thresholds (20/40/80 owned)** so the pool stays solvent. Existing 12 Keepsakes + 60 Antiques get a rarity each (Antiques already have Common/Rare/Epic/Legendary). Display: owned items can be shown in the Park.
Park Assets (new function): cosmetic placement plus a small non-PP perk such as "Park Charm" (capped bonus to Tickets/Materials or a display set bonus), no yield, no purchase limit, bought with Mementos or Tickets. Needs many more art pieces.

## 5. Boost (Atlas-like, adapted)
Base yield tiny; one ad = 1 boosted hour; stack up to 6 hours per day; multiplier x10 at start (tunable), tapering with portfolio size; periodic "Super Boost" events. Server enforces hours, never the client.

## 6. Daily system, wheel, offers
- Login popup on the map after load: today's streak day, progress to next reward, ad-boost hours left, daily spin button, quest summary.
- Wheel segments: Mementos (most), Tickets, Materials, bid tokens, rare big Memento prize. Free spin daily, extra spins via ads (cap). Server rolls the result (client never decides).
- Offers (game offers wall): third-party offerwall SDK (candidates to evaluate: AdMob/ironSource/Tapjoy-style); requires Play policy check, USA-only, privacy policy + Data Safety updates, partner payout callback verified server-side. Evaluate cost (usually revenue share, no upfront fee).
- Bid tokens + auction: limited-time Keepsake/Antique/Legacy auctions, bids cost tokens, server-run. Phase after the core loop.

## 7. Server work (all of it one project)
Shared pool + ledger authoritative (move PP derivation off the client), server-side yield accrual and boost hours, Memento grants (ads, daily, wheel, offers) with caps, auction tables, pro-rata Cash Out, pool health endpoint. New tables must be added to `api/account/delete.ts`. Migrations numbered from 031.

## 8. Build order (small batches, push after each)
B1 Memento faucets without economy risk: daily login + streak + wheel (server-rolled) + ads pay Mementos (no PP) + tasks pay Mementos. B2 pack table 5-100 and Play products. B3 rarity on existing Keepsakes/Antiques + yield fields (yield OFF). B4 server yield + boost + pool (shadow mode, PP payout off). B5 buy/own/reinvest UI with the Atlas-like but original presentation. B6 Legacy upgrades + more Keepsakes/Antiques (art). B7 Offers wall. B8 auction + bid tokens. B9 legal review, then payout provider. Event Keepsakes/Antiques follow each event.

## 9. Gates before ANY payout (do not skip)
Written legal/compliance review (Play real-money-games and payments policies, sweepstakes/chance law with Bingo, KYC and tax reporting, minors), the payout provider's terms and fees (verify before choosing; "free to implement" must be confirmed), privacy policy and Data Safety updates, USA-only enforcement, clear "not guaranteed, pool-limited" wording and a visible pool health bar. Until then PP is a virtual number only.
