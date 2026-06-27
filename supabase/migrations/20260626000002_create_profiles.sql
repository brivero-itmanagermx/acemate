create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text not null unique,
  full_name       text,
  avatar_url      text,
  bio             text,
  level           text not null default 'beginner'
                    check (level in ('beginner', 'intermediate', 'advanced', 'competitive')),
  dominant_hand   text
                    check (dominant_hand in ('left', 'right')),
  preferred_surface text
                    check (preferred_surface in ('clay', 'hard', 'grass', 'indoor')),
  location        geography(Point, 4326),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Spatial index for nearby-player queries
create index profiles_location_idx on public.profiles using gist (location);
create index profiles_username_idx  on public.profiles (username);
-- Partial index: only active (non-deleted) profiles with a location appear in searches
create index profiles_active_location_idx
  on public.profiles using gist (location)
  where deleted_at is null and location is not null;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row when a new auth user is registered
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- Anyone can read active profiles (needed for player discovery)
create policy "profiles: public read active"
  on public.profiles for select
  using (deleted_at is null);

-- Users can update only their own profile
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);
