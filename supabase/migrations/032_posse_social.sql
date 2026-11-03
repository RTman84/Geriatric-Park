-- Posse social layer: personal name colour/font, "looking for a Posse" listing, and preset-message chat.
-- Same security model as 031: RLS on, no grants; everything goes through api/posse.ts with the service role.

-- Every player picks their OWN name colour and font (unlocked by Posse level); the owner only controls the Posse emblem.
alter table public.posse_members add column if not exists name_color text;
alter table public.posse_members add column if not exists name_font text;

-- Players who want to be found and invited (same-faction officers can browse this list). Auto-expires after 14 days.
create table if not exists public.posse_lfp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  faction text not null check (faction in ('early_birds', 'night_owls', 'sunday_drivers')),
  created_at timestamptz not null default now()
);

-- Preset-only chat (no free text): stores which preset was sent. Text lives in the client catalog (services/posseChat.ts).
create table if not exists public.posse_chat (
  id bigint generated always as identity primary key,
  posse_id uuid not null references public.posses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preset text not null check (char_length(preset) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists posse_chat_posse_idx on public.posse_chat (posse_id, id desc);

alter table public.posse_lfp enable row level security;
alter table public.posse_chat enable row level security;
revoke all on public.posse_lfp, public.posse_chat from anon, authenticated;
notify pgrst, 'reload schema';

-- CHECK 1 (should return 2): select count(*) from information_schema.tables where table_schema='public' and table_name in ('posse_lfp','posse_chat');
-- CHECK 2 (should return 2): select count(*) from information_schema.columns where table_schema='public' and table_name='posse_members' and column_name in ('name_color','name_font');
