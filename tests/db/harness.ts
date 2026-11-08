// Runs the real migrations in supabase/migrations against an in-memory
// Postgres (PGlite), so the row-level-security policies are tested for real.
//
// Supabase provides a few things that plain Postgres doesn't: the `auth` and
// `storage` schemas, the `authenticated` / `anon` roles and `auth.uid()`. The
// SHIM below recreates just enough of them. Realtime publications are the
// only thing skipped, because they only matter for live updates, not access.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = path.resolve(__dirname, '../../supabase/migrations');

const SHIM = `
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language plpgsql as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end
$$;

grant usage on schema auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
grant select on storage.buckets to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
`;

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SHIM);
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs
      .readFileSync(path.join(MIGRATIONS, file), 'utf8')
      .replace(/^alter publication .*;$/gim, '');
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export const USERS = {
  alice: '00000000-0000-4000-8000-00000000000a',
  bob: '00000000-0000-4000-8000-00000000000b',
  carol: '00000000-0000-4000-8000-00000000000c',
  dave: '00000000-0000-4000-8000-00000000000d',
} as const;
export type UserName = keyof typeof USERS;

export async function addUsers(db: PGlite, names: UserName[] = Object.keys(USERS) as UserName[]) {
  for (const n of names) {
    await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [
      USERS[n],
      JSON.stringify({ display_name: n }),
    ]);
  }
}

/** Empty every table between tests, keeping the schema, policies and functions. */
export async function resetData(db: PGlite) {
  await db.exec('truncate auth.users, public.profiles, public.groups, storage.objects cascade;');
}

/** Run `fn` the way the app does: as the `authenticated` role, signed in as `user`. */
export async function as<T>(db: PGlite, user: UserName | string, fn: () => Promise<T>): Promise<T> {
  const id = user in USERS ? USERS[user as UserName] : user;
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

/** Run `fn` as the anonymous (signed-out) role. */
export async function asAnon<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role anon;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}
