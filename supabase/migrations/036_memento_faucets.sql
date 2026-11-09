-- Free Mementos faucets (daily login, free spin, level milestones). They are ordinary memento_events rows with new kinds;
-- the unique (user_id, ref) rule on memento_events makes each claim once-only (refs: daily:<date>, spin:<date>, milestone:<level>).
alter table public.memento_events drop constraint if exists memento_events_kind_check;
alter table public.memento_events add constraint memento_events_kind_check
  check (kind in ('purchase', 'refund', 'convert', 'room', 'item', 'revoke', 'writeoff', 'pass', 'daily', 'spin', 'milestone'));
notify pgrst, 'reload schema';
-- CHECK (should return 1 row mentioning 'milestone'): select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.memento_events'::regclass and conname = 'memento_events_kind_check';
