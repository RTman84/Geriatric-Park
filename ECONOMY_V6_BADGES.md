# Economy v6 addendum: Park Badges, Land, Pension Fund, sustainability (2026-10-26, account B)
Extends `ECONOMY_V5_PLAN.md` and `ATLAS_COMPARISON.md`. **Not legal advice. Every number here is a starting point for the owner to approve and for a simulation with real data.** Nothing below is built yet.

## 1. What Atlas does that matters here (research 2026-10-26, web; low-quality aggregator pages, so treat numbers as approximate and unverified)
- **Land earns, badges multiply.** Parcels (land) are the only things that earn "rent". Badges (bought with Atlas Bucks) do not earn by themselves: they add a permanent percentage boost to rent, in steps by how many badges you own (one source: owning 1-10 badges gives about +5% total). Without land a badge does nothing.
- **Ads boost, they do not pay cash.** One ad = about one hour of boosted rent, stackable several hours a day, boost is a large multiple of a tiny base rate, and the multiple shrinks as your rent per second grows (a taper).
- **Rent is not guaranteed** ("loyalty cash-back", may change or pause), accrues per second server-side, and is cashed out above a minimum (about $5) through a payment partner.
- **One paid currency buys the assets** (Atlas Bucks), it is also earned free in small amounts (ads, daily login, wheel), and rent can be moved into it.
What we mirror: structure (paid currency buys assets, assets earn tiny yield, boosts are temporary and tapered, payout balance separate, "not guaranteed" wording). What we do NOT copy: their exact numbers or art.

## 2. Our structure
```
MEMENTOS (buy / ads / daily wheel / milestones)
   |-- buy LAND  = Keepsakes + Antiques with rarity (these earn Pending Yield)
   |-- buy BADGES = Park Assets (never earn; each gives badge points -> % boost to ALL land yield)
   |-- buy extras: bid tokens, Gold Pass, roster rooms
PENDING YIELD (accrues per second, server-side later; ad boost multiplies it, taper applies)
   |-- Cash Out -> PENSION FUND (cash-eligible balance, the only payout faucet), pro-rata from the shared POOL
   |-- Reinvest -> Mementos (at a bonus rate, our idea)
POOL = share of ad revenue + share of Memento purchases (after store fee). Cash Out rate = min(1, pool / total claims).
```
Park Assets stop being decoration-only: they are the badges, they stay placeable decor, and a tracker shows "N badge points, M more for the next +X%".

## 3. Badge ladder (draft)
Points per badge: Common 1, Rare 2, Epic 4, Legendary 10. Unlimited copies; price per copy rises slowly (+2% per copy of the SAME badge, cap x2.5) so collecting variety is cheaper than stacking one badge. Boost applies to land yield only.
| Tier | Badge points | Boost | All-Common cost at 100 Mementos per point (about $1/pt) |
|---|---|---|---|
| 1 | 5 | +1% | $5 |
| 2 | 15 | +2.5% | $15 |
| 3 | 40 | +5% | $40 |
| 4 | 100 | +9% | $100 |
| 5 | 250 | +14% | $250 |
| 6 | 600 | +20% | $600 |
| 7 | 1,200 | +26% | $1,200 |
| 8 | 2,500 | +31% | $2,500 |
| 9 | 5,000 | +35% (cap) | $5,000 |
Suggested prices (Mementos): Common 100, Rare 300 (2 pts), Epic 800 (4 pts), Legendary 2,500 (10 pts); cost per point rises with rarity (100 / 150 / 200 / 250), so rarity is for variety and prestige, not efficiency. Launch catalogue: 6 existing art pieces now as Common/Rare/Epic/Legendary by theme (Garden Plot, Park Bench = Common; Bingo Hall, Shuttle Van = Rare; Golden Wing = Epic; Directorship = Legendary), 30+ later; some only from events/auctions.
**Honest value check:** badges only pay off with a lot of land. The +9% of tier 4 on $50 of land is about $0.30 per year; break-even on $100 of badges needs several thousand dollars of land. So (a) badges must carry non-financial value too: tier-up gifts (a one-time Mementos or Tickets reward per tier, funded by marketing budget not by the pool), titles, profile frames, Park decoration; (b) show the % and the real gain in the tracker so players are never misled.
Tracker UI: Bank and Park Hub card: "Badge points 37 / next tier 40 (+5%), 3 more points" plus a progress bar and the list of owned badges with counts.

## 4. Sustainability model (illustrative; assumptions in the text)
Assumptions: 1 Memento = $0.01 gross; store fee 30% (conservative); Common land 500 Mementos ($5); base yield 2% of price per year (Atlas-like order of magnitude); ad boost x10 for 6 of 24 hours = average x3.25; 14 ads a day (6 boost, 8 Memento) at an assumed $0.008 per view = $40.88 gross per active user-year; pool share of ads 30%, of net purchases 40%; 0.85 taper factor for big portfolios.
| Player | Land | Badge pts / boost | Yield claims per year | Pool inflow year 1 | Coverage |
|---|---|---|---|---|---|
| Free (3 free lands) | $15 | 0 / 0% | $0.83 | $12.26 (ads) | 14.8x |
| Light ($20) | $20 | 0 / 0% | $1.10 | $17.86 | 16.2x |
| Mid ($100 land + $30 badges) | $100 | 20 / +2.5% | $5.66 | $47.44 | 8.4x |
| Heavy ($500 + $150) | $500 | 100 / +9% | $30.11 | $191.81 | 6.4x |
| Whale ($2,000 + $600) | $2,000 | 400 / +14% | $125.97 | $735.36 | 5.8x |
**Reading it:** year one is safe, and the free and light players are funded by ads alone, as in Atlas. The real risk is time: purchase money alone funds only about 4.3 years of full yield per $1 of land (0.70 x 0.40 / (0.02 x 3.25)), after which heavy players' claims outrun their own funding. So do these four things:
1. **Pro-rata Cash Out** (rate = min(1, pool / total claims)) so insolvency is impossible by construction; show the pool health bar and the live rate.
2. **Lifetime cash-back cap per land** (suggest 35% of its Mementos price in cumulative yield; after that it keeps a tiny 10% yield). Players get "loyalty cash-back", not an investment.
3. **Server-controlled global rate multiplier** (like Atlas changing rent) plus the taper by total yield per second, tuned from measured pool inflow.
4. **Raise the purchase pool share to about 50% of net** if the cap is not wanted; each +10 points of pool share buys about 1.1 extra years.
Meaningful earnings: with these numbers a free player earns cents per year, a heavy payer gets back at most about a third of what they spent over several years, plus ad income. That is the honest Atlas-like outcome. If the owner wants it more generous, the levers are the base yield rate, the lifetime cap and the pool share, and each costs pool money one for one. Decide with real revenue data before launch.

## 5. Pension Fund (what happens to PP)
Recommendation (Q1 option A): **PP becomes the Pension Fund, the single cash-eligible payout balance.** Its only faucet is Cash Out from yield; it is never spent on gameplay; the Bank shows it, the pool rate and the minimum (suggest 5). Reinvest button converts Pension Fund to Mementos at a small bonus (our idea). Bid tokens and auction bids use Mementos or tokens bought with Mementos, NOT the Pension Fund, so a cash-eligible balance never becomes a spendable game currency (solvency and legal reasons). Existing PP: pre-launch and nothing ever paid, so convert once to Mementos at 1 PP = 100 Mementos, or reset (Q2).

## 6. What "works legally like Atlas" means (checklist to bring to a lawyer, not a conclusion)
Virtual currency buys virtual goods only; payout balance is separate and earned only from a revenue-funded pool; payouts are discretionary "loyalty cash-back", not guaranteed or promised returns; stated minimum cash-out; identity (KYC), age (18+) and tax information (US tax forms above thresholds) collected by the payout provider; US-only at launch; terms of service and privacy policy that match; Google Play policies on real-money rewards and on simulated gambling (our Bingo chance mechanics are a separate question); sweepstakes/prize law. **Atlas existing on the stores does not make ours compliant. Payouts stay OFF until a lawyer and the payout provider approve.**

## 7. Reset plan for current Park Assets
One-time save migration (`economyVersion` bump): clear `parkAssets` and placed asset decor; keep building layout; show a message. Optional refund (Q2): Mementos equal to Pending Yield spent, or nothing. Asset art stays; ownership must now come from buying with Mementos.
