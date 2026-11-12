# Posse ("The Old Gang") and Chat plan (2026-10-27, GP app / account B) - tracker item W4.3 step 1
Status: PLAN ONLY, nothing built. Owner priority: implement, not just remember. Build order is at the bottom. Everything below plugs into code that already exists (checked 2026-10-27).

## 1. What already exists that we reuse
- **Factions:** `player_profiles.faction` (migration 008, three factions, 30-day switch lock, `faction_changed_at`). A Posse is locked to ONE faction, so membership checks read this column.
- **Friends:** `api/friends.ts` (friend codes, requests, `PROFILE_FIELDS`), friend request rows delivered to the Mailbox.
- **Mailbox:** `mail_inbox` with a `kind` check constraint that each migration widens (027 is the current list: friend_battle, arena_knockout, arena_dues, raid_result, resident_exchange_host, court_displaced, board_reward, friend_request). Posse and chat add kinds the same way.
- **Weekly boards:** `api/boards.ts` + lazy idempotent weekly settlement (`board_settlements`) is the pattern for Posse weekly points and rewards.
- **Account deletion:** `api/account/delete.ts` keeps a `DELETE_TABLES` list (court_ladder, court_attempts, court_honors, board_scores, memento_events). Every new per-player table below must be added there.
- **Every `api/*.ts` route is self-contained edge runtime** (no shared helper files), so the word filter below is duplicated inside `api/posse.ts` and `api/chat.ts`.
- There is NO name/word filter anywhere today (display names included). That is a gap to close before Posse names or any chat ships.

## 2. Posse rules (from the owner, 2026-10-20 and 10-27)
- A player creates a Posse and picks one faction; every member must be in that faction. Leaving the faction (30-day lock applies) means leaving the Posse. Size 20 at first. Roles: Owner, up to 2 Co-leads, Members.
- Join by friend code or request; no public free-text recruiting post at launch.
- Name 3-20 characters and a 2-4 letter tag, both through the word filter; banner chosen from preset emblems (no custom images, no free-text bio).
- All Posse rewards are Tickets / Materials / TV Dinners / XP / cosmetics. **Never PP/Pension Fund, never passive income.**

## 3. Data model (migrations 031 and 032, numbers are free: 031 was NOT used)
031 `posses`: id uuid pk, name text unique (case-insensitive), tag text, faction text (same check as profiles), emblem text, owner_id uuid, created_at, member_count int default 1, deleted_at null.
031 `posse_members`: posse_id, user_id (unique: a player is in at most one Posse), role text check (owner|co|member), joined_at, week_points int default 0.
031 `posse_invites`: id, posse_id, to_user_id, from_user_id, created_at, expires_at, status (pending|accepted|declined|cancelled); unique (posse_id, to_user_id) while pending.
031 `posse_week_points`: posse_id, week_start date, points int, settled bool default false; pk (posse_id, week_start).
031 `posse_daily`: user_id, day, points_added int (per-member daily cap so alt accounts cannot farm).
031 widens `mail_inbox.kind` with `posse_invite`, `posse_reward`, `quick_chat`.
032 `chat_blocks`: blocker_id, blocked_id, created_at, pk both; `chat_reports`: id, reporter_id, reported_id, kind, message_text, created_at, handled bool.
RLS on, no direct browser access; everything through `api/posse.ts` and `api/chat.ts` with the service role (same pattern as `mail_inbox`).
**Delete list:** add `posse_members`, `posse_invites`, `posse_daily`, `chat_blocks`, `chat_reports` to `DELETE_TABLES`; on account deletion an Owner promotes the first Co-lead, else the oldest member, else the Posse is soft-deleted.

## 4. API (`api/posse.ts`, edge, one POST with an `action`, GET for info)
`create` (checks faction, name filter, not already in a Posse, daily create limit) / `info` (own Posse: roster with level, power, title, week points) / `invite` (friend code) / `respond` (accept or decline) / `leave` / `kick` / `promote` / `demote` / `transfer_owner` / `settle` (lazy, called on any read after the week ends, idempotent) / `search_by_tag` (exact tag only, no browse list at launch).
Server rules: every check reads server values (profile faction, existing membership); one action per request; rate limits per user; messages go to the Mailbox so offline members see them.

## 5. What a Posse does (weekly, server-counted)
- **Posse Points:** each member action already counted server-side adds points to their `week_points`: Arena win +2, Raid hit +3, Friend/Court battle win +1, Resident Exchange hosted +1. Per-member cap 40/day. Totals roll into `posse_week_points`.
- **Weekly Posse Goal:** a shared target scaled to member count (for example 10 points per member); reaching it pays EVERY member a capped Mailbox reward (Tickets + Materials + TV Dinners), paid once per week by the lazy settlement.
- **Leaderboards:** top Posses per faction and overall, weekly, using the same bracket-free total (small Posses are not punished: board shows points per member too). Top 3 per faction get a cosmetic Posse title for the week.
- **Faction war (later):** sum of Posse Points per faction each week, winning faction gets a banner on the map for the next week. Not in the first release.
- **Optional later perk:** a small Arena dues bonus for stationed Posse members (needs the owner's call, touches the Arena economy).

## 6. Chat in three phases (Google Play user-generated-content rules drive the order)
Play requires, for any player-to-player text: a content filter, in-app report and block, and ongoing moderation; it also raises the content rating and adds "Messages" to Data Safety and the privacy policy. The audience includes 13+ minors.
- **Phase A: Quick Chat (ship with the Posse).** A fixed list of friendly phrases and stickers sent through the Mailbox to a friend or the whole Posse. No free text, no moderation burden. Starting list (24): Nice game! / Good luck! / Rematch? / Great battle! / Thanks for visiting! / Come visit my park! / Join my raid! / Anyone up for an Arena? / I need a hand with the boss / Congrats! / Welcome to the Posse! / Good morning! / Good night! / Bingo! / Hang in there! / Well played! / See you tomorrow! / Thanks for the gift! / Happy holidays! / Let's go Posse! / Sorry, my bad / Nice park! / Need help leveling / Good to see you! Plus 8 sticker art pieces (needs art from GP app 2). Limits: 20 sends/day, 1 per recipient per minute, mute/block works on it too.
- **Phase B: filtered friends-and-Posse text (after launch, only if wanted).** Asynchronous messages through the Mailbox (no real-time), friends and Posse only, 120 characters, server-side filter (list + leetspeak/spacing normalization, slurs, links, emails and phone numbers blocked), Report (copies the message and context into `chat_reports`), Block/Mute per player, a remote kill switch (an env flag that turns text off without a release), privacy policy + Data Safety + content rating updates, and a way for the owner to review reports (a read-only admin page or a Supabase view). 3-4 sessions plus ongoing moderation time.
- **Never:** rooms, global chat, DMs to strangers, image or voice sharing.

## 7. Safety and policy checklist (before either chat phase ships)
Word filter for Posse and display names (new, shared logic duplicated in each route); Report and Block in the UI; kill switch; privacy policy and Play Data Safety updated for Posse membership, Quick Chat and (Phase B) message content; content rating questionnaire re-answered; age gate stays 13+; account deletion removes membership and chat data; Terms mention that messages may be reviewed. **Not legal advice; confirm with the Play policy text at submission time.**

## 8. UI screens
Posse tab (inside Social Profile or a button on the Friends screen): create flow (name, tag, emblem, faction shown read-only), roster with role badges and power, invite by friend code, weekly goal progress bar, leaderboard, leave/kick/promote sheets, Quick Chat picker (also on each friend row and Posse screen), Mailbox renderers for `posse_invite` (Accept/Decline), `posse_reward`, `quick_chat`.
**Art needed from GP app 2 (W7.7):** 6-9 Posse emblems, Posse header, 8 Quick Chat stickers.

## 9. Build order (one small pushed increment each; tests as in the tracker rules)
1. Shared word filter + apply it to display names (small, useful immediately). Pure-function tests.
2. Migration 031 + `api/posse.ts` create/info/invite/respond/leave with a fake-Supabase test (the 12-scenario pattern), add tables to `delete.ts`.
3. Posse screen UI (create, roster, invite, leave) + Mailbox `posse_invite` renderer.
4. Posse Points counting in `arena.ts` / `mail.ts` / `court.ts` (server-side hooks, daily cap) + weekly goal settlement + rewards via Mailbox + `ECONOMY.md` entry.
5. Quick Chat (Mailbox kind `quick_chat`, picker UI, stickers once art arrives), then Posse leaderboard.
6. Phase B text chat only after launch and only if still wanted.
Open questions are in the tracker (Q8 split is answered: GP app owns Posse and chat; GP app 2 supplies emblems/stickers).
