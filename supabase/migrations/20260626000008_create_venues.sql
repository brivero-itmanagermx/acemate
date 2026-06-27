create table public.venues (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  location   geography(Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger venues_updated_at
  before update on public.venues
  for each row execute function public.handle_updated_at();

create index venues_created_by_idx on public.venues (created_by)
  where deleted_at is null;

alter table public.venues enable row level security;

create policy "venues: authenticated read"
  on public.venues for select
  to authenticated
  using (deleted_at is null);

create policy "venues: owner insert"
  on public.venues for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "venues: owner update"
  on public.venues for update
  to authenticated
  using  (auth.uid() = created_by and deleted_at is null)
  with check (auth.uid() = created_by);

create policy "venues: owner delete"
  on public.venues for delete
  to authenticated
  using (auth.uid() = created_by);

-- Add venue_id to matches (nullable; on venue delete, null out the reference)
alter table public.matches
  add column venue_id uuid references public.venues(id) on delete set null;

create index matches_venue_idx on public.matches (venue_id)
  where venue_id is not null;
