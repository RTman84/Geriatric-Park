-- Server-held Mementos: the SERVER's balance is the real one. Every change is an event; balance, extra roster rooms and owned
-- keepsakes are all derived from the events. Browser has no direct access. Unique (user_id, ref) makes every event idempotent.
create table if not exists public.memento_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null check (kind in ('purchase', 'refund', 'convert', 'room', 'item', 'revoke', 'writeoff')),
  amount integer not null,                      -- signed: purchases/converts +, spends -, refunds -, revokes/writeoffs +
  ref text not null,                            -- purchase token, 'room:3', 'item:m05', convert nonce, 'refund:<token>', ...
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);
create index if not exists memento_events_user_idx on public.memento_events (user_id, created_at);

alter table public.purchases add column if not exists refunded_at timestamptz;

-- Single-row lock/timestamp so the refund check against Google runs at most every 30 minutes.
create table if not exists public.memento_sync (
  id int primary key default 1 check (id = 1),
  last_run timestamptz not null default 'epoch'
);
insert into public.memento_sync (id) values (1) on conflict do nothing;

alter table public.memento_events enable row level security;
alter table public.memento_sync enable row level security;
revoke all on public.memento_events from anon, authenticated;
revoke all on public.memento_sync from anon, authenticated;
notify pgrst, 'reload schema';
