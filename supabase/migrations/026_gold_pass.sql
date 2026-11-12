-- Gold Pass: a Mementos purchase per season (ref 'pass:<season id>'). Widen the memento_events kind check.
alter table public.memento_events drop constraint if exists memento_events_kind_check;
alter table public.memento_events add constraint memento_events_kind_check
  check (kind in ('purchase', 'refund', 'convert', 'room', 'item', 'revoke', 'writeoff', 'pass'));
notify pgrst, 'reload schema';

-- CHECK (run after): should return 1 row whose definition mentions 'pass'.
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.memento_events'::regclass and conname = 'memento_events_kind_check';
