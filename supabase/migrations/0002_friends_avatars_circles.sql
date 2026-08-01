-- Friends, avatars, and one shared-colour table that serves both circles
-- and friends. Run this after 0001_init.sql.

-- ---------- avatars ----------
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users manage their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- friendships ----------
-- One row per pair. requester_id is whoever sent it; declining deletes
-- the row rather than storing a rejection.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

create policy "users see friendships they are part of"
  on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users send their own requests"
  on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());

-- Only the addressee can accept, and only a pending row.
create policy "addressee accepts a request"
  on public.friendships for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

create policy "either side can remove"
  on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create function public.are_friends(other uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other))
  );
$$;

create function public.shares_a_circle(other uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

-- ---------- shared colours ----------
-- Replaces board_posts. One row per person per day rather than one per
-- circle, because the same colour is now visible two ways: to people who
-- share a circle with you, and to accepted friends. Still colour-only -
-- there is no column here that could carry a note, media, or which
-- emotions were picked.
create table public.shared_colors (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  color text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.shared_colors enable row level security;

create policy "you, your circles and your friends can read"
  on public.shared_colors for select to authenticated
  using (
    user_id = auth.uid()
    or public.shares_a_circle(user_id)
    or public.are_friends(user_id)
  );

create policy "users share their own colour"
  on public.shared_colors for insert to authenticated
  with check (user_id = auth.uid());

create policy "users update their own colour"
  on public.shared_colors for update to authenticated
  using (user_id = auth.uid());

create policy "users unshare their own colour"
  on public.shared_colors for delete to authenticated
  using (user_id = auth.uid());

-- Carry over anything already shared, then retire the per-circle table.
insert into public.shared_colors (user_id, day, color, updated_at)
select distinct on (user_id, day) user_id, day, color, updated_at
from public.board_posts
on conflict (user_id, day) do nothing;

alter publication supabase_realtime drop table public.board_posts;
drop table public.board_posts;

alter publication supabase_realtime add table public.shared_colors;
alter publication supabase_realtime add table public.friendships;

-- ---------- grants ----------
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.shared_colors to authenticated;
grant execute on function public.are_friends(uuid) to authenticated;
grant execute on function public.shares_a_circle(uuid) to authenticated;
