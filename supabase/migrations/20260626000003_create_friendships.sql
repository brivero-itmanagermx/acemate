create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A user cannot send a request to themselves
  constraint friendships_no_self_request check (requester_id <> receiver_id),
  -- Only one directional relationship per pair (requester → receiver is unique)
  constraint friendships_unique_pair unique (requester_id, receiver_id)
);

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_receiver_idx  on public.friendships (receiver_id);
create index friendships_status_idx    on public.friendships (status);

create trigger set_friendships_updated_at
  before update on public.friendships
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.friendships enable row level security;

-- Users can see friendships they are part of
create policy "friendships: participant read"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Users can send friend requests (insert where they are the requester)
create policy "friendships: requester insert"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Only the receiver can accept or reject; requester can cancel (delete)
create policy "friendships: receiver update"
  on public.friendships for update
  using (auth.uid() = receiver_id);

-- Either participant can remove the friendship
create policy "friendships: participant delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = receiver_id);
