-- Arena / Raid gear set bonuses (percent), computed by api/account/save.ts from the equipped squad and read by api/arena.ts.
alter table public.player_profiles add column if not exists arena_bonus_pct smallint not null default 0;
alter table public.player_profiles add column if not exists raid_bonus_pct smallint not null default 0;
notify pgrst, 'reload schema';

-- CHECK (run after): should return 2 rows (arena_bonus_pct and raid_bonus_pct).
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'player_profiles' and column_name in ('arena_bonus_pct', 'raid_bonus_pct');
