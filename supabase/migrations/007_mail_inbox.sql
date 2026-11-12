-- Geriatric Park: cross-account Mailbox notifications (Friend Battle results).
--
-- A player's Mailbox lives inside their own cloud save, which another player's
-- client can never safely write into. This table is the server-side "drop box":
-- api/mail.ts writes a row here when a friend battles you, and your own client
-- pulls it and merges it into your Mailbox on load.
--
-- Same principle as migrations 002-006: written and read only through an api/
-- route using the service role key. No grants to anon/authenticated.
--
-- One row per (recipient, sender, kind, UTC day) -- repeated battles by the same
-- friend on the same day update the counts on that single row instead of
-- creating new messages. The defender reward (if any) is fixed the first time
-- it is earned that day, so extra battles can never stack extra rewards.

create table if not exists public.mail_inbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default 'Park Visitor',
  kind text not null default 'friend_battle' check (kind in ('friend_battle')),
  day date not null,
  attacker_wins integer not null default 0 check (attacker_wins >= 0),
  defender_wins integer not null default 0 check (defender_wins >= 0),
  reward_tickets integer not null default 0 check (reward_tickets >= 0),
  reward_materials integer not null default 0 check (reward_materials >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_mail check (recipient_id <> sender_id),
  unique (recipient_id, sender_id, kind, day)
);

create index if not exists mail_inbox_recipient_updated_idx on public.mail_inbox (recipient_id, updated_at desc);

alter table public.mail_inbox enable row level security;

-- No policies are created: with RLS enabled and zero grants to anon/authenticated,
-- the table is reachable only via the service role used server-side.
revoke all on public.mail_inbox from anon, authenticated;
