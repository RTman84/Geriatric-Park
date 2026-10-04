-- Bracket thrones: one reigning Grand Shuffle Court champion per power bracket (1-10).
create table if not exists public.court_thrones (
  bracket int primary key check (bracket between 1 and 10),
  user_id uuid not null,
  display_name text,
  power int not null default 0,
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  shield_until timestamptz,
  purse_claimed boolean not null default false
);
create table if not exists public.court_attempts (
  user_id uuid not null,
  day date not null,
  attempts int not null default 0,
  primary key (user_id, day)
);
alter table public.court_thrones enable row level security;
alter table public.court_attempts enable row level security;
revoke all on public.court_thrones from anon, authenticated;
revoke all on public.court_attempts from anon, authenticated;
notify pgrst, 'reload schema';
