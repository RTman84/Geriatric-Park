-- Geriatric Park: Arenas (gyms) -- factions, stationed defenders, attack limits, Arena mail.
-- See ARENA_DESIGN.md. Run this in the Supabase SQL Editor BEFORE testing Arenas.
-- Same principle as migrations 002-007: every table is reachable only through api/arena.ts
-- (service role). RLS is on and nothing is granted to anon/authenticated.

-- 1. Faction lives on the player profile (validated by the API; one change per 30 days).
alter table public.player_profiles
  add column if not exists faction text,
  add column if not exists faction_changed_at timestamptz;
alter table public.player_profiles drop constraint if exists player_profiles_faction_check;
alter table public.player_profiles
  add constraint player_profiles_faction_check
  check (faction is null or faction in ('early_birds', 'night_owls', 'sunday_drivers'));

-- 2. Mailbox: allow Arena notices. The two old constraints only knew about Friend Battle.
alter table public.mail_inbox drop constraint if exists no_self_mail;
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.mail_inbox'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%friend_battle%'
  loop
    execute format('alter table public.mail_inbox drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.mail_inbox
  add constraint mail_inbox_kind_check check (kind in ('friend_battle', 'arena_knockout', 'arena_dues'));
-- Self-mail is only allowed for Arena Dues (the "sender" is the player themselves).
alter table public.mail_inbox
  add constraint no_self_mail check (kind <> 'friend_battle' or recipient_id <> sender_id);
alter table public.mail_inbox add column if not exists note text;

-- 3. Arena state (rows are created lazily the first time someone interacts with an Arena).
-- Arena locations themselves are NOT stored: they come from the shared seeded world grid.
create table if not exists public.arena_state (
  arena_id text primary key check (arena_id ~ '^a_-?[0-9]{1,7}_-?[0-9]{1,7}$'),
  faction text check (faction is null or faction in ('early_birds', 'night_owls', 'sunday_drivers')),
  claimed_at timestamptz,
  priority_faction text check (priority_faction is null or priority_faction in ('early_birds', 'night_owls', 'sunday_drivers')),
  priority_until timestamptz,
  shield_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_defenders (
  id uuid primary key default gen_random_uuid(),
  arena_id text not null references public.arena_state(arena_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  faction text not null check (faction in ('early_birds', 'night_owls', 'sunday_drivers')),
  elder jsonb not null,
  power integer not null check (power >= 0),
  placed_at timestamptz not null default now(),
  dues_from timestamptz not null default now(),
  unique (arena_id, user_id)
);
create index if not exists arena_defenders_user_idx on public.arena_defenders (user_id);
create index if not exists arena_defenders_arena_idx on public.arena_defenders (arena_id, placed_at);

-- Per-player daily counters (attacks, rewarded wins, dues claimed).
create table if not exists public.arena_player_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  attacks integer not null default 0 check (attacks >= 0),
  wins integer not null default 0 check (wins >= 0),
  dues_claimed boolean not null default false,
  primary key (user_id, day)
);

-- Per-player, per-Arena attack cooldown.
create table if not exists public.arena_player_arena (
  user_id uuid not null references auth.users(id) on delete cascade,
  arena_id text not null,
  last_attack_at timestamptz not null default now(),
  primary key (user_id, arena_id)
);

alter table public.arena_state enable row level security;
alter table public.arena_defenders enable row level security;
alter table public.arena_player_daily enable row level security;
alter table public.arena_player_arena enable row level security;
revoke all on public.arena_state from anon, authenticated;
revoke all on public.arena_defenders from anon, authenticated;
revoke all on public.arena_player_daily from anon, authenticated;
revoke all on public.arena_player_arena from anon, authenticated;
