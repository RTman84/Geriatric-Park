-- Posse competitions: weekly Race, 4-week Cup, Faction War, and the personal Standing track.
-- RLS on, no grants; everything goes through api/posse.ts (service role), like 031-034.

-- A member's points for a finished week (written when their live week counter rolls over).
create table if not exists public.posse_member_weeks (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  posse_id uuid references public.posses(id) on delete set null,
  points integer not null default 0 check (points >= 0),
  primary key (user_id, week_start)
);
-- Each Posse's score for a finished week (points per active member), used for the Cup totals.
create table if not exists public.posse_race_scores (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  points integer not null default 0,
  active integer not null default 0,
  score numeric not null default 0,
  primary key (posse_id, week_start)
);
-- One row per settled week: the lock that keeps settlement (and its rewards) from running twice.
create table if not exists public.posse_settlements (
  week_start date primary key,
  settled_at timestamptz not null default now()
);
-- Results: kind race | cup | faction. For faction, bracket 0, place 1 and note holds the winning faction.
create table if not exists public.posse_results (
  kind text not null check (kind in ('race', 'cup', 'faction')),
  period text not null,
  bracket integer not null default 0,
  place integer not null,
  posse_id uuid references public.posses(id) on delete set null,
  score numeric not null default 0,
  note text,
  primary key (kind, period, bracket, place)
);
-- Personal Standing track: which ranks were already paid for which season.
create table if not exists public.posse_standing_paid (
  user_id uuid not null references auth.users(id) on delete cascade,
  season integer not null,
  rank integer not null,
  paid_at timestamptz not null default now(),
  primary key (user_id, season, rank)
);
alter table public.posse_member_weeks enable row level security;
alter table public.posse_race_scores enable row level security;
alter table public.posse_settlements enable row level security;
alter table public.posse_results enable row level security;
alter table public.posse_standing_paid enable row level security;
revoke all on public.posse_member_weeks, public.posse_race_scores, public.posse_settlements, public.posse_results, public.posse_standing_paid from anon, authenticated;
notify pgrst, 'reload schema';
-- CHECK (should return 5): select count(*) from information_schema.tables where table_schema='public' and table_name in ('posse_member_weeks','posse_race_scores','posse_settlements','posse_results','posse_standing_paid');
