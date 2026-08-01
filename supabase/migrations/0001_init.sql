-- Memory Lane initial schema.
-- Run this in the Supabase SQL editor (or via supabase db push) on a fresh project.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on public.profiles for select to authenticated using (true);

create policy "users manage their own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- balls (one per user per day) ----------
create table public.balls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  -- fills: [{"emotion":"joy","weight":55.2}, ...] weights sum to <= 100
  fills jsonb not null,
  blended_color text not null,
  note text,
  journey boolean not null default false,
  journey_reason text check (journey_reason in ('intensity', 'diversity', 'manual')),
  shared_to_board boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.balls enable row level security;

create policy "users read their own balls"
  on public.balls for select to authenticated using (user_id = auth.uid());

create policy "users insert their own balls"
  on public.balls for insert to authenticated with check (user_id = auth.uid());

create policy "users update their own balls"
  on public.balls for update to authenticated using (user_id = auth.uid());

create policy "users delete their own balls"
  on public.balls for delete to authenticated using (user_id = auth.uid());

-- ---------- media attached to a ball ----------
create table public.ball_media (
  id uuid primary key default gen_random_uuid(),
  ball_id uuid not null references public.balls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('photo', 'audio', 'video')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.ball_media enable row level security;

create policy "users read their own media"
  on public.ball_media for select to authenticated using (user_id = auth.uid());

create policy "users insert their own media"
  on public.ball_media for insert to authenticated with check (user_id = auth.uid());

create policy "users delete their own media"
  on public.ball_media for delete to authenticated using (user_id = auth.uid());

-- ---------- the single friend group ----------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create function public.is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create policy "members can read their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "any signed-in user can create a group"
  on public.groups for insert to authenticated
  with check (created_by = auth.uid());

create policy "members can read the member list"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "users join groups themselves"
  on public.group_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "users can leave a group"
  on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- Join-by-invite-code needs to look a group up before membership exists.
create function public.join_group_with_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
  member_count int;
begin
  select id into gid from public.groups where invite_code = code;
  if gid is null then
    raise exception 'invalid invite code';
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

-- ---------- board posts (color only, deliberate per-ball) ----------
-- A separate table rather than a view over balls, for two reasons:
--   1. Privacy is structural - there is no column here that could leak a
--      note, a media file, or the emotion breakdown. Only a color.
--   2. Realtime works. Group members can SELECT these rows, so postgres
--      change events actually reach them; RLS on balls (correctly) would
--      never let a friend's insert reach anyone else.
create table public.board_posts (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  color text not null,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id, day)
);

alter table public.board_posts enable row level security;

create policy "group members read the board"
  on public.board_posts for select to authenticated
  using (public.is_group_member(group_id));

create policy "users post their own color"
  on public.board_posts for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "users update their own color"
  on public.board_posts for update to authenticated
  using (user_id = auth.uid());

create policy "users unshare their own color"
  on public.board_posts for delete to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.board_posts;

-- ---------- storage bucket for media ----------
insert into storage.buckets (id, name, public)
values ('ball-media', 'ball-media', false)
on conflict (id) do nothing;

create policy "users manage their own media files"
  on storage.objects for all to authenticated
  using (bucket_id = 'ball-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ball-media' and (storage.foldername(name))[1] = auth.uid()::text);
