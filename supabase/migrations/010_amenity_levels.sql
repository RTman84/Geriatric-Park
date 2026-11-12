-- Friend's park showed every building at "Lv 1" regardless of real level, because
-- player_profiles never tracked per-amenity levels, only which ones were built.
alter table player_profiles
  add column if not exists amenity_levels jsonb not null default '{}'::jsonb;

-- Resident Exchange: leave one of your Elders in a friend's park for a chosen duration to earn
-- Elder XP. One active placement per Elder (unique index below); recall pays XP based on elapsed
-- time capped at the chosen duration, so an early recall is still worthwhile but not a full farm.
create table if not exists public.resident_exchange (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  elder_id text not null,
  elder_name text not null,
  elder_type text not null,
  elder_evolution_stage smallint not null default 0,
  duration_hours smallint not null,
  placed_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint no_self_exchange check (owner_id <> host_id)
);
-- One active placement per Elder -- the row is deleted on recall, so this can't block a later, new one.
create unique index if not exists resident_exchange_owner_elder_idx on public.resident_exchange (owner_id, elder_id);
create index if not exists resident_exchange_host_idx on public.resident_exchange (host_id);
alter table public.resident_exchange enable row level security;
-- No direct client policies -- everything goes through the API with the service role, same as mail_inbox/arenas.

-- New mail kind: a courtesy reward paid to the HOST the moment someone places an Elder in their
-- park (not tied to any later action from the host). The owner's own XP reward is NOT mail -- it's
-- elder-specific, so it's applied directly by the client from the recall API's response instead.
alter table public.mail_inbox drop constraint if exists mail_inbox_kind_check;
alter table public.mail_inbox
  add constraint mail_inbox_kind_check check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result', 'resident_exchange_host'));
