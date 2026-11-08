// File extensions and content types for uploads.
//
// Storage rejects any upload whose content type is not on the bucket's
// allow-list (see supabase/migrations/0006_hardening.sql), so every type this
// file can produce must be on that list. tests/media.test.ts checks that.

export type MediaKind = 'photo' | 'audio' | 'video';

const TYPES: Record<MediaKind, Record<string, string>> = {
  photo: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    gif: 'image/gif',
  },
  video: {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    '3gp': 'video/3gpp',
    webm: 'video/webm',
  },
  audio: {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    '3gp': 'audio/3gpp',
    webm: 'audio/webm',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
  },
};

const FALLBACK_EXT: Record<MediaKind, string> = { photo: 'jpg', video: 'mp4', audio: 'm4a' };

/** Every content type an upload can be sent with. */
export const ALL_CONTENT_TYPES: string[] = [
  ...new Set(Object.values(TYPES).flatMap((byExt) => Object.values(byExt))),
];

/** The file extension to store a file under, taken from its URI. */
export function extFor(kind: MediaKind, uri: string): string {
  const guess = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (guess && guess.length <= 4 && guess in TYPES[kind]) return guess;
  return FALLBACK_EXT[kind];
}

/** The content type to upload a file with. Always a type storage accepts. */
export function contentTypeFor(kind: MediaKind, ext: string): string {
  return TYPES[kind][ext.toLowerCase()] ?? TYPES[kind][FALLBACK_EXT[kind]];
}
