-- Creating a circle never worked.
--
-- The groups SELECT policy is membership-based, but createGroup inserted the
-- group and asked for the row back in the same request - before the
-- group_members row existed. RLS correctly hid the new row from its own
-- creator, PostgREST returned nothing, and the client threw. The group was
-- left behind with no members, invisible to everyone including the person
-- who made it.
--
-- Two fixes: make creation atomic in a security-definer function so the
-- membership can never be missing, and let a creator read their own group
-- so the general case stops depending on statement ordering.

-- ---------- repair orphaned circles ----------
insert into public.group_members (group_id, user_id)
select g.id, g.created_by
from public.groups g
where not exists (
  select 1 from public.group_members gm
  where gm.group_id = g.id and gm.user_id = g.created_by
)
on conflict do nothing;

-- ---------- let creators see what they created ----------
drop policy "members can read their groups" on public.groups;

create policy "members and the creator can read a group"
  on public.groups for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

-- ---------- atomic creation ----------
-- Invite codes are minted here rather than on the client so uniqueness is
-- checked against the table instead of hoped for. Same alphabet as before:
-- no O/I/0/1, because these get read aloud and typed in by hand.
create function public.create_group_with_name(group_name text)
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  g public.groups;
  new_code text;
  attempts int := 0;
  i int;
begin
  if coalesce(btrim(group_name), '') = '' then
    raise exception 'a circle needs a name';
  end if;

  loop
    attempts := attempts + 1;
    new_code := '';
    for i in 1..6 loop
      new_code := new_code
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
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

grant execute on function public.create_group_with_name(text) to authenticated;
