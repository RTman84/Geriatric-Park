# Geriatric Park roadmap (2026-10-05)

One list for everything planned. Standing rules still apply: PP only from the ad-view player share and reserve-capped Dividend/Cash Out; gameplay never pays PP or raises passive income; currency wording stays virtual-only until a compliant backend and legal review exist; every new faucet gets a sink or a cap in ECONOMY.md.

## Done (on GitHub, branch phase2/account-backend-foundation-clean)
Accounts + cloud save, Friends, Mailbox, Arenas + Raids, Park scene + buildings, Resident Exchange (visit gifts with targets, Squad Loan, quests), rarity stat multipliers, wild Elder preview and scaling, gear upgrades to rarity-scaled caps, Golden Games/Challenge curves to 24k, player battle cooldowns, Find Opponents (10 brackets), Court Ladders (top 10 per bracket, top-3 titles, server-verified), displaced-spot mail, Park Hub evolve, building popup, Away & Visiting window, mode badges.

## Next up (suggested order)
1. **Quest structure.** Three kinds, clearly separated in the Tasks screen:
   - Repeatable: dailies and weeklies that rotate (exists; keep, add more variety per mode).
   - Milestones: one-time progression chains per mode (Bronze to Legend, matches the mode badges) for bragging rights, titles, icons and small one-time Ticket/Materials rewards. Not repeatable.
   - Seasonal/event: limited-time, cosmetic-first.
2. **Tutorial refresh.** Add cards for Court Ladders, Find Opponents, Resident Exchange (visit/loan), Away & Visiting, mode badges, Arena.
3. **Ticket/Materials source-and-sink table** in ECONOMY.md section 6, then re-audit Raid HP/damage, Arena power, Daily Tournament scoring and Auto-Play benchmark against the 24k power curve (not done yet).
4. **PvP / Social shop** (see below).
5. **Art pass** (see below), done before the shops so they launch with real art.
6. **Cash shop** (see below), only after the free game and PvP shop are balanced.
7. **Launch track:** USA-only restriction, rewarded-ad network with server-side verification, Play Console (Data Safety, content rating incl. chance mechanics, privacy policy incl. ads + location), release signing, native Google sign-in in the Android app, Android back button, bundle Tailwind locally, crash monitoring, rotate SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY, confirm the old leaked Gemini key is revoked, server-authoritative ledger, legal review before any real payout, revert any test constants.

## PvP / Social shop (design proposal, needs your decisions)
- Its own currency (working name "Rivalry Ribbons", please rename) earned only from social and PvP: player battles, Court ladder ranks, Arena holding/attacking, Raid participation, Resident Exchange hosting and loans, Friend visits.
- Rules: never PP, never passive income, per-source daily/weekly caps so it cannot be farmed; spend only on cosmetics and prestige (titles, icons, frames, park themes, building skins, Elder skins), plus a few convenience items. No power that decides PvP outcomes (keeps ladders and thrones fair).
- Needs: a currency field in saves (untrusted-save rules), a server-recorded balance if it gates anything other players see, a shop screen, and art for every item.

## Currency naming and use cases (draft, 2026-10-05)
- PvP currency: themed on things that help old people stay active. Leading option: **Liniment** (a jar of muscle rub; distinct from USD and from Tickets/Materials/PP). Others: Heat Packs, Support Bandages, Compression Socks. Avoid brand names (trademarks).
- Premium currency: needs its own name and real scarcity. Leading option: **Heirlooms** (fits the planned limited-time "antiques"). Others: Golden Years, Silver Spoons.
- Premium uses (must beat just waiting): limited-time Antiques (rotating cosmetics/building skins, fixed windows), Elder Pass premium track, extra roster/inventory slots, ad-free, and possibly priced Park Assets (see below). Nothing that raises PvP power.
- Atlas-Earth-style conversion idea: Heirlooms could buy Park Assets (the passive-yield micro-assets) at a price deliberately worse than reinvesting free Pending Yield, so buying is an accelerator not a requirement, and a set share of each purchase goes to the PP reserve. This is the only place purchases would raise passive income, so the price must exceed the asset's lifetime PP payout by a safe margin; needs a legal/policy review (investment-like mechanics) before building.

## Cash shop (design proposal, needs your decisions)
- Tickets are plentiful, so they are not the sold currency. PP is the future USD-backed currency and must never be sold directly (payments/regulatory risk, and it would break the ad-revenue-only rule).
- So the cash shop needs its own premium currency (name TBD), bought with real money through Google Play Billing (Steam later needs its own model), spent on: cosmetics, Elder Pass premium track, extra roster/inventory space, ad-free option, limited-time "antiques".
- Rules: free play stays fully viable; nothing purchasable raises ladder/PvP power; revenue funds the PP reserve per the economy plan. Google Play policy review needed because the game has chance mechanics (Bingo) and a PP payout plan.

## Art needs (all emoji that must become real art, plus new content)
Audit: about 85 distinct emoji, about 275 uses. Biggest groups to replace, in priority order:
1. **Currency icons:** Tickets (65 uses), Building Materials (25), PP, plus the future PvP and premium currencies.
2. **Badges and medals:** 5 mode badge tiers x 8 modes (40), Court place medals (3) and bracket crests (10), rank icons (6 tiers), achievement icons (about 70 distinct icon fields in constants).
3. **Items:** Shop items (10), gear pool icons (4 slots x several items, plus rarity frames), Garden/map pickups.
4. **UI icons:** nav tabs, status chips, Arena/Raid markers, faction emblems (3), Raid boss portraits (6, prompts already in ARENA_DESIGN.md).
5. **Buildings still to illustrate:** Tinker's Workshop, Visitors' Lodge (a real home for Away & Visiting).
6. **Customization (later):** profile frames, Elder skins, park themes.
Process: audit first, then I write prompts per group and you confirm each before any art is generated; you generate in Leonardo. Style: glossy cartoon mobile-game diorama/icon style matching the existing amenity art; one icon per image on a plain background (cut out in code); no baked-in text (labels are drawn by the app).

## Customization backlog (after the base game is fleshed out)
More titles/icons/frames from events and seasons; account reset option (needed before real currency go-live); Elder name/gender/appearance consistency; app themes; Alliance/Clan; Arena Cards, bids and rare-item perks; 3D avatars; Steam port (needs a non-ad monetization model).
