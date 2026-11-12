-- Find Players: players are now listed in the finder by default (requests still need the other player's approval).
-- The existing flag keeps its name; the toggle in Friends now means "Show me in Find Players" and defaults to on.
alter table public.player_profiles alter column open_to_random_friends set default true;
update public.player_profiles set open_to_random_friends = true;
notify pgrst, 'reload schema';

-- CHECK (run after): should return 0 (nobody left hidden).
-- select count(*) from public.player_profiles where open_to_random_friends = false;
