-- Geriatric Park: Social Features Phase 2 -- friend codes, friend requests, and
-- a lightweight public profile snapshot so a friend's Social Profile can be
-- viewed without requiring them to be online at the same time.
--
-- Same principle as migrations 002/003: these tables are written and read
-- exclusively through api/friends.ts and the profile-snapshot upsert in
-- api/account/save.ts, both using the service role key. No grants are given
-- to anon/authenticated, so there is no direct client path to any of this.

-- One row per player, updated automatically on every cloud save (see
-- api/account/save.ts). Stores exactly the fields needed to render another
-- player's Social Profile card client-side (name/title/icon resolution and
-- Featured Folks rendering both happen in the client using the same
-- resolveProfileDisplay()/ElderAvatarImg logic as the player's own profile --
-- this table only needs to carry the raw selections, not pre-rendered output).
create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_code text not null unique check (char_length(friend_code) = 8),
  display_name text,
  level integer not null default 1 check (level >= 1),
  selected_title text,
  selected_account_icon text,
  achievements_completed integer not null default 0,
  achievements_total integer not null default 0,
  squad_power integer not null default 0 check (squad_power >= 0),
  -- Up to 3 { type, evolutionStage, name } snapshots, not full Elder objects --
  -- just enough for ElderAvatarImg to render the same art the owner sees.
  favorite_elders jsonb not null default '[]'::jsonb check (jsonb_array_length(favorite_elders) <= 3),
  -- Opt-in only, off by default: whether this player can be paired via the
  -- "Find a Random Friend" action. A player never becomes randomly
  -- discoverable without explicitly turning this on in Settings.
  open_to_random_friends boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists player_profiles_friend_code_idx on public.player_profiles (friend_code);
create index if not exists player_profiles_random_eligible_idx on public.player_profiles (user_id) where open_to_random_friends = true;

-- Bidirectional friendship is modeled as two rows once accepted (one per
-- direction) rather than a single row with an ORDER-dependent pair, so a
-- simple "select friends where user_id = me" works without a UNION.
-- 'pending' rows only ever have the requester->addressee direction.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friend_request check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists friend_requests_addressee_status_idx on public.friend_requests (addressee_id, status);
create index if not exists friend_requests_requester_status_idx on public.friend_requests (requester_id, status);

alter table public.player_profiles enable row level security;
alter table public.friend_requests enable row level security;

-- No policies are created: with RLS enabled and zero grants to anon/authenticated,
-- both tables are reachable only via the service role used server-side.
