-- A server-verified rewarded ad view pays Mementos (kind 'ad', ref ad:<transaction id>, once per view).
alter table public.memento_events drop constraint if exists memento_events_kind_check;
alter table public.memento_events add constraint memento_events_kind_check
  check (kind in ('purchase', 'refund', 'convert', 'room', 'item', 'revoke', 'writeoff', 'pass', 'daily', 'spin', 'milestone', 'ad'));
notify pgrst, 'reload schema';
-- CHECK (should return 1 row mentioning 'ad'): select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.memento_events'::regclass and conname = 'memento_events_kind_check';
