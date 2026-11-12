-- Resident Exchange: the owner picks the host's building or quest when leaving an Elder, and friends can see each
-- other's active quests so they can choose one.
alter table public.player_profiles
  add column if not exists active_quests jsonb not null default '[]'::jsonb;
alter table public.resident_exchange
  add column if not exists target_id text;
alter table public.resident_exchange
  add column if not exists target_label text;
notify pgrst, 'reload schema';
