// Finding and removing every file a user has in Storage. Kept free of any
// app imports so it can be tested with a fake storage client.

type StorageError = { message: string } | null;

export type StorageBucket = {
  list(
    path: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ data: { name: string; id: string | null }[] | null; error: StorageError }>;
  remove(paths: string[]): Promise<{ error: StorageError }>;
};

export type StorageLike = { from(bucket: string): StorageBucket };

/** The buckets that hold a user's files. Each stores them under `<userId>/`. */
export const USER_FILE_BUCKETS = ['ball-media', 'avatars'] as const;

const PAGE = 100;

/**
 * Every file under `prefix`, descending into sub-folders. Storage lists a
 * folder as an entry with a null id.
 */
export async function listAllFiles(bucket: StorageBucket, prefix: string): Promise<string[]> {
  const found: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(error.message);
    const items = data ?? [];
    for (const item of items) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) found.push(...(await listAllFiles(bucket, path)));
      else found.push(path);
    }
    if (items.length < PAGE) break;
  }
  return found;
}

/** Delete everything the user has uploaded. Returns how many files were removed. */
export async function removeAllUserFiles(storage: StorageLike, userId: string): Promise<number> {
  let removed = 0;
  for (const name of USER_FILE_BUCKETS) {
    const bucket = storage.from(name);
    const paths = await listAllFiles(bucket, userId);
    for (let i = 0; i < paths.length; i += PAGE) {
      const { error } = await bucket.remove(paths.slice(i, i + PAGE));
      if (error) throw new Error(error.message);
    }
    removed += paths.length;
  }
  return removed;
}
