import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { USERS, addUsers, as, asAnon, freshDb, resetData } from './harness';

const DAY = '2026-08-04';
const rlsError = /row-level security|permission denied/i;

let db: PGlite;
let circle: { id: string; invite_code: string };

const count = async (sql: string, params: unknown[] = []) =>
  (await db.query(sql, params)).rows.length;

// Building the database runs all the migrations, so do it once.
beforeAll(async () => {
  db = await freshDb();
}, 120_000);

beforeEach(async () => {
  await resetData(db);
  await addUsers(db);
  // alice and bob are friends; alice and carol share a circle; dave is a stranger.
  await db.query(
    `insert into public.friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')`,
    [USERS.alice, USERS.bob],
  );
  circle = await as(db, 'alice', async () =>
    (await db.query(`select * from public.create_group_with_name('Close ones')`)).rows[0] as typeof circle,
  );
  await as(db, 'carol', () => db.query(`select public.join_group_with_code($1)`, [circle.invite_code]));
  // alice fills her day, with a private note
  await as(db, 'alice', () =>
    db.query(
      `insert into public.balls (user_id, day, fills, blended_color, note)
       values ($1, $2, '[{"emotion":"joy","weight":60}]', '#e8b923', 'a private note')`,
      [USERS.alice, DAY],
    ),
  );
});

describe('a day is private by default', () => {
  it('lets only its owner read the day, the note and the emotion breakdown', async () => {
    expect(await as(db, 'alice', () => count('select * from public.balls'))).toBe(1);
    for (const other of ['bob', 'carol', 'dave'] as const) {
      expect(await as(db, other, () => count('select * from public.balls'))).toBe(0);
    }
  });

  it('refuses to write a day on someone else\'s behalf', async () => {
    await expect(
      as(db, 'dave', () =>
        db.query(
          `insert into public.balls (user_id, day, fills, blended_color) values ($1, '2026-08-05', '[]', '#000000')`,
          [USERS.alice],
        ),
      ),
    ).rejects.toThrow(rlsError);
  });

  it('refuses to change someone else\'s day', async () => {
    const res = await as(db, 'dave', () =>
      db.query(`update public.balls set note = 'hacked' returning id`),
    );
    expect(res.rows).toHaveLength(0);
    const note = (await db.query('select note from public.balls')).rows[0] as { note: string };
    expect(note.note).toBe('a private note');
  });

  it('shows nothing at all to a signed-out visitor', async () => {
    await expect(asAnon(db, () => db.query('select * from public.balls'))).rejects.toThrow(rlsError);
    await expect(asAnon(db, () => db.query('select * from public.profiles'))).rejects.toThrow(rlsError);
  });
});

describe('sharing a day', () => {
  const share = (user: 'alice') =>
    as(db, user, () =>
      db.query(`insert into public.shared_colors (user_id, day, color) values ($1, $2, '#e8b923')`, [
        USERS[user],
        DAY,
      ]),
    );
  const sees = (user: 'alice' | 'bob' | 'carol' | 'dave') =>
    as(db, user, () => count('select * from public.shared_colors'));

  it('treats an empty audience as private, even for friends and circle-mates', async () => {
    await share('alice');
    expect(await sees('alice')).toBe(1);
    expect(await sees('bob')).toBe(0);
    expect(await sees('carol')).toBe(0);
    expect(await sees('dave')).toBe(0);
  });

  it('shows a day shared with one friend to that friend and nobody else', async () => {
    await share('alice');
    await as(db, 'alice', () =>
      db.query(`insert into public.share_audience (user_id, day, friend_id) values ($1, $2, $3)`, [
        USERS.alice,
        DAY,
        USERS.bob,
      ]),
    );
    expect(await sees('bob')).toBe(1);
    expect(await sees('carol')).toBe(0); // in her circle, but not in the audience
    expect(await sees('dave')).toBe(0);
  });

  it('shows a day shared with a circle to its members and nobody else', async () => {
    await share('alice');
    await as(db, 'alice', () =>
      db.query(`insert into public.share_audience (user_id, day, group_id) values ($1, $2, $3)`, [
        USERS.alice,
        DAY,
        circle.id,
      ]),
    );
    expect(await sees('carol')).toBe(1);
    expect(await sees('bob')).toBe(0); // a friend, but not in that circle
    expect(await sees('dave')).toBe(0);
  });

  it('stops showing the day once it is unshared', async () => {
    await share('alice');
    await as(db, 'alice', async () => {
      await db.query(`insert into public.share_audience (user_id, day, friend_id) values ($1, $2, $3)`, [
        USERS.alice,
        DAY,
        USERS.bob,
      ]);
      await db.query('delete from public.share_audience');
      await db.query('delete from public.shared_colors');
    });
    expect(await sees('bob')).toBe(0);
  });

  it('will not aim a share at a circle you are not in', async () => {
    await expect(
      as(db, 'dave', () =>
        db.query(`insert into public.share_audience (user_id, day, group_id) values ($1, $2, $3)`, [
          USERS.dave,
          DAY,
          circle.id,
        ]),
      ),
    ).rejects.toThrow(rlsError);
  });

  it('will not aim a share at someone who has not accepted you as a friend', async () => {
    await expect(
      as(db, 'alice', () =>
        db.query(`insert into public.share_audience (user_id, day, friend_id) values ($1, $2, $3)`, [
          USERS.alice,
          DAY,
          USERS.dave,
        ]),
      ),
    ).rejects.toThrow(rlsError);
  });

  it('cannot be faked through can_see_share', async () => {
    await share('alice');
    const ok = await as(db, 'dave', async () =>
      ((await db.query(`select public.can_see_share($1, $2) as ok`, [USERS.alice, DAY])).rows[0] as {
        ok: boolean;
      }).ok,
    );
    expect(ok).toBe(false);
  });

  it('keeps notes and emotion breakdowns out of the shared tables entirely', async () => {
    const cols = (
      await db.query(
        `select table_name, column_name from information_schema.columns
         where table_schema = 'public' and table_name in ('shared_colors', 'shared_media', 'board_posts')`,
      )
    ).rows as { table_name: string; column_name: string }[];
    expect(cols.length).toBeGreaterThan(0);
    for (const c of cols) {
      expect(['note', 'fills', 'journey', 'journey_reason']).not.toContain(c.column_name);
    }
  });
});

describe('shared photos, video and voice notes', () => {
  const OBJECT = `${USERS.alice}/ball-1/photo.jpg`;

  beforeEach(async () => {
    await as(db, 'alice', async () => {
      await db.query(`insert into storage.objects (bucket_id, name) values ('ball-media', $1)`, [OBJECT]);
      await db.query(
        `insert into public.shared_media (user_id, day, storage_path, kind) values ($1, $2, $3, 'photo')`,
        [USERS.alice, DAY, OBJECT],
      );
      await db.query(`insert into public.share_audience (user_id, day, friend_id) values ($1, $2, $3)`, [
        USERS.alice,
        DAY,
        USERS.bob,
      ]);
    });
  });

  it('lets the audience open the file and nobody else', async () => {
    const open = (u: 'alice' | 'bob' | 'carol' | 'dave') =>
      as(db, u, () => count(`select * from storage.objects where name = $1`, [OBJECT]));
    expect(await open('alice')).toBe(1);
    expect(await open('bob')).toBe(1);
    expect(await open('carol')).toBe(0);
    expect(await open('dave')).toBe(0);
  });

  it('only lets you upload into your own folder', async () => {
    await expect(
      as(db, 'dave', () =>
        db.query(`insert into storage.objects (bucket_id, name) values ('ball-media', $1)`, [
          `${USERS.alice}/ball-1/evil.jpg`,
        ]),
      ),
    ).rejects.toThrow(rlsError);
  });
});

describe('circles', () => {
  it('creates a circle with a six-character invite code and makes the creator a member', async () => {
    expect(circle.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const members = (
      await db.query('select user_id from public.group_members where group_id = $1', [circle.id])
    ).rows.map((r) => (r as { user_id: string }).user_id);
    expect(members.sort()).toEqual([USERS.alice, USERS.carol].sort());
  });

  it('rejects a circle with a blank name', async () => {
    await expect(
      as(db, 'alice', () => db.query(`select public.create_group_with_name('   ')`)),
    ).rejects.toThrow(/needs a name/);
  });

  it('rejects a wrong invite code', async () => {
    await expect(
      as(db, 'dave', () => db.query(`select public.join_group_with_code('NOPE00')`)),
    ).rejects.toThrow(/invalid invite code/);
  });

  it('hides a circle from people who are not in it', async () => {
    expect(await as(db, 'dave', () => count('select * from public.groups'))).toBe(0);
    expect(await as(db, 'carol', () => count('select * from public.groups'))).toBe(1);
  });

  it('stops at 20 members', async () => {
    for (let i = 0; i < 18; i += 1) {
      const id = `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`;
      await db.query('insert into auth.users (id) values ($1)', [id]);
      await db.query('insert into public.group_members (group_id, user_id) values ($1, $2)', [circle.id, id]);
    }
    // alice + carol + 18 = 20, so dave is the 21st
    await expect(
      as(db, 'dave', () => db.query(`select public.join_group_with_code($1)`, [circle.invite_code])),
    ).rejects.toThrow(/group is full/);
  });
});
