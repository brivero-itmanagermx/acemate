create table public.match_reactions (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- one reaction per user per match
  constraint match_reactions_unique unique (match_id, user_id)
);

create index match_reactions_match_idx on public.match_reactions (match_id);
create index match_reactions_user_idx  on public.match_reactions (user_id);

alter table public.match_reactions enable row level security;

create policy "match_reactions: public read"
  on public.match_reactions for select
  using (true);

create policy "match_reactions: authenticated insert"
  on public.match_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "match_reactions: owner delete"
  on public.match_reactions for delete
  to authenticated
  using (auth.uid() = user_id);
