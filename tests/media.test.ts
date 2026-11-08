import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_CONTENT_TYPES, contentTypeFor, extFor } from '../src/lib/media';

describe('extFor', () => {
  it('reads the extension from the file uri, ignoring any query string', () => {
    expect(extFor('photo', 'file:///a/b/photo.PNG?x=1')).toBe('png');
    expect(extFor('video', 'file:///clip.mov')).toBe('mov');
    expect(extFor('audio', 'file:///note.m4a')).toBe('m4a');
  });

  it('falls back to a safe extension when the uri has none, or an unknown one', () => {
    expect(extFor('photo', 'content://media/external/images/42')).toBe('jpg');
    expect(extFor('video', 'file:///clip.exe')).toBe('mp4');
    expect(extFor('audio', 'file:///note.html')).toBe('m4a');
  });
});

describe('contentTypeFor', () => {
  it('gives standard types', () => {
    expect(contentTypeFor('photo', 'jpg')).toBe('image/jpeg');
    expect(contentTypeFor('video', 'mov')).toBe('video/quicktime');
    expect(contentTypeFor('audio', 'm4a')).toBe('audio/mp4');
  });

  it('uses the kind to tell apart extensions that mean different things', () => {
    expect(contentTypeFor('video', '3gp')).toBe('video/3gpp');
    expect(contentTypeFor('audio', '3gp')).toBe('audio/3gpp');
  });

  it('falls back to a default for the kind rather than an invented type', () => {
    expect(contentTypeFor('photo', 'xyz')).toBe('image/jpeg');
    expect(contentTypeFor('audio', 'xyz')).toBe('audio/mp4');
  });

  it('is case-insensitive', () => {
    expect(contentTypeFor('photo', 'JPG')).toBe('image/jpeg');
  });
});

describe('upload types vs the storage allow-list', () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/0006_hardening.sql'),
    'utf8',
  );
  const allowed = (bucket: string): string[] => {
    const block = sql.split('update storage.buckets').find((b) => b.includes(`where id = '${bucket}'`))!;
    return [...block.matchAll(/'([a-z0-9.+-]+\/[a-z0-9.+-]+)'/g)].map((m) => m[1]);
  };

  it('every type the app can send is accepted by the ball-media bucket', () => {
    const list = allowed('ball-media');
    expect(list.length).toBeGreaterThan(5);
    for (const type of ALL_CONTENT_TYPES) expect(list, `${type} would be rejected`).toContain(type);
  });

  it('every image type the app can send is accepted as an avatar', () => {
    const list = allowed('avatars');
    for (const type of ALL_CONTENT_TYPES.filter((t) => t.startsWith('image/'))) {
      // gif is allowed for day photos but deliberately not for avatars
      if (type === 'image/gif') continue;
      expect(list, `${type} would be rejected`).toContain(type);
    }
  });
});
