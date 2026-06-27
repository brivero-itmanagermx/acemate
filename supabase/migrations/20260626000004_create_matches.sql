create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  player_home_id uuid not null references public.profiles(id) on delete restrict,
  player_away_id uuid not null references public.profiles(id) on delete restrict,
  -- winner_id is nullable: null until the match is confirmed
  winner_id      uuid references public.profiles(id) on delete set null,
  -- Flexible score: [{"home": 6, "away": 4}, {"home": 7, "away": 5}]
  -- No rigid validation — any set count, any score accepted (core business rule)
  sets           jsonb not null default '[]',
  surface        text
                   check (surface in ('clay', 'hard', 'grass', 'indoor')),
  location_name  text,
  played_at      timestamptz not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'disputed', 'cancelled')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint matches_different_players check (player_home_id <> player_away_id),
  -- winner must be one of the two players
  constraint matches_valid_winner check (
    winner_id is null
    or winner_id = player_home_id
    or winner_id = player_away_id
  )
);

create index matches_player_home_idx on public.matches (player_home_id);
create index matches_player_away_idx on public.matches (player_away_id);
create index matches_played_at_idx   on public.matches (played_at desc);
create index matches_status_idx      on public.matches (status);
-- Exclude soft-deleted matches from common queries
create index matches_active_idx
  on public.matches (player_home_id, player_away_id, played_at desc)
  where deleted_at is null;

create trigger set_matches_updated_at
  before update on public.matches
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.matches enable row level security;

-- Players can read matches they are part of (active only)
create policy "matches: participant read"
  on public.matches for select
  using (
    deleted_at is null
    and (auth.uid() = player_home_id or auth.uid() = player_away_id)
  );

-- Either player can register a match
create policy "matches: participant insert"
  on public.matches for insert
  with check (auth.uid() = player_home_id or auth.uid() = player_away_id);

-- Either player can update a non-cancelled match (e.g. confirm, dispute)
create policy "matches: participant update"
  on public.matches for update
  using (
    deleted_at is null
    and (auth.uid() = player_home_id or auth.uid() = player_away_id)
  );
