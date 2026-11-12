-- Geriatric Park: Arena Raids (Phase B). Run in the Supabase SQL Editor AFTER 008_arenas.sql.
-- Raid schedule/boss are computed from the shared world grid (no rows needed until the first hit);
-- these tables only hold the damage that players dealt and whether the raid has been settled.

create table if not exists public.arena_raids (
  raid_id text primary key check (char_length(raid_id) <= 64),
  arena_id text not null,
  tier integer not null check (tier between 1 and 3),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  boss_index integer not null check (boss_index between 0 and 5),
  max_hp bigint not null check (max_hp > 0),
  damage_total bigint not null default 0 check (damage_total >= 0),
  settled boolean not null default false,
  defeated boolean,
  created_at timestamptz not null default now()
);
create index if not exists arena_raids_due_idx on public.arena_raids (ends_at) where settled = false;

create table if not exists public.arena_raid_hits (
  raid_id text not null references public.arena_raids(raid_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  power integer not null check (power >= 0),   -- squad power at the first hit (used to scale the boss)
  damage bigint not null default 0 check (damage >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  primary key (raid_id, user_id)
);

alter table public.arena_player_daily add column if not exists raid_rewards integer not null default 0;

-- Mailbox: raid results. `ref` distinguishes several messages of one kind on the same day (one per raid).
alter table public.mail_inbox add column if not exists ref text not null default '';
do $$
declare c record;
begin
  -- the old unique key (recipient_id, sender_id, kind, day) must now include ref
  for c in
    select conname from pg_constraint
    where conrelid = 'public.mail_inbox'::regclass and contype = 'u'
  loop
    execute format('alter table public.mail_inbox drop constraint %I', c.conname);
  end loop;
  for c in
    select conname from pg_constraint
    where conrelid = 'public.mail_inbox'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%arena_knockout%'
  loop
    execute format('alter table public.mail_inbox drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.mail_inbox add constraint mail_inbox_unique_msg unique (recipient_id, sender_id, kind, day, ref);
alter table public.mail_inbox
  add constraint mail_inbox_kind_check check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result'));

alter table public.arena_raids enable row level security;
alter table public.arena_raid_hits enable row level security;
revoke all on public.arena_raids from anon, authenticated;
revoke all on public.arena_raid_hits from anon, authenticated;
