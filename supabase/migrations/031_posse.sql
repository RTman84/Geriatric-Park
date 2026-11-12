-- Geriatric Park: Posse ("The Old Gang") -- player groups locked to one faction. See POSSE_CHAT_PLAN.md.
-- Like mail_inbox: RLS on, no grants to anon/authenticated; everything goes through api/posse.ts with the service role.

create table if not exists public.posses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 20),
  name_key text not null,
  tag text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  faction text not null check (faction in ('early_birds', 'night_owls', 'sunday_drivers')),
  emblem text not null default 'sunrise',
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_count integer not null default 1 check (member_count between 0 and 100),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists posses_name_key_live_idx on public.posses (name_key) where deleted_at is null;
create index if not exists posses_tag_idx on public.posses (tag) where deleted_at is null;

create table if not exists public.posse_members (
  posse_id uuid not null references public.posses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'co', 'member')),
  joined_at timestamptz not null default now(),
  week_start date,
  week_points integer not null default 0 check (week_points >= 0),
  primary key (posse_id, user_id),
  unique (user_id) -- a player is in at most one Posse
);

create table if not exists public.posse_invites (
  id uuid primary key default gen_random_uuid(),
  posse_id uuid not null references public.posses(id) on delete cascade,
  kind text not null default 'invite' check (kind in ('invite', 'request')), -- invite: officer -> player; request: player -> owner
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists posse_invites_to_idx on public.posse_invites (to_user_id, status);
create index if not exists posse_invites_posse_idx on public.posse_invites (posse_id, status);

create table if not exists public.posse_week_points (
  posse_id uuid not null references public.posses(id) on delete cascade,
  week_start date not null,
  points integer not null default 0 check (points >= 0),
  settled boolean not null default false,
  primary key (posse_id, week_start)
);

create table if not exists public.posse_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  points_added integer not null default 0 check (points_added >= 0),
  primary key (user_id, day)
);

alter table public.posses enable row level security;
alter table public.posse_members enable row level security;
alter table public.posse_invites enable row level security;
alter table public.posse_week_points enable row level security;
alter table public.posse_daily enable row level security;
revoke all on public.posses, public.posse_members, public.posse_invites, public.posse_week_points, public.posse_daily from anon, authenticated;

-- Mailbox: Posse invitations/requests and (later) rewards and Quick Chat.
alter table public.mail_inbox drop constraint if exists mail_inbox_kind_check;
alter table public.mail_inbox add constraint mail_inbox_kind_check
  check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result', 'resident_exchange_host', 'court_displaced', 'board_reward', 'friend_request', 'posse_invite', 'posse_reward', 'quick_chat'));
notify pgrst, 'reload schema';

-- CHECK (run after): should return 5.
-- select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('posses', 'posse_members', 'posse_invites', 'posse_week_points', 'posse_daily');
-- CHECK 2: should return 1 row whose definition mentions 'posse_invite'.
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.mail_inbox'::regclass and conname = 'mail_inbox_kind_check';
