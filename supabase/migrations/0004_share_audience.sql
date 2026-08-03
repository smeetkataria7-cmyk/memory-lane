-- Per-share audience. Until now "share to board" was all-or-nothing: one
-- row in shared_colors and everyone who shared a circle or a friendship
-- could see it. This lets a day go to specific circles and specific
-- friends instead, the way you'd pick chats before forwarding something.
--
-- The shared_colors / shared_media rows stay one-per-day (they hold the
-- content). This table holds who is allowed to look.

create table public.share_audience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  group_id uuid references public.groups (id) on delete cascade,
  friend_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- exactly one target per row
  constraint share_audience_one_target check ((group_id is null) <> (friend_id is null))
);

create unique index share_audience_group_uniq
  on public.share_audience (user_id, day, group_id)
  where group_id is not null;

create unique index share_audience_friend_uniq
  on public.share_audience (user_id, day, friend_id)
  where friend_id is not null;

create index share_audience_lookup on public.share_audience (user_id, day);

-- Preserve what people already shared: everything currently on the board
-- was visible to all their circles and all their friends, so spell that
-- out explicitly rather than silently narrowing it to nobody.
insert into public.share_audience (user_id, day, group_id)
select distinct sc.user_id, sc.day, gm.group_id
from public.shared_colors sc
join public.group_members gm on gm.user_id = sc.user_id;

insert into public.share_audience (user_id, day, friend_id)
select distinct sc.user_id, sc.day,
  case when f.requester_id = sc.user_id then f.addressee_id else f.requester_id end
from public.shared_colors sc
join public.friendships f
  on f.status = 'accepted'
 and (f.requester_id = sc.user_id or f.addressee_id = sc.user_id);

alter table public.share_audience enable row level security;

-- Only the owner ever reads this table directly; viewers go through
-- can_see_share, which is security definer.
create policy "users read their own audience"
  on public.share_audience for select to authenticated
  using (user_id = auth.uid());

-- You can only aim a share at a circle you are actually in, or at someone
-- who has accepted your friend request.
create policy "users set their own audience"
  on public.share_audience for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      group_id is null
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = share_audience.group_id and gm.user_id = auth.uid()
      )
    )
    and (friend_id is null or public.are_friends(friend_id))
  );

create policy "users clear their own audience"
  on public.share_audience for delete to authenticated
  using (user_id = auth.uid());

create function public.can_see_share(owner uuid, d date)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.share_audience sa
    where sa.user_id = owner
      and sa.day = d
      and (
        sa.friend_id = auth.uid()
        or (
          sa.group_id is not null
          and exists (
            select 1 from public.group_members gm
            where gm.group_id = sa.group_id and gm.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- ---------- point the read policies at the audience ----------
drop policy "you, your circles and your friends can read" on public.shared_colors;

create policy "you and whoever you shared the day with can read"
  on public.shared_colors for select to authenticated
  using (user_id = auth.uid() or public.can_see_share(user_id, day));

drop policy "you, your circles and your friends can read shared media" on public.shared_media;

create policy "you and whoever you shared the day with can read media"
  on public.shared_media for select to authenticated
  using (user_id = auth.uid() or public.can_see_share(user_id, day));

drop policy "friends and circle members read shared media files" on storage.objects;

create policy "shared media files follow the day's audience"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ball-media'
    and exists (
      select 1 from public.shared_media sm
      where sm.storage_path = name
        and public.can_see_share(sm.user_id, sm.day)
    )
  );

alter publication supabase_realtime add table public.share_audience;

grant select, insert, delete on public.share_audience to authenticated;
grant execute on function public.can_see_share(uuid, date) to authenticated;
