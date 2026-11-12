-- Friend chat: preset-only messages between accepted friends (same preset catalog as the Posse chat).
create table if not exists public.friend_chat (
  id bigint generated always as identity primary key,
  pair_key text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  preset text not null check (char_length(preset) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists friend_chat_pair_idx on public.friend_chat (pair_key, id desc);
create index if not exists friend_chat_recipient_idx on public.friend_chat (recipient_id, id desc);
alter table public.friend_chat enable row level security;
revoke all on public.friend_chat from anon, authenticated;
notify pgrst, 'reload schema';
-- CHECK (should return 1): select count(*) from information_schema.tables where table_schema='public' and table_name='friend_chat';
