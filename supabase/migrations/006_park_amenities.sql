-- Geriatric Park: Park Amenities / Grounds (Phase 3 visiting system)
--
-- migration 004 has already been applied to the live database, so this
-- column has to be added via ALTER TABLE rather than edited into 004
-- in place.

alter table public.player_profiles
  add column if not exists built_amenities jsonb not null default '[]'::jsonb;
