-- Roster shown wandering in a friend's park (up to 30 captured Elders that are home). favorite_elders (max 3) is still the Featured list.
alter table public.player_profiles add column if not exists park_elders jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

-- CHECK (run after): should return 1 row.
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'player_profiles' and column_name = 'park_elders';
