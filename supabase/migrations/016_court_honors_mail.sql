-- Court honors: permanent record of which bracket titles a player has really earned (checked before a title can be
-- shown to other players), plus a Mailbox notice when someone takes your ladder spot.
create table if not exists public.court_honors (
  user_id uuid not null,
  key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.court_honors enable row level security;
revoke all on public.court_honors from anon, authenticated;

alter table public.mail_inbox drop constraint if exists mail_inbox_kind_check;
alter table public.mail_inbox
  add constraint mail_inbox_kind_check check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result', 'resident_exchange_host', 'court_displaced'));
notify pgrst, 'reload schema';
