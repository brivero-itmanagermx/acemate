-- Allow matches against unregistered opponents (players not yet on AceMate).
-- player_away_id becomes optional; opponent_name covers the unregistered case.

-- 1. Drop NOT NULL from player_away_id
alter table public.matches
  alter column player_away_id drop not null;

-- 2. Add free-text opponent fields
alter table public.matches
  add column opponent_name  text,
  add column opponent_email text;

-- 3. Exactly one of the two must be supplied — a match must always have an away side
alter table public.matches
  add constraint matches_has_opponent
  check (player_away_id is not null or opponent_name is not null);

-- 4. Re-create the active composite index to include opponent_name for mixed queries
drop index if exists public.matches_active_idx;

create index matches_active_idx
  on public.matches (player_home_id, played_at desc)
  where deleted_at is null;
