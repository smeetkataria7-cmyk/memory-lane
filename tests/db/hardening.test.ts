import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { USERS, addUsers, as, asAnon, freshDb, resetData } from './harness';

const DAY = '2026-08-04';
const denied = /permission denied|row-level security/i;

let db: PGlite;

beforeAll(async () => {
  db = await freshDb();
}, 120_000);

beforeEach(async () => {
  await resetData(db);
  await db.exec('truncate public.join_attempts;');
  await addUsers(db);
});

const createCircle = (user: 'alice' | 'bob' | 'carol' | 'dave', name = 'Circle') =>
  as(db, user, async () =>
    (await db.query(`select * from public.create_group_with_name($1)`, [name])).rows[0] as {
      id: string;
      invite_code: string;
    },
  );

const join = (user: 'alice' | 'bob' | 'carol' | 'dave', code: string) =>
  as(db, user, async () =>
    ((await db.query(`select public.join_group_with_code($1) as gid`, [code])).rows[0] as {
      gid: string | null;
    }).gid,
  );

describe('storage limits', () => {
  const bucket = async (id: string) =>
    (await db.query('select * from storage.buckets where id = $1', [id])).rows[0] as {
      file_size_limit: number;
      allowed_mime_types: string[];
    };

  it('caps the size of uploaded files', async () => {
    expect(Number((await bucket('ball-media')).file_size_limit)).toBeLessThanOrEqual(50 * 1024 * 1024);
    expect(Number((await bucket('avatars')).file_size_limit)).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  it('only allows photos, video and audio', async () => {
    const media = (await bucket('ball-media')).allowed_mime_types;
    expect(media).toContain('image/jpeg');
    expect(media).toContain('video/mp4');
    expect(media).toContain('audio/mp4');
    for (const mime of media) expect(mime).toMatch(/^(image|video|audio)\//);
    expect(media).not.toContain('image/svg+xml'); // SVG can carry scripts
  });

  it('only allows pictures as avatars', async () => {
    for (const mime of (await bucket('avatars')).allowed_mime_types) expect(mime).toMatch(/^image\//);
  });
});

describe('invite codes', () => {
  it('are six characters from an unambiguous alphabet and never repeat', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      const c = await createCircle('alice', `Circle ${i}`);
      expect(c.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      codes.add(c.invite_code);
    }
    expect(codes.size).toBe(25);
  });

  it('use the whole alphabet, not just a few characters', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      for (const ch of (await createCircle('alice', `Circle ${i}`)).invite_code) seen.add(ch);
    }
    expect(seen.size).toBeGreaterThan(24); // 240 draws from 32 symbols: all but a few appear
  });

  it('can be typed in lower case or with spaces around them', async () => {
    const c = await createCircle('alice');
    expect(await join('bob', `  ${c.invite_code.toLowerCase()} `)).toBe(c.id);
  });

  it('lock a user out after ten wrong guesses in an hour', async () => {
    const c = await createCircle('alice');
    for (let i = 0; i < 10; i += 1) expect(await join('dave', `WRONG${i}`)).toBeNull();
    await expect(join('dave', 'WRONG10')).rejects.toThrow(/too many wrong codes/);
    // ...even with the right code
    await expect(join('dave', c.invite_code)).rejects.toThrow(/too many wrong codes/);
    // ...but other people are not affected
    expect(await join('bob', c.invite_code)).toBe(c.id);
  });

  it('forget old guesses after an hour', async () => {
    const c = await createCircle('alice');
    for (let i = 0; i < 10; i += 1) await join('dave', `WRONG${i}`);
    await db.query(`update public.join_attempts set attempted_at = now() - interval '2 hours'`);
    expect(await join('dave', c.invite_code)).toBe(c.id);
  });

  it('keep the list of guesses private', async () => {
    await join('dave', 'WRONG1');
    await expect(as(db, 'dave', () => db.query('select * from public.join_attempts'))).rejects.toThrow(denied);
  });
});

describe('delete my account', () => {
  beforeEach(async () => {
    await db.query(
      `insert into public.friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')`,
      [USERS.alice, USERS.bob],
    );
    for (const u of ['alice', 'bob'] as const) {
      await as(db, u, async () => {
        await db.query(
          `insert into public.balls (user_id, day, fills, blended_color, note) values ($1, $2, '[]', '#000000', 'note')`,
          [USERS[u], DAY],
        );
        await db.query(`insert into public.shared_colors (user_id, day, color) values ($1, $2, '#000000')`, [
          USERS[u],
          DAY,
        ]);
      });
    }
  });

  const total = async (table: string, userCol: string, user: keyof typeof USERS) =>
    (await db.query(`select count(*)::int as n from ${table} where ${userCol} = $1`, [USERS[user]])).rows[0] as {
      n: number;
    };

  it('removes the user and everything they own, and leaves other people alone', async () => {
    await as(db, 'alice', () => db.query('select public.delete_my_account()'));
    expect((await total('auth.users', 'id', 'alice')).n).toBe(0);
    expect((await total('public.profiles', 'id', 'alice')).n).toBe(0);
    expect((await total('public.balls', 'user_id', 'alice')).n).toBe(0);
    expect((await total('public.shared_colors', 'user_id', 'alice')).n).toBe(0);
    expect(
      ((await db.query('select count(*)::int as n from public.friendships')).rows[0] as { n: number }).n,
    ).toBe(0);
    // bob is untouched
    expect((await total('public.balls', 'user_id', 'bob')).n).toBe(1);
    expect((await total('public.profiles', 'id', 'bob')).n).toBe(1);
  });

  it('hands a circle you made to another member', async () => {
    const c = await createCircle('alice', 'Shared');
    await join('carol', c.invite_code);
    await as(db, 'alice', () => db.query('select public.delete_my_account()'));
    const g = (await db.query('select created_by from public.groups where id = $1', [c.id])).rows[0] as {
      created_by: string;
    };
    expect(g.created_by).toBe(USERS.carol);
  });

  it('deletes a circle if you were its only member', async () => {
    const c = await createCircle('alice', 'Solo');
    await as(db, 'alice', () => db.query('select public.delete_my_account()'));
    expect((await db.query('select * from public.groups where id = $1', [c.id])).rows).toHaveLength(0);
  });

  it('is not available to signed-out visitors', async () => {
    await expect(asAnon(db, () => db.query('select public.delete_my_account()'))).rejects.toThrow(denied);
  });
});

describe('export my data', () => {
  type Export = {
    profile: { id: string };
    days: { note: string }[];
    circles: unknown[];
    friendships: unknown[];
    shared_days: unknown[];
  };
  const exportFor = (user: 'alice' | 'bob') =>
    as(db, user, async () => (await db.query('select public.export_my_data() as d')).rows[0] as { d: Export }).then(
      (r) => r.d,
    );

  beforeEach(async () => {
    await db.query(
      `insert into public.friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')`,
      [USERS.alice, USERS.bob],
    );
    for (const u of ['alice', 'bob'] as const) {
      await as(db, u, async () => {
        await db.query(
          `insert into public.balls (user_id, day, fills, blended_color, note) values ($1, $2, '[]', '#000000', $3)`,
          [USERS[u], DAY, `${u}'s private note`],
        );
        await db.query(`insert into public.shared_colors (user_id, day, color) values ($1, $2, '#000000')`, [
          USERS[u],
          DAY,
        ]);
      });
    }
    // bob shares his day with alice, so alice can SEE it, but it is not alice's data
    await as(db, 'bob', () =>
      db.query(`insert into public.share_audience (user_id, day, friend_id) values ($1, $2, $3)`, [
        USERS.bob,
        DAY,
        USERS.alice,
      ]),
    );
  });

  it('includes your own days, with your private notes', async () => {
    const d = await exportFor('alice');
    expect(d.profile.id).toBe(USERS.alice);
    expect(d.days).toHaveLength(1);
    expect(d.days[0].note).toBe("alice's private note");
    expect(d.friendships).toHaveLength(1);
  });

  it('never includes anything that belongs to someone else', async () => {
    const d = await exportFor('alice');
    expect(JSON.stringify(d)).not.toContain("bob's private note");
    expect(d.shared_days).toHaveLength(1); // alice's own share, not bob's
  });

  it('is not available to signed-out visitors', async () => {
    await expect(asAnon(db, () => db.query('select public.export_my_data()'))).rejects.toThrow(denied);
  });
});
