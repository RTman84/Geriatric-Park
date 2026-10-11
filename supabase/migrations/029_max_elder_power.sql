-- Strongest single Elder a player owns (any status). Lets a benched Elder be stationed at an Arena even when it out-powers the whole squad.
alter table public.player_profiles add column if not exists max_elder_power integer not null default 0;
notify pgrst, 'reload schema';

-- CHECK (run after): should return 1 row.
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'player_profiles' and column_name = 'max_elder_power';
