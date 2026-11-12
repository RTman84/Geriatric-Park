-- Per-mode leaderboards: one row per player, mode and period (a week, or 'all' for all-time). Browser has no direct access.
create table if not exists public.board_scores (
  user_id uuid not null,
  mode text not null check (mode in ('golden', 'arena', 'raid', 'friend')),
  period text not null,                 -- 'all' or an ISO-style week like 2026-W41 (UTC)
  bracket int not null default 1,       -- squad-power bracket (1-10), set by the SERVER from player_profiles.squad_power
  display_name text not null default 'Park Visitor',
  score bigint not null default 0 check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode, period)
);
create index if not exists board_scores_rank_idx on public.board_scores (mode, period, bracket, score desc);
alter table public.board_scores enable row level security;
revoke all on public.board_scores from anon, authenticated;
notify pgrst, 'reload schema';
