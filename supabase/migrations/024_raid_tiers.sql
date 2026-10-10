-- Raid tiers 4 (Epic) and 5 (Legendary, event-only): widen the tier and boss_index checks on arena_raids.
alter table public.arena_raids drop constraint if exists arena_raids_tier_check;
alter table public.arena_raids add constraint arena_raids_tier_check check (tier between 1 and 5);
alter table public.arena_raids drop constraint if exists arena_raids_boss_index_check;
alter table public.arena_raids add constraint arena_raids_boss_index_check check (boss_index between 0 and 9);
notify pgrst, 'reload schema';

-- CHECK (run after): should return 2 rows, one mentioning "between 1 and 5" and one "between 0 and 9".
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.arena_raids'::regclass and contype = 'c' and conname in ('arena_raids_tier_check','arena_raids_boss_index_check');
