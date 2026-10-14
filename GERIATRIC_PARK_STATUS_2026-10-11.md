# Geriatric Park - STATUS (as of 2026-10-11)
Paste this whole file as the first message in a new chat. Repo: `RTman84/Geriatric-Park`. Branch: `phase2/account-backend-foundation-clean` (only active branch). **GitHub head `badc833` (plus this doc), everything pushed.** Supersedes `GERIATRIC_PARK_STATUS_2026-10-09.md`; the efficiency rules, owner steps, decisions and standing rules in the 10-08 and 10-09 docs still apply unchanged. Newest `ECONOMY.md` sections: 6zd to 6zg. Art prompts: `ART_PROMPTS.md`.

## Supabase migrations: ALL applied by the owner (001-004, 006-013, 015-029)
New this session: 024 raid tiers, 025 find players (everyone listed by default), 026 Gold Pass (`memento_events` kind 'pass'), 027 friend-request mail kind, 028 set bonuses (`arena_bonus_pct`, `raid_bonus_pct`), 029 `max_elder_power`.

## Built this session (all on GitHub)
- **Raids:** tiers 1-5 (tier 4 Epic, tier 5 Legendary events only, 35% of raids during seasonal events). Damage per hit = boss HP x tier cap (50/25/12/9/5%) x min(1, (squad power / saturation)^0.65), saturation 1,500/5,000/16,000/24,000/24,000, so power matters up to each tier's point; tiers 1-3 can be soloed by strong enough squads (T1 by everyone, T2 from bracket 4, T3 bracket 9+), tiers 4-5 cannot. Per-tier rewards (Tickets 10/15/25/40/60, Materials, defeat bonus), partial credit when a boss survives. 10 bosses with art (all done). 10 rewarded raids/day (was 3). 11 daily windows (was 3), chance 18%, Arena density 60%.
- **Freedom/economy:** Arena 10 free attacks/day, 5 min cooldown, 40/day cap; Friend Battle 60 attacks/day, 10 rewarded wins/day; TV Dinners daily cap 180, per-win rewards raised (Friend 5, Arena 6, Court 6, Raid hit 3/4/5/7/10 by tier).
- **Art wired in:** 6 + 4 raid bosses, 3 faction emblems (Gfx/constants `art` fields). Currency names on hover/tap in both header strips; PP icon beside PP amounts everywhere.
- **Social:** Find Players (name search, always-open Refresh, default-visible with a hide switch, 30 pending-request cap); friend requests arrive in the Mailbox with Accept/Decline (`friend_request` mail kind, api/friends.ts inserts it).
- **Titles:** each shows how it was earned (`cosmeticGoal`). Tutorial now above the map (z-index + map isolation). Theme-proof rarity cards (`rarityCardStyle`). Park Hub gear inventory sort; shared Elder sort (registry saves it, all Elder pickers follow it).
- **Elder Pass v2:** global 30-day seasons from 2026-10-01 (`currentSeasonWindow`), 30 ranks x 800 XP, Pass XP automatically from all modes (daily play cap 500), free lane + titles at 10/20/30, Gold Pass 550 Mementos (about $5, server-priced in `api/mementos.ts`, one per season) with a second lane and 6 Gold titles/icons.
- **Elder stats fixed:** ONE formula (`canonicalElderStats`): standard(level, rarity) x evolution multipliers + equipped gear. One-time migration `eldersCanonicalV1` reset every saved Elder (old numbers kept in `preCanonical`); wild Elders now follow the formula for their level/rarity; evolving and levelling follow it. Example: Lv71 Legendary stage 2 went from 7,262 to about 3,840 power. If that nerf is too harsh, add a flat per-stage evolution bonus instead.
- **Gear sets:** Clubhouse Champion (Arena) and Boss Buster (Raid), 4 pieces each, drops 10% per defender beaten / 6% per raid hit, max 3 per mode per day; 2 pieces +4% Arena / +5% raid damage, 4 pieces +10% / +12%. Bonuses computed from the synced save (`api/account/save.ts`) and applied in `api/arena.ts` (clamped). Stationing limit uses the strongest Elder OR the squad total.
- **Art prep:** `ART_PROMPTS.md` has 24 sheets with layouts and priorities (P1 medals/glyphs/ranks/gear/pass/events, P2 keepsakes, P3 60 antiques).

## Verification owed (nothing below has been played live)
Friend request Mailbox Accept/Decline (two accounts); Find Players search and hide switch; Gold Pass purchase and auto-claims; Pass screen layout and season rollover at 2026-10-31; Elder stats after the migration (check a few Elders in the Park Registry, and squad power/bracket changes); wild Elder fights and captures matching their level; Arena/Raid set drops, the Gear Sets card and server-side bonuses; stationing an Elder stronger than the squad; raid availability with the new windows; tutorial layer on top of the map; rarity borders in the Park Hub inventory.

## Decisions to remember (standing)
- Gold Pass is cosmetic/convenience only (never power, passive income or PP), priced in Mementos only (PP can be converted to Mementos one way). Pass XP comes moderately from all modes, nothing required.
- Friend requests go to the Mailbox; Find Players lists everyone online or not, with a hide switch.
- Arena/Raid gear bonuses apply only in their own mode and never touch PP or passive income.
- Raids should be common enough that most players can catch one; every player should have a clearable tier.

## Open / next
1. Art: generate sheets from `ART_PROMPTS.md` (start with S01-S04, S07-S08), then wire in place of emoji (sets S08 replace placeholder emoji).
2. Review Ticket economy: free Pass lane pays about 5,150 Tickets per season at rank 30; also check PvP shop prices against the higher TV Dinner income.
3. Decide whether the Elder stat reset needs an evolution bonus to soften the drop for high-level Elders.
4. Not built: Resident Exchange host standing preference, Friend Battle pass, Court Ladder extra challenges, Mementos Elder Pass track, ad-free option, Alliance/Clan, 3D avatars, Steam.
5. Launch track unchanged (see the 10-08 doc): first Android build in Actions, native Google sign-in, back button, bundle Tailwind, Play Console steps, server-authoritative economy, merge phase2 to main, rotate keys, legal review before any real payout.

## Art wired in after this doc was first written (commit 00ab0c4)
- Sheets S01-S03 done: 6 rank medals (replace rank emoji in header, picker, profile preview, friends list), 8 mode glyphs, 5 tier frames. Mode badges are pre-composited glyph-on-frame webp files (40) in `game-assets/badges/`, mapped in `badgeArt.ts` (explicit imports; constants.tsx stays esbuild-testable). `RANK_TIERS[].art`, `modeBadgeArt(mode, tier)`, `modeGlyphArt(mode)` in constants. Picker shows all 5 tier medals per mode (unearned dimmed). Icon boxes use object-contain so ribbons are not cropped.
- Still emoji: Court place medals / Boards honors (S04), gear sets (S07-S08), pass/event art, keepsakes, antiques, remaining sweep.
- Source cutting scripts were in /tmp (not persisted): flood-fill white background from edges, label components, sort by rows then columns, composite glyph (62% of frame width, centered 40% down) on frame.

## Friend park roster (migration 030, `park_elders`)
Friend parks only showed the friend's 3 Featured Folks (`favorite_elders`). New column `player_profiles.park_elders` (up to 30 captured, home, highest level first; synced in `api/account/save.ts`, returned by `api/friends.ts`) now feeds the friend's ParkScene wanderers (falls back to Featured if empty). RUN migration 030 BEFORE the deploy goes live: the friends route and profile sync both name the column. A friend's roster appears after their next save/autosave.

## Wild Elder level cap
`wildElderLevel` (constants.tsx) now sets wild levels: capped at your top Elder + 10, centred between your top level and top-6 average. See ECONOMY.md "Wild Elder levels". Needs a live check that fights feel right (new players still meet level-1 wilds).

## Friend park roster: RESOLVED
Friends' Elders now show when visiting (migration 030 applied, confirmed by the user 2026-10-13).

## Wild level boost
`wildElderLevel` adds up to +3 / +2 / +1 extra levels while the player's best Elder is below level 10 / 20 / 30 (Elder levels only, never account level), still inside the +10 cap.

## Android Back button (launch-track item, done)
`services/backButton.ts` (loads `@capacitor/app` only on native) + a handler in App.tsx: Back closes the top-most overlay, then returns to the map from any other tab, then "Press Back again to exit" (second press within 2 s exits). Ignored during a fight, an ad or a random event. Logic unit-tested with fake plugins; NOT yet tried on a device. The Actions build runs `npx cap sync android`, which registers the new plugin in the Android project (building locally needs `npx cap sync android` first). Panels with their own internal sub-views (e.g. an expanded friend row) close whole on Back for now.

## Tailwind + fonts bundled locally (2026-10-13)
Tailwind CDN script removed: Tailwind 3.4 is now a build-time dependency (`tailwind.config.js`, `postcss.config.js`, `index.css` imported in `index.tsx`). Fredoka comes from `@fontsource/fredoka` (latin 300-700). Removed the dead importmap, the Google Fonts link and the duplicate unpkg Leaflet CSS link. The app now renders fully with no network except the web-only AdSense script (stripped from native builds). Verified with headless screenshots (starter screen, map, Park) with all external requests blocked. New Tailwind classes must appear literally in the source (no `text-${color}-500` style building); content globs cover ./*.tsx, components/, services/.

## Evolution bonus scales with levels (2026-10-13)
See ECONOMY.md "Evolution bonus that grows with levels". Evolved Elders' stored stats refresh when account level or Elder level/stage changes. Not yet played live: check an evolved Elder's stats before and after a player level-up.

## Native Google sign-in for the Android app (2026-10-14)
`services/nativeAuth.ts` (return link `com.geriatricpark.game://auth-callback`, `parseAuthCallback`) + `startGoogleSignIn` / `startNativeAuthListener` in `services/authService.ts`: on native, Google opens in Chrome Custom Tabs (`@capacitor/browser`) with PKCE (`flowType: 'pkce'` on native only; web stays implicit), and the `appUrlOpen` / launch-URL listener exchanges the code. Magic link and sign-up confirmation use the same return link. Manifest has the matching intent-filter. Logic tested with fake plugins (good code, cold start, error, cancelled, unrelated links ignored, web unchanged); NOT tried on a device. OWNER STEP: add `com.geriatricpark.game://auth-callback` to Supabase -> Authentication -> URL Configuration -> Redirect URLs (details in ANDROID_SETUP.md).

## AdMob ids wired in (2026-10-14)
Owner created the AdMob app + rewarded unit: App ID `ca-app-pub-4749065898882415~7060559259` (manifest), unit `ca-app-pub-4749065898882415/9578911384` (`.env.native`). Real unit only used when `VITE_ADMOB_PRODUCTION=true` (`npm run build:native:release`); all other builds use Google's test ad (`services/rewardedAds.ts`). `public/app-ads.txt` added (publisher pub-4749065898882415). Owner also added `com.geriatricpark.game://auth-callback` to Supabase Redirect URLs. Pending: AdMob payments profile, SSV callback URL (needs production domain), release workflow, Play Console ad disclosures, first Android build run in Actions (push to phase2 triggers it).

## Account deletion + privacy pages (2026-10-14)
FOUND: the app had NO account deletion (Google Play requires in-app deletion + a web URL) and `privacy-policy.html` was outside `public/` so it was NOT in the Vite build (the privacy URL would 404 / fall back to the app after the merge to main). The old policy also claimed all data stays local, no accounts, AdSense only.
DONE: `api/account/delete.ts` (POST, Bearer token, body `{confirm:'DELETE'}`; deletes court_ladder/attempts/honors, board_scores, memento_events; ANONYMIZES purchases, ad_views, ledger_entries to the all-zero uuid; then `auth.admin.deleteUser` which cascades the rest; stops before the auth delete if any step fails). Tested with an in-memory fake (auth errors, wrong confirm, mid-way failure, success, other users untouched). In-app: Settings -> "Account & Display Name" -> Delete account (type DELETE). `skipSavesRef` stops the save-on-close handlers from re-writing the local save during delete AND the existing "Reset local data" button. `public/privacy-policy.html` rewritten to match the real app; `public/delete-account.html` added. `PLAY_CONSOLE_ANSWERS.md` = draft Data safety / content rating / declarations. New tables that hold per-user rows must be added to api/account/delete.ts (the cascade covers tables with a foreign key to auth.users).
DECISIONS TO CONFIRM with the owner: email deletion requests are promised "within 30 days"; financial records are kept anonymized (not deleted); Play closed-test rule (12 testers, 14 days) applies if the developer account is personal.

## Owner step reminder
Delete the GitHub token that was pasted in chat (Settings, Developer settings, Fine-grained tokens). A new token is needed for the next push.
