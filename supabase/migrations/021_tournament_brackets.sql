-- Daily Tournament leaderboard split by squad-power bracket. The bracket is set by the SERVER from player_profiles.squad_power.
alter table public.leaderboard_scores add column if not exists bracket int not null default 1;
create index if not exists leaderboard_scores_bracket_idx on public.leaderboard_scores (tournament_day, bracket, score desc);
notify pgrst, 'reload schema';
