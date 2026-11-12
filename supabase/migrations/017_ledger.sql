-- Server-side ledger, step 1 ("shadow mode"): records every rewarded-ad view the SERVER could verify (Google AdMob
-- server-side verification), and an append-only list of the PP / reserve / development entries each one produced.
-- The game's local PP is not derived from this yet; /api/ledger exposes the verified totals so the two can be compared
-- before the client is switched over. Browser has NO direct access (same pattern as mail_inbox).

create table if not exists public.ad_views (
  nonce uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null default (now() at time zone 'utc')::date,
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired')),
  transaction_id text unique,            -- Google's id for the reward; unique = replay protection
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists ad_views_user_day_idx on public.ad_views (user_id, day);

create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  account text not null check (account in ('player_pp', 'community_reserve', 'development')),
  amount numeric(18, 8) not null check (amount >= 0),
  source text not null,                  -- e.g. 'ad_view'
  ref text not null,                     -- the ad_views.transaction_id this came from
  assumed_revenue_usd numeric(18, 8) not null default 0,
  created_at timestamptz not null default now(),
  unique (source, ref, account)          -- idempotency: the same reward can never be booked twice
);
create index if not exists ledger_entries_user_idx on public.ledger_entries (user_id, account);

-- Append-only: no edits, no deletes (not even by the service role) once an entry is written.
create or replace function public.ledger_entries_immutable() returns trigger language plpgsql as $$
begin raise exception 'ledger_entries is append-only'; end $$;
drop trigger if exists ledger_entries_no_update on public.ledger_entries;
create trigger ledger_entries_no_update before update or delete on public.ledger_entries
  for each row execute function public.ledger_entries_immutable();

alter table public.ad_views enable row level security;
alter table public.ledger_entries enable row level security;
revoke all on public.ad_views from anon, authenticated;
revoke all on public.ledger_entries from anon, authenticated;
notify pgrst, 'reload schema';
