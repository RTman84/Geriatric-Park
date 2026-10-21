# Geriatric Park vs Atlas Earth: flow comparison and what to change (2026-10-20)

Purpose: the owner feels the game's economy flow is "missing something or implemented wrong" for the original idea (Mementos like Atlas Bucks, Park Assets like parcels, ads boosting passive income, real purchases funding payouts). This compares the two systems and lists concrete gaps. **Not legal advice; every payout idea stays disabled until the legal review in the launch track.**

Sources: web search on 2026-10-20 (store listings, review sites, calculator apps). They disagree on some numbers (rates change, regions differ), so treat Atlas figures as approximate and re-check before copying any number. Confirmed by several sources unless marked.

## 1. How Atlas Earth works (what the sources agree on)
- **Two layers.** (a) *Rent*: USD-denominated, accrues every second on owned parcels even when the app is closed, cash-out eligible (PayPal, Venmo, gift cards) from $5. (b) *Atlas Bucks (AB)*: the in-game currency; buyable with real money, earnable free (ads give about 1-2 each, a free ad roughly every 20 minutes, daily login, wheel, minigames, surveys, merchant cash-back), and rent can be transferred INTO more land ("reinvest").
- **AB buys the income assets.** A parcel costs 100 AB (about $5 at the buy price; first parcel free). Parcels have rarity tiers with rent roughly 1 : 1.45 : 2 : 4 (Common to Legendary). Permanent "badges" bought with AB add a rent boost. So the chain is: real money -> AB -> parcels/badges -> rent -> cash-out.
- **Ads boost rent, they do not pay cash.** One ad = one hour of boosted rent; boosts stack (reports say up to 6 stacked hours per day); advertised multiplier 30x-50x because base rent is tiny; the boost TAPERS as you own more land; periodic "Super Rent Boost" events raise it for everyone.
- **Base rent is extremely small** (reports: about $0.10 per parcel per year unboosted; a common parcel can take years to earn $5). The excitement comes from the boost multiplier and from reinvesting, not from the base rate.
- **Rent is explicitly not guaranteed** ("loyalty cash-back", may change or pause). Payouts are funded from ad revenue and IAP revenue; AB packs and legendary upgrades are the main revenue.

## 2. How Geriatric Park works today (from ECONOMY.md and constants.tsx)
- **Ad view**: pays the player 70% of an assumed $0.008 directly as PP (0.0056), 20% to a personal Community Reserve, 10% development; also a 1-hour 2x boost that stacks by extending the timer; cap 15 ads/day.
- **Passive**: base rate + Park Assets, x2 with boost, accrues into Pending Yield. Yield -> PP only through Cash Out (reserve-capped, rate falls with pool health) or is spent on Park Assets.
- **Park Assets**: 6 types, max 5 copies each (30 total), price in *Pending Yield* with +50% per extra copy, yields cut about 65x in economy v4; free-form placement in the Park (decoration, but they are also the only passive growth).
- **Mementos**: bought with real money (packs $0.99/$4.99/$9.99 = 100/550/1150) or converted from PP one way (1 PP = 100 Mementos). Spend: roster rooms, 12 keepsakes, Gold Pass, PvP passes. **Cannot buy Park Assets. No free source.** Server-held balance.
- **PP**: cash-eligible, min redemption 5 PP; payouts disabled pending compliance.
- Standing rule today: "purchases never raise passive income."

## 3. Diagnosis: what is missing or built differently from the idea
1. **Money cannot buy income assets.** In Atlas the paid currency buys parcels; here Mementos buy only cosmetics/rooms and Park Assets cost only Pending Yield, which a new player barely earns. The Atlas loop (pay -> own more land -> more rent) does not exist, so there is no strong reason to buy Mementos and no way for effort or money to grow passive income at a meaningful pace. This is the biggest gap and it matches the owner's feeling.
2. **Two faucets into cash-eligible PP.** Ads pay PP directly (70%) AND yield cashes out to PP. Atlas has one: rent. Direct per-ad PP is the largest real-money liability (a 70% share of every ad), is not reserve-capped, and makes the passive system feel secondary. Recommended: ads stop paying PP; the ad's revenue share goes to the pool; players are paid only through yield.
3. **The boost is too weak and uncapped.** 2x on a 0.0115/day base is invisible; Atlas uses a large multiplier on a tiny base so each ad feels big. Ours also extends 1 hour per ad up to the 15-ad cap (15 boosted hours) with no taper. Recommended: base stays tiny, boost x10 (tunable), cap 6 stacked hours/day, taper as owned assets grow (so heavy portfolios cannot out-scale the pool).
4. **No free Memento faucet.** Atlas keeps free players engaged with 1-2 AB per ad plus daily/wheel/minigames. Ours has none, so a free player never touches the premium currency's purpose. Free Mementos are cheap for us because they only buy long-payback assets (Mementos never convert back to PP).
5. **Assets are capped and decorative-first.** 30 total, 5 per type. Atlas has near-unlimited land with a boost taper instead of a hard cap, plus rarity tiers. Ours has no rarity on assets and no plot concept, so "buy more" has a hard ceiling.
6. **Passive is not always-on or server-held.** Atlas rent accrues server-side every second. Ours accrues in the client and the reserve is personal (not shared). A shared server pool with pro-rata Cash Out is already the planned design and is required before any payout.
7. **Rent-style honesty is missing.** Atlas states rent is not guaranteed. Our Bank shows Pending Yield and a Cash Out rate; it needs the same plain "not guaranteed, pool-limited" wording and a visible pool health bar.
8. **Reinvest path is half there.** PP -> Mementos exists (one way); Yield -> Mementos or Yield -> Assets at a bonus rate (Atlas style "transfer rent into land") does not.

## 4. Proposed flow (for the owner to approve; nothing built yet)
```
MONEY IN                      PLAYER SIDE                              MONEY OUT
Ads (AdMob rewarded) --+      Mementos (buy / free from ads+login)
Memento packs (IAP) ---+--> POOL (server)       |
 split: store fee, dev, pool share              v
                                  Park Assets (priced in Mementos, rarity tiers)
                                  placed in the Park --> earn Pending Yield per second
                                        ^ ad = 1h boost (stack <= 6/day, x10, tapers)
                                        |
                       Pending Yield --> (a) Cash Out to PP at pool rate (pro-rata, min 5 PP)
                                      \--> (b) Reinvest: new Assets/Mementos at a bonus rate
PP --> Mementos stays one-way. Mementos never convert to PP. No direct PP per ad.
```
Key invariants: total PP paid out can never exceed pool inflow (pro-rata rate = min(1, pool / total claimable)); yield is described as "loyalty cash-back, not guaranteed"; payouts stay disabled until legal/compliance review.

### 4.1 Illustrative starting numbers (tune with real data; ad revenue assumed $0.008/view)
- Value anchors: 1 PP = 100 Mementos (existing). Keep pack prices as they are, or re-denominate so 1 Memento is worth more at purchase than at conversion (Atlas style spread of about 20%).
- Ad slots (total stays about 15/day like today): **Boost ad** x6/day (stack to 6 hours) and **Memento ad** x8/day (+1 Memento each, 20-minute spacing). No PP per ad.
- Park Asset example: price in Mementos, rarity multipliers 1 / 1.45 / 2 / 4 (Common/Rare/Epic/Legendary; glows blue/purple/gold per the item rule; Legendary only through purchase or rare drops). Target payback: about 10+ years unboosted and about 2-3 years at a typical boost schedule (6 boosted hours/day at x10 averages about 3.25x), so heavy players earn modestly and the pool always covers it.
- Pool funding: ad share (suggest 20% to pool, as today) plus about 30% of net revenue (after store fees) from every Memento purchase (matches ECONOMY.md 6s).
- Taper: per-asset yield multiplier falls past, say, 20 / 40 / 80 owned assets so portfolio size cannot outrun inflow.

## 5. Decisions needed from the owner before any code
1. Confirm reversing the standing rule: **Mementos (real money) may buy income-producing Park Assets.** This is the Atlas model and exactly the chain Google Play real-money-games review, payments law (KYC, tax reporting) and sweepstakes law will look at, especially with Bingo chance mechanics in the app. Recommendation: build it, keep PP payout OFF, get the legal review before enabling it.
2. Remove direct PP per ad (yes/no).
3. Boost multiplier and daily stack cap (suggest x10, 6 hours).
4. Free Memento sources (suggest ad +1, daily login, a few milestones).
5. Hard cap vs taper for asset count; whether assets earn only when PLACED in the Park (makes the placement rework matter and ties "more land" to Park space).
6. Re-denominate Mementos (keep $0.99/100 or move to an Atlas-style higher buy price with a conversion spread).
