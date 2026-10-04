-- Bracket ladders: each power bracket (1-10) has a top-10 Grand Shuffle Court ladder. Ranks 1-3 earn titles.
-- Replaces the single-throne table from the earlier draft (dropped here; harmless if it never existed).
drop table if exists public.court_thrones;
create table if not exists public.court_ladder (
  bracket int not null check (bracket between 1 and 10),
  rank int not null check (rank between 1 and 10),
  user_id uuid not null,
  display_name text,
  power int not null default 0,
  joined_at timestamptz not null default now(),
  last_active timestamptz not null default now(),
  purse_day date,
  primary key (bracket, rank)
);
create table if not exists public.court_attempts (
  user_id uuid not null,
  day date not null,
  attempts int not null default 0,
  primary key (user_id, day)
);
alter table public.court_ladder enable row level security;
alter table public.court_attempts enable row level security;
revoke all on public.court_ladder from anon, authenticated;
revoke all on public.court_attempts from anon, authenticated;
notify pgrst, 'reload schema';
