-- Geriatric Park Phase 2 security hardening
-- Removes unnecessary direct table privileges from API roles.

revoke all privileges
on table
  public.profiles,
  public.game_saves,
  public.player_event_intents
from anon, authenticated;

grant select, insert, update
on table public.profiles
to authenticated;

grant select, insert, update
on table public.game_saves
to authenticated;

grant select, insert
on table public.player_event_intents
to authenticated;

-- Keep future public-schema tables from inheriting broad API-role privileges.
alter default privileges in schema public
revoke all privileges on tables from anon, authenticated;
