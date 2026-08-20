-- Geriatric Park Phase 2 account foundation
-- Safe to run once per Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  country text not null default 'US' check (country = 'US'),
  age_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  client_revision bigint not null default 0 check (client_revision >= 0),
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_event_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 100),
  client_nonce text not null check (char_length(client_nonce) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_nonce)
);

create index if not exists player_event_intents_user_created_idx
  on public.player_event_intents (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists game_saves_set_updated_at on public.game_saves;
create trigger game_saves_set_updated_at
before update on public.game_saves
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.player_event_intents enable row level security;

-- Re-runnable policies: remove only the policies owned by this migration.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists game_saves_select_own on public.game_saves;
drop policy if exists game_saves_insert_own on public.game_saves;
drop policy if exists game_saves_update_own on public.game_saves;
drop policy if exists player_events_select_own on public.player_event_intents;
drop policy if exists player_events_insert_own on public.player_event_intents;

create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy game_saves_select_own
on public.game_saves for select
to authenticated
using (user_id = auth.uid());

create policy game_saves_insert_own
on public.game_saves for insert
to authenticated
with check (user_id = auth.uid());

create policy game_saves_update_own
on public.game_saves for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy player_events_select_own
on public.player_event_intents for select
to authenticated
using (user_id = auth.uid());

create policy player_events_insert_own
on public.player_event_intents for insert
to authenticated
with check (user_id = auth.uid());

-- No DELETE policies are granted to client roles.
-- No client UPDATE policy is granted to event intents.
-- Future authoritative reward/economy tables should be server-controlled.
