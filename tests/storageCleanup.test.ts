import { describe, expect, it } from 'vitest';
import {
  listAllFiles,
  removeAllUserFiles,
  type StorageBucket,
  type StorageLike,
} from '../src/lib/storageCleanup';

// A tiny in-memory stand-in for Supabase Storage. A folder is listed as an
// entry with a null id, the way the real service does.
function fakeStorage(files: Record<string, string[]>) {
  const removed: Record<string, string[]> = {};
  const state = new Map(Object.entries(files).map(([b, p]) => [b, new Set(p)]));

  const bucket = (name: string): StorageBucket => ({
    async list(prefix, { limit = 100, offset = 0 } = {}) {
      const paths = [...(state.get(name) ?? [])].filter((p) => p.startsWith(`${prefix}/`));
      const children = new Map<string, string | null>();
      for (const p of paths) {
        const rest = p.slice(prefix.length + 1);
        const [first, ...more] = rest.split('/');
        children.set(first, more.length ? null : p);
      }
      const all = [...children].map(([n, id]) => ({ name: n, id }));
      return { data: all.slice(offset, offset + limit), error: null };
    },
    async remove(paths) {
      for (const p of paths) state.get(name)?.delete(p);
      (removed[name] ??= []).push(...paths);
      return { error: null };
    },
  });
  const storage: StorageLike = { from: bucket };
  return { storage, removed, remaining: (b: string) => [...(state.get(b) ?? [])] };
}

describe('listAllFiles', () => {
  it('finds files in nested folders', async () => {
    const { storage } = fakeStorage({
      'ball-media': ['u1/day-a/photo.jpg', 'u1/day-a/voice.m4a', 'u1/day-b/clip.mp4', 'u2/day-a/other.jpg'],
    });
    const found = await listAllFiles(storage.from('ball-media'), 'u1');
    expect(found.sort()).toEqual(['u1/day-a/photo.jpg', 'u1/day-a/voice.m4a', 'u1/day-b/clip.mp4']);
  });

  it('pages through folders with more than 100 entries', async () => {
    const many = Array.from({ length: 250 }, (_, i) => `u1/day/f${String(i).padStart(3, '0')}.jpg`);
    const { storage } = fakeStorage({ 'ball-media': many });
    expect(await listAllFiles(storage.from('ball-media'), 'u1')).toHaveLength(250);
  });

  it('returns nothing for a user with no files', async () => {
    const { storage } = fakeStorage({ 'ball-media': [] });
    expect(await listAllFiles(storage.from('ball-media'), 'u1')).toEqual([]);
  });

  it('surfaces a storage error instead of hiding it', async () => {
    const bad: StorageBucket = {
      list: async () => ({ data: null, error: { message: 'boom' } }),
      remove: async () => ({ error: null }),
    };
    await expect(listAllFiles(bad, 'u1')).rejects.toThrow('boom');
  });
});

describe('removeAllUserFiles', () => {
  it("removes this user's files from every bucket and nobody else's", async () => {
    const { storage, remaining } = fakeStorage({
      'ball-media': ['u1/day-a/photo.jpg', 'u1/day-b/clip.mp4', 'u2/day-a/keep.jpg'],
      avatars: ['u1/avatar-1.jpg', 'u2/avatar-9.jpg'],
    });
    expect(await removeAllUserFiles(storage, 'u1')).toBe(3);
    expect(remaining('ball-media')).toEqual(['u2/day-a/keep.jpg']);
    expect(remaining('avatars')).toEqual(['u2/avatar-9.jpg']);
  });

  it('removes everything even when there are more than one batch', async () => {
    const many = Array.from({ length: 230 }, (_, i) => `u1/day/f${i}.jpg`);
    const { storage, removed } = fakeStorage({ 'ball-media': many, avatars: [] });
    await removeAllUserFiles(storage, 'u1');
    expect(removed['ball-media']).toHaveLength(230);
  });

  it('stops and reports if a removal fails', async () => {
    const storage: StorageLike = {
      from: () => ({
        list: async () => ({ data: [{ name: 'a.jpg', id: 'x' }], error: null }),
        remove: async () => ({ error: { message: 'denied' } }),
      }),
    };
    await expect(removeAllUserFiles(storage, 'u1')).rejects.toThrow('denied');
  });
});
