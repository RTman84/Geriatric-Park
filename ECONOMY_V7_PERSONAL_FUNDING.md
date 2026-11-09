# Economy v7: personal funding (owner-approved 2026-11-07, account B)
Supersedes the shared-pool parts of `ECONOMY_V5_PLAN.md` / `ECONOMY_V6_BADGES.md` (their badge ladder, rarity and Atlas research still apply). **Not legal advice. Payouts stay OFF until a lawyer and the payout provider approve; PP/Pension Fund stays virtual in all in-game wording.**

## 1. Owner decisions that shape this
- PP becomes the **Pension Fund** (single cash-eligible balance, never spent in game). Display stays points-style, not dollars, until legal review (a "$" balance reads as money owed and triggers stored-value / unclaimed-property / real-money-games scrutiny; Atlas shows dollars, so it is possible later, and the display is a UI switch).
- **No shared pool and no pool-health bar.** Growth must be visible and meaningful and must NOT depend on other players, especially non-watchers. A player's growth is funded by that player's own videos and purchases.
- Old Park Assets are removed and the Pending Yield spent on them is refunded as Mementos; PP and Pending Yield balances carry over.
- Keepsakes follow rarity pricing (event discounts only). Event keepsake = event goals + 10 rewarded ads (an engagement gate, about $0.08 gross, not funding).
- Account level cap 300 (built).

## 2. The model
```
YOUR rewarded video  --> 70% of its revenue (assumed $0.008) adds to YOUR funding
YOUR Memento purchase --> 40% of net revenue (after the 30% store fee) adds to YOUR funding
YOUR funding ----------> vests gradually as Pending Yield (the number that ticks up every second; each video boosts it x10 for an hour)
Pending Yield ---------> Cash Out to Pension Fund (cash-eligible, minimum 5) | or Reinvest in Mementos at a bonus
```
- Pending Yield can never exceed what the player's own funding supports (a personal cap), so the game cannot owe more than it earned from that player, no shared pool is needed, and inactive players cost nothing.
- Free players who never watch or buy: cosmetic and Memento progress only; no cash-eligible growth. (Optional later: a tiny capped welcome allowance, off at launch.)
- Honest scale (conservative $0.008/view, 10 videos a day): about $0.08 gross a day, about $1.70 a month to the player; the $5 minimum takes roughly 3 months of daily watching, faster with purchases or higher real ad revenue. Rates are server-side constants to retune with real AdMob data.
- Park Badges (old Park Assets, bought with Mementos) multiply yield by their ladder; they only matter once there is funded land/yield to multiply, so they stay mostly status and customization for light players.

## 3. What is built so far
- Server-held Mementos (balance, spends, refunds), Gold Pass, PP -> Mementos one-way conversion.
- NEW (2026-11-07): free Mementos faucets, all server-side and once-only: daily check-in (2/day, day 7 pays 2+5), free daily spin (1/2/3/5/10, expected about 1.95), level milestones every 10 levels from 100 (10 each, 25 at 200, 100 at 300). Expected free income about 4 Mementos a day while active (about $0.04 of virtual currency, roughly one $5 pack's worth every 4 months). Safe because free Mementos cannot create cash-eligible growth under this model.
- Ledger in shadow mode (`ad_views`, `ledger_entries`, AdMob SSV) is the base for personal funding.

## 4. Build order (each a small pushed step with tests and an ECONOMY.md entry)
1. DONE: free Memento faucets (daily, spin, milestones). 2. Rarity pricing for keepsakes on the server (price table by rarity; GP app 2 supplies display). 3. Ads pay Mementos (not PP) per verified view, and Tasks/Stars bonuses pay Mementos. 4. Personal funding accrual: `funding_accounts` + ledger entries per verified ad/purchase, server-side Pending Yield that vests from funding, Cash Out to Pension Fund with minimum, "Funded by your videos and purchases" UI, rename PP to Pension Fund in the Bank. 5. Badges: reset old Park Assets (+ refund), badge catalogue with points and tier boosts, tracker UI. 6. Event keepsake ad requirement (10 verified views in the event window). 7. Payout gates (legal review, provider terms, KYC/tax, Data Safety, USA-only) before any payout.

## 5. Risks to keep visible
Verified-ads dependency: personal funding needs the AdMob server-side verification callback live on the production domain. Rewarded-ad revenue per view is unknown until launch; every rate must be server-side. Level milestones read the client-synced level (small, once-only, capped total of 410 Mementos); harden with server-authoritative level later.
