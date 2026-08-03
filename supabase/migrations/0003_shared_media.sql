-- Shared media: lets circle members and friends see photos, videos,
-- and voice notes alongside the shared colour. Still deliberate per-day:
-- rows only exist when the user has "Share to board" turned on.

create table public.shared_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  storage_path text not null,
  kind text not null check (kind in ('photo', 'audio', 'video')),
  created_at timestamptz not null default now(),
  unique (user_id, day, storage_path)
);

alter table public.shared_media enable row level security;

create policy "you, your circles and your friends can read shared media"
  on public.shared_media for select to authenticated
  using (
    user_id = auth.uid()
    or public.shares_a_circle(user_id)
    or public.are_friends(user_id)
  );

create policy "users share their own media"
  on public.shared_media for insert to authenticated
  with check (user_id = auth.uid());

create policy "users unshare their own media"
  on public.shared_media for delete to authenticated
  using (user_id = auth.uid());

-- Let circle members and friends download files that appear in shared_media.
-- The existing "users manage their own media files" policy already covers
-- the owner; this one OR's alongside it for readers.
create policy "friends and circle members read shared media files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ball-media'
    and exists (
      select 1 from public.shared_media sm
      where sm.storage_path = name
        and (
          public.shares_a_circle(sm.user_id)
          or public.are_friends(sm.user_id)
        )
    )
  );

grant select, insert, delete on public.shared_media to authenticated;
