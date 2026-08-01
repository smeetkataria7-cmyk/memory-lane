import { File } from 'expo-file-system';
import { blendEmotions, type EmotionFill } from './blend';
import { detectJourney, type JourneyReason } from './journey';
import { supabase } from './supabase';

export type MediaKind = 'photo' | 'audio' | 'video';

export type PendingMedia = {
  kind: MediaKind;
  uri: string;
};

export type BallMedia = {
  id: string;
  kind: MediaKind;
  storage_path: string;
};

export type Ball = {
  id: string;
  user_id: string;
  day: string;
  fills: EmotionFill[];
  blended_color: string;
  note: string | null;
  journey: boolean;
  journey_reason: JourneyReason | null;
  shared_to_board: boolean;
  created_at: string;
};

export const todayKey = (d = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const extFor = (kind: MediaKind, uri: string): string => {
  const guess = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (guess && guess.length <= 4) return guess;
  return kind === 'photo' ? 'jpg' : kind === 'video' ? 'mp4' : 'm4a';
};

const contentTypeFor = (kind: MediaKind, ext: string): string =>
  kind === 'photo'
    ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
    : kind === 'video'
      ? `video/${ext}`
      : `audio/${ext === 'm4a' ? 'mp4' : ext}`;

async function uploadMedia(userId: string, ballId: string, media: PendingMedia) {
  const ext = extFor(media.kind, media.uri);
  const path = `${userId}/${ballId}/${Date.now()}-${media.kind}.${ext}`;
  const bytes = await new File(media.uri).arrayBuffer();
  const { error } = await supabase.storage
    .from('ball-media')
    .upload(path, bytes, { contentType: contentTypeFor(media.kind, ext) });
  if (error) throw error;
  return path;
}

export async function saveBall(opts: {
  userId: string;
  fills: EmotionFill[];
  note?: string;
  media?: PendingMedia[];
  shareToBoard?: boolean;
  day?: string;
}): Promise<Ball> {
  const day = opts.day ?? todayKey();
  const auto = detectJourney(opts.fills);

  // A manual pin is a deliberate choice - re-saving the day must not undo it.
  const existing = await getBall(opts.userId, day);
  const keepManual = existing?.journey_reason === 'manual';

  const { data, error } = await supabase
    .from('balls')
    .upsert(
      {
        user_id: opts.userId,
        day,
        fills: opts.fills,
        blended_color: blendEmotions(opts.fills),
        note: opts.note?.trim() ? opts.note.trim() : null,
        journey: keepManual || auto !== null,
        journey_reason: keepManual ? 'manual' : auto,
        shared_to_board: opts.shareToBoard ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,day' },
    )
    .select()
    .single();
  if (error) throw error;

  const ball = data as Ball;

  for (const m of opts.media ?? []) {
    const storagePath = await uploadMedia(opts.userId, ball.id, m);
    const { error: mediaError } = await supabase.from('ball_media').insert({
      ball_id: ball.id,
      user_id: opts.userId,
      kind: m.kind,
      storage_path: storagePath,
    });
    if (mediaError) throw mediaError;
  }

  return ball;
}

export async function getBall(userId: string, day: string): Promise<Ball | null> {
  const { data, error } = await supabase
    .from('balls')
    .select('*')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (error) throw error;
  return (data as Ball) ?? null;
}

export async function listBalls(userId: string, limit = 120): Promise<Ball[]> {
  const { data, error } = await supabase
    .from('balls')
    .select('*')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Ball[];
}

export async function listJourney(userId: string): Promise<Ball[]> {
  const { data, error } = await supabase
    .from('balls')
    .select('*')
    .eq('user_id', userId)
    .eq('journey', true)
    .order('day', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ball[];
}

export async function listMedia(ballId: string): Promise<BallMedia[]> {
  const { data, error } = await supabase
    .from('ball_media')
    .select('id, kind, storage_path')
    .eq('ball_id', ballId);
  if (error) throw error;
  return (data ?? []) as BallMedia[];
}

export async function signedMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('ball-media')
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function setJourneyPin(ballId: string, pinned: boolean) {
  const { error } = await supabase
    .from('balls')
    .update({
      journey: pinned,
      journey_reason: pinned ? 'manual' : null,
    })
    .eq('id', ballId);
  if (error) throw error;
}

export async function setBoardShare(ballId: string, shared: boolean) {
  const { error } = await supabase
    .from('balls')
    .update({ shared_to_board: shared })
    .eq('id', ballId);
  if (error) throw error;
}
