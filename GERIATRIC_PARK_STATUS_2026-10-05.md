# Geriatric Park - STATUS (as of 2026-10-05)

Paste this whole file as the first message in a new chat. Repo: `RTman84/Geriatric-Park`. Branch: `phase2/account-backend-foundation-clean` (only active branch). Supersedes `GERIATRIC_PARK_STATUS_2026-10-01.md`. Also read `ROADMAP.md` and `ECONOMY.md` in the repo (both current), plus `ARENA_DESIGN.md` for Arenas/Raids.

## Efficiency rules (carried over, still apply)
- Public repo: `git clone` works without a token; a token is only needed to PUSH. Fine-grained token for the Geriatric-Park repo only, Permissions: Contents + Workflows = Read and write. A 403 "permission denied" means the token lacks write access; "Invalid username or token" means it is mistyped/expired. Push with `git remote set-url origin https://x-access-token:TOKEN@github.com/RTman84/Geriatric-Park.git`, push, then immediately reset origin to the plain URL. Tell the user to delete every token after use (several have been pasted in chat more than once).
- Always run `npx tsc --noEmit` and `npm run build` (vite does NOT typecheck, so a green build can hide type errors) before calling anything done.
- User is non-technical: exact click paths, SQL pasted in full for Supabase, one screenshot request at a time. ALWAYS give a check query after each migration. A migration silently failed to apply once (011), and a stale schema cache caused misleading "column does not exist" errors; `notify pgrst, 'reload schema';` fixes the cache.
- User wants usage conserved: small, fully finished, committed increments; say plainly when low on budget; write a carry-over doc before stopping. Sessions have hit the limit mid-task many times, so default to commit-and-push after each piece.
- Test patterns that worked (the /tmp scripts do NOT persist, recreate them): (1) server routes: bundle `api/x.ts` with `esbuild --bundle --platform=node --format=cjs --external:@supabase/supabase-js`, override `Module._resolveFilename` so `@supabase/supabase-js` resolves to a tiny in-memory query-builder mock (select/insert/update/upsert/delete/eq/or/in/limit/maybeSingle + `auth.getUser` keyed by fake token). Snapshot row objects before updating them (the mock returns live references; real Supabase returns copies). (2) client logic: bundle `constants.tsx` with esbuild (`--loader` for images as dataurl, external react) and call the pure functions from node. (3) headless smoke: `npx vite preview --port 4173` + playwright (`$(npm root -g)/playwright`, chromium in /opt/pw-browsers), block `/api/**` and CDNs, seed `localStorage['geriatric_park_v17_save']`, start the server and run the test in ONE bash call. It catches JS crashes, not layout.
- Sandbox cannot reach Vercel or Supabase and has no Android SDK. Unicode: when editing files with emoji or box-drawing characters, string replaces can silently not match; always grep to confirm a replace landed (this hid a real bug once).
- Before generating any art, present prompts and get explicit confirmation (user generates in Leonardo).
- Prefer targeted diffs; check `{ error }` on every Supabase call; untrusted-save rule (anything from a save/cloud/API must tolerate wrong types).

## Repo / deploy state
- Everything through commit `e03393e` (milestones) is on GitHub. Pushed in the final step of this session (see git log): roadmap currency draft, tutorial cards, Auto-Play benchmark fix, and this status doc. Verify with `git log origin/phase2/account-backend-foundation-clean`.
- Production URL still serves old `main`; all work lives on the phase2 branch + Vercel preview (`geriatric-park-1-git-phase2-account-backend-517cab-reisun-abel.vercel.app`). Merging phase2 to main is still not done.
- Supabase migrations applied by the user (confirmed): 001-004, 006, 007, 008 (arenas), 009 (raids), 010, 011, 012, 013, 015, 016. There is no 005; 014 was removed from the repo (single-throne draft, replaced by 015). Files in `supabase/migrations/`.

## Built this arc (since the 2026-10-01 status)
- Resident Exchange v2: owner-picked host gift (Materials / Quest progress / building output) paid on return, target chosen by the owner from the friend's synced quests/buildings (`player_profiles.active_quests`), host one-tap claim, both players see what each side gets, away Elders locked out and auto-return, Away & Visiting window, Squad Loan (host uses the Elder in Battle/Court only, one loan at a time).
- Only benched Elders can be sent out. Elders' away status keeps them off squads (parked at status 'Base' with `awayUntil`).
- Rarity: stat multipliers Common 1 / Rare 1.2 / Epic 1.45 / Legendary 1.8 (stats, HP, level-up growth), one-time migration (`rarityStatsV1`), Legendary wild spawns (3%).
- Wild Elders: pre-fight preview (level, rarity, power, risk label), power scaled to 60-150% of the player's best Elder, captured exactly as fought (level and stats kept), 8% chance of arriving with a gear piece. Scrap counts level only up to 25 (`SCRAP_LEVEL_CAP`) to stop a capture-scrap faucet.
- Gear upgrades: level caps by rarity 10/15/20/30, levels 1-5 unchanged (equipped gear needs no migration), late growth and cost scale with rarity.
- Progression curves: Golden Games and Challenge ladders reach 24,000 power at tier 100 (`PROGRESSION_MAX_POWER`); league unlocks use the player's own Elders only (loans can't skip tiers); Auto-Play benchmark follows the power bracket.
- Player battles: per-opponent 5-minute cooldown, 30 attacks/day soft cap (enforced in the Friends-list handler and Court Friend mode, a bug where it was UI-only was fixed), Find Opponents list (10 power brackets, opted-in players, ~5 near + up to 2 far, Refresh with 60s cooldown), battling opted-in non-friends allowed by the mail route.
- Court Ladders (`api/court.ts`, tables `court_ladder`, `court_attempts`, `court_honors`): top-10 ladder per bracket, challenge up to 3 ranks above, 3 challenges/day, spots lost after 7 days idle, top-3 daily Ticket purse (45 x (1 + 0.25 x (bracket-1)) x 1/0.6/0.4), permanent top-3 titles (`court:<bracket>:<place>`), verified server-side before other players can see them, Mailbox notice when displaced.
- Mode badges: 8 modes, Bronze/Silver/Gold/Platinum/Legend at 10/50/150/400/1000 lifetime counts (`modeStats`), earned-only titles/icons, progress list in the profile picker (not shown to others). Goals tab in Tasks: one-time milestone rewards per tier (`claimedMilestones`).
- Park Registry: sort (power/level/rarity/type/date/name), filters, grid view, base + green bonus stats (rarity/gear/evolution), Evolve button in the Park Hub, squad order controls (first Elder leads in battle), single-building popup, Tutorial cards refreshed.
- `ROADMAP.md` consolidates the plan; `ECONOMY.md` has a section for every system above.

## Verification owed (nothing below has been played live by the user)
- Two-account tests: visit with each gift type (claim + target), Squad Loan (borrower sees the Elder on Squad/Battle/Court), displaced-spot mail, ladder challenge between two real accounts, opponent list (needs several opted-in players).
- The user is NOT using his son's account for testing; he has no second account of his own right now.
- Leaderboard `/api/tournament-board` 504s from earlier were never confirmed fixed.
- Raid boss HP/damage caps were tuned against low squad power and have not been re-checked against the 24k curve.
- Ticket source/sink table (ECONOMY.md section 6) is not written.

## Decisions made by the user (standing)
- Real income only from ads + purchases; gameplay never pays PP or raises passive income; PP is the future real-USD currency and must never be sold directly.
- Quests split into repeatable (dailies/weeklies), one-time milestones/achievements for bragging rights and titles, and seasonal/event (not built).
- Titles/badges: players can only select what they have earned. Mode badges are cosmetic and private; Court titles are public and server-verified.
- Rarer is better in every way; Legendary best. Wild Elders are kept as found.
- Court Ladders: top 3 per bracket earn titles named for the bracket and the place; top 10 per bracket visible to players in that bracket.
- Wants more badges/titles/customization later, after the base game is complete.
- PvP/social shop with its own currency from all social and PvP modes (name undecided; themed on helping old people stay active, e.g. Liniment). Premium cash currency must be NEW (not Tickets), with real use and scarcity so buying beats free reinvesting (Atlas Earth conversion/Atlas Bucks idea); name undecided (Heirlooms/Golden Years/Silver Spoons drafted).
- Art: needs real art for all remaining emoji (about 85 distinct, 275 uses), icons, items and new categories (badges). Audit and priority order are in ROADMAP.md.

## Next up (suggested order)
1. Write the Ticket source/sink table; check Raid HP/damage vs the curve.
2. Get the user's PvP and premium currency names; design the PvP shop (items, caps) and build it.
3. Art: write Leonardo prompts per group for his approval (currency icons first), then wire art in place of emoji.
4. Seasonal/event quests, more titles/icons/frames.
5. Cash shop only after the free game and PvP shop are balanced, with a Google Play policy/legal review (Bingo chance mechanics + PP payout plan).
6. Launch track: USA-only, rewarded-ad network + server verification, Play Console, release signing, native Google sign-in, Android back button, bundle Tailwind locally, crash monitoring, rotate SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY (confirm old leaked Gemini key revoked), merge phase2 to main, legal review before any real payout.

## Standing rules (all carried over)
- PP only from the ad-view player share and reserve-capped Dividend/Cash Out. Everything else pays Tickets/XP/Stars/Materials.
- Currency wording is virtual-only (PP, Tickets, Building Materials); never `$`/real-money wording.
- No real-money payouts until a compliant backend + legal review exist.
- Building, Arena, Raid, ladder and exchange benefits: Tickets/Materials/XP/cosmetics only; never PP or passive income.
- Any new reward needs a matching sink or a daily/attempt cap; record it in ECONOMY.md.
- Always check `{ error }` on every Supabase call; untrusted-save rule everywhere.
- Prefer targeted diffs; commit and push in small, fully-tested increments.
