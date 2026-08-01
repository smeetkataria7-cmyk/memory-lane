import { File } from 'expo-file-system';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateDisplayName(userId: string, name: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name.trim() })
    .eq('id', userId);
  if (error) throw error;
}

// Avatars live in a public bucket, so the URL can be rendered directly
// in lists without minting a signed URL per row.
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const bytes = await new File(uri).arrayBuffer();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (updateError) throw updateError;

  return url;
}

export async function searchProfiles(term: string, excludeId: string): Promise<Profile[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q}%`)
    .neq('id', excludeId)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
}
