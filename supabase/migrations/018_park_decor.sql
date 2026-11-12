-- Park decoration: Park Assets the player placed on the grass, shown to friends who visit. [{id, x, y}] in % of the scene.
alter table public.player_profiles add column if not exists park_decor jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';
