-- Hardening. Run this after 0005_fix_create_circle.sql.
--
--   1. Limits on what can be uploaded to the storage buckets.
--   2. Invite codes from a cryptographically secure source, and a lockout
--      for anyone guessing codes.
--   3. delete_my_account(): remove a user and everything they own.
--   4. export_my_data(): hand a user a copy of everything we hold about them.

-- ---------- 1. storage limits ----------
-- Without these, any signed-in user could upload files of any size and type.
-- The mime list is every type the app can send (see src/lib/media.ts).
update storage.buckets
set file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/3gpp', 'video/webm',
      'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/3gpp', 'audio/webm', 'audio/wav', 'audio/ogg'
    ]
where id = 'ball-media';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'avatars';

-- ---------- 2. invite codes ----------
-- Codes were built with random(), which is not meant for secrets. gen_random_uuid()
-- is backed by the server's secure random source, and byte 0 of a v4 uuid is
-- fully random. 256 is a multiple of 32, so "% 32" adds no bias.
create or replace function public.create_group_with_name(group_name text)
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  g public.groups;
  new_code text;
  bytes bytea;
  attempts int := 0;
  i int;
begin
  if coalesce(btrim(group_name), '') = '' then
    raise exception 'a circle needs a name';
  end if;

  loop
    attempts := attempts + 1;
    bytes := uuid_send(gen_random_uuid());
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
    end loop;
    exit when not exists (
      select 1 from public.groups where invite_code = new_code
    );
    if attempts >= 12 then
      raise exception 'could not allocate an invite code, try again';
    end if;
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (btrim(group_name), new_code, auth.uid())
  returning * into g;

  insert into public.group_members (group_id, user_id)
  values (g.id, auth.uid());

  return g;
end;
$$;

-- Wrong guesses are recorded here. Nobody can read or write the table
-- directly: RLS is on and there are no policies and no grants. Only
-- join_group_with_code (security definer) touches it.
create table public.join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_time on public.join_attempts (user_id, attempted_at);
alter table public.join_attempts enable row level security;

-- A wrong code now returns null instead of raising. A raised exception rolls
-- back the whole call, which would also undo the row that records the guess,
-- and then the lockout could never trigger.
create or replace function public.join_group_with_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
  member_count int;
  recent_misses int;
  wanted text := upper(btrim(coalesce(code, '')));
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  delete from public.join_attempts where attempted_at < now() - interval '1 day';
  select count(*) into recent_misses
  from public.join_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if recent_misses >= 10 then
    raise exception 'too many wrong codes, try again in an hour';
  end if;

  select id into gid from public.groups where invite_code = wanted;
  if gid is null then
    insert into public.join_attempts (user_id) values (auth.uid());
    return null;
  end if;

  select count(*) into member_count from public.group_members where group_id = gid;
  if member_count >= 20 then
    raise exception 'group is full';
  end if;
  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- ---------- 3. delete my account ----------
-- Everything hangs off profiles / auth.users with "on delete cascade", except
-- groups.created_by. So a circle I made is handed to its longest-standing other
-- member, or deleted if I am the only one in it.
--
-- This removes database rows only. Files in Storage are removed by the app
-- before it calls this (see src/lib/account.ts): deleting storage.objects rows
-- from SQL would leave the files themselves behind.
create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update public.groups g
  set created_by = (
    select gm.user_id from public.group_members gm
    where gm.group_id = g.id and gm.user_id <> auth.uid()
    order by gm.joined_at
    limit 1
  )
  where g.created_by = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = g.id and gm.user_id <> auth.uid()
    );

  delete from public.groups where created_by = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------- 4. export my data ----------
-- Not security definer, so row-level security still applies; every query is
-- also pinned to the caller, because the shared_* tables can show the caller
-- other people's shares.
create function public.export_my_data()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'days', coalesce((select jsonb_agg(to_jsonb(b) order by b.day)
                      from public.balls b where b.user_id = auth.uid()), '[]'::jsonb),
    'day_media', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at)
                           from public.ball_media m where m.user_id = auth.uid()), '[]'::jsonb),
    'circles', coalesce((select jsonb_agg(jsonb_build_object(
                           'id', g.id, 'name', g.name, 'joined_at', gm.joined_at))
                         from public.group_members gm
                         join public.groups g on g.id = gm.group_id
                         where gm.user_id = auth.uid()), '[]'::jsonb),
    'friendships', coalesce((select jsonb_agg(to_jsonb(f))
                             from public.friendships f
                             where f.requester_id = auth.uid() or f.addressee_id = auth.uid()), '[]'::jsonb),
    'shared_days', coalesce((select jsonb_agg(to_jsonb(s))
                             from public.shared_colors s where s.user_id = auth.uid()), '[]'::jsonb),
    'shared_media', coalesce((select jsonb_agg(to_jsonb(sm))
                              from public.shared_media sm where sm.user_id = auth.uid()), '[]'::jsonb),
    'share_audience', coalesce((select jsonb_agg(to_jsonb(sa))
                                from public.share_audience sa where sa.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.export_my_data() to authenticated;
