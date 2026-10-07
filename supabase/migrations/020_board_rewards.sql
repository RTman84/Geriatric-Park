-- Weekly leaderboard rewards: the top 3 of every bracket on each weekly board get a Mailbox reward after the week ends.
alter table public.mail_inbox add column if not exists reward_diners integer not null default 0 check (reward_diners >= 0);
alter table public.mail_inbox drop constraint if exists mail_inbox_kind_check;
alter table public.mail_inbox add constraint mail_inbox_kind_check
  check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result', 'resident_exchange_host', 'court_displaced', 'board_reward'));

-- One row per (mode, week) once its rewards have been handed out, so settlement can never run twice.
create table if not exists public.board_settlements (
  mode text not null,
  period text not null,
  settled_at timestamptz not null default now(),
  primary key (mode, period)
);
alter table public.board_settlements enable row level security;
revoke all on public.board_settlements from anon, authenticated;
notify pgrst, 'reload schema';
