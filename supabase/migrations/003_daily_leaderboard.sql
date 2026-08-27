-- Geriatric Park: real daily tournament leaderboard
-- Replaces the client-side simulated NPC leaderboard with actual player scores.
--
-- Server-controlled only, same principle as migration 002: this table is written
-- and read exclusively through api/leaderboard.ts using the service role key.
-- No grants are given to anon/authenticated, so there is no direct client path to
-- read or write scores — the API route enforces score validation and the
-- "only ever increases" rule server-side.

create table if not exists public.leaderboard_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_day date not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  score integer not null default 0 check (score >= 0 and score <= 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, tournament_day)
);

create index if not exists leaderboard_scores_day_score_idx
  on public.leaderboard_scores (tournament_day, score desc);

alter table public.leaderboard_scores enable row level security;

-- No policies are created: with RLS enabled and zero grants to anon/authenticated
-- (per migration 002's tightened default privileges), the table is reachable only
-- via the service role used server-side in api/leaderboard.ts.
