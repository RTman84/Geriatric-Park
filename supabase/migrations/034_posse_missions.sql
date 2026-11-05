-- Posse missions: weekly shared goals, leader-featured picks, member requests, and per-member reward tracking.
-- Same model as 031-033: RLS on, no grants, all access through api/posse.ts (service role).

-- Posse-wide counters per week and action kind (raid_hit, boss_down, arena_win, pvp_win, dues).
create table if not exists public.posse_week_stats (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  kind text not null,
  count integer not null default 0 check (count >= 0),
  primary key (posse_id, week_start, kind)
);

-- Leader/co-lead featured mission ids for a week (comma-separated, 3 ids). Without a row the default set is used.
create table if not exists public.posse_featured (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  mission_ids text not null,
  primary key (posse_id, week_start)
);

-- One request per member per week for the mission they would like featured.
create table if not exists public.posse_mission_votes (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  primary key (posse_id, week_start, user_id)
);

-- Which members were already paid for which completed mission (idempotent payouts).
create table if not exists public.posse_mission_paid (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  mission_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  paid_at timestamptz not null default now(),
  primary key (posse_id, week_start, mission_id, user_id)
);

alter table public.posse_week_stats enable row level security;
alter table public.posse_featured enable row level security;
alter table public.posse_mission_votes enable row level security;
alter table public.posse_mission_paid enable row level security;
revoke all on public.posse_week_stats, public.posse_featured, public.posse_mission_votes, public.posse_mission_paid from anon, authenticated;
notify pgrst, 'reload schema';
-- CHECK (should return 4): select count(*) from information_schema.tables where table_schema='public' and table_name in ('posse_week_stats','posse_featured','posse_mission_votes','posse_mission_paid');
