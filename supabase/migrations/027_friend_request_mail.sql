-- Friend requests are delivered to the addressee's Mailbox (kind 'friend_request', ref = the request id).
alter table public.mail_inbox drop constraint if exists mail_inbox_kind_check;
alter table public.mail_inbox add constraint mail_inbox_kind_check
  check (kind in ('friend_battle', 'arena_knockout', 'arena_dues', 'raid_result', 'resident_exchange_host', 'court_displaced', 'board_reward', 'friend_request'));
notify pgrst, 'reload schema';

-- CHECK (run after): should return 1 row whose definition mentions 'friend_request'.
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.mail_inbox'::regclass and conname = 'mail_inbox_kind_check';
