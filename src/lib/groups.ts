import { todayKey } from './dates';
import type { Profile } from './profiles';
import { supabase } from './supabase';

export type Group = {
  id: string;
  name: string;
  invite_code: string;
};

export type BoardSlot = {
  profile: Profile;
  color: string | null; // null = hasn't shared today yet
};

const one = <T,>(v: T | T[]): T => (Array.isArray(v) ? v[0] : v);

export async function myGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, invite_code)')
    .eq('user_id', userId);
  if (error) throw error;
  return ((data ?? []) as { groups: Group | Group[] }[])
    .map((r) => one(r.groups))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Creating the group and joining it have to happen together: the groups
// read policy is membership-based, so a group with no members is invisible
// even to the person who made it.
export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group_with_name', {
    group_name: name.trim(),
  });
  if (error) throw error;
  return data as Group;
}

export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_with_code', {
    code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}

export async function leaveGroup(userId: string, groupId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId);
  if (error) throw error;
}

export async function loadBoard(groupId: string): Promise<BoardSlot[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(id, display_name, avatar_url)')
    .eq('group_id', groupId);
  if (error) throw error;

  const profiles = ((members ?? []) as { profiles: Profile | Profile[] }[])
    .map((m) => one(m.profiles))
    .filter(Boolean);
  if (profiles.length === 0) return [];

  const { data: shared, error: sharedError } = await supabase
    .from('shared_colors')
    .select('user_id, color')
    .eq('day', todayKey())
    .in(
      'user_id',
      profiles.map((p) => p.id),
    );
  if (sharedError) throw sharedError;

  const byUser = new Map(
    (shared ?? []).map((r) => [r.user_id as string, r.color as string]),
  );

  return profiles
    .map((profile) => ({ profile, color: byUser.get(profile.id) ?? null }))
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name));
}

// Orbs land the moment someone shares theirs.
export function subscribeColors(onChange: () => void) {
  const channel = supabase
    .channel('shared-colors')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_colors' },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Sharing is per-ball and deliberate. One row per day now covers both
// circles and friends, so this no longer fans out per circle.
export async function publishColor(
  userId: string,
  day: string,
  color: string,
): Promise<void> {
  const { error } = await supabase
    .from('shared_colors')
    .upsert(
      { user_id: userId, day, color, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day' },
    );
  if (error) throw error;
}

export async function unpublishColor(userId: string, day: string): Promise<void> {
  const { error } = await supabase
    .from('shared_colors')
    .delete()
    .eq('user_id', userId)
    .eq('day', day);
  if (error) throw error;
}

export type SharedMedia = {
  id: string;
  user_id: string;
  day: string;
  storage_path: string;
  kind: 'photo' | 'audio' | 'video';
};

export async function publishMedia(
  userId: string,
  day: string,
  media: { storage_path: string; kind: string }[],
): Promise<void> {
  if (media.length === 0) return;
  const rows = media.map((m) => ({
    user_id: userId,
    day,
    storage_path: m.storage_path,
    kind: m.kind,
  }));
  const { error } = await supabase
    .from('shared_media')
    .upsert(rows, { onConflict: 'user_id,day,storage_path' });
  if (error) throw error;
}

export async function unpublishMedia(userId: string, day: string): Promise<void> {
  const { error } = await supabase
    .from('shared_media')
    .delete()
    .eq('user_id', userId)
    .eq('day', day);
  if (error) throw error;
}

export async function loadSharedMedia(userId: string, day: string): Promise<SharedMedia[]> {
  const { data, error } = await supabase
    .from('shared_media')
    .select('*')
    .eq('user_id', userId)
    .eq('day', day);
  if (error) return [];
  return (data ?? []) as SharedMedia[];
}

// Who a day is shared with. An empty list means the day is private -
// there is no "everyone" value, so widening is always a deliberate pick.
export type ShareTarget =
  | { kind: 'group'; id: string }
  | { kind: 'friend'; id: string };

export async function setAudience(
  userId: string,
  day: string,
  targets: ShareTarget[],
): Promise<void> {
  // Replace rather than merge: the picker always submits the full list,
  // so anything absent from it is something the user just unchecked.
  const { error: clearError } = await supabase
    .from('share_audience')
    .delete()
    .eq('user_id', userId)
    .eq('day', day);
  if (clearError) throw clearError;

  if (targets.length === 0) return;

  const { error } = await supabase.from('share_audience').insert(
    targets.map((t) => ({
      user_id: userId,
      day,
      group_id: t.kind === 'group' ? t.id : null,
      friend_id: t.kind === 'friend' ? t.id : null,
    })),
  );
  if (error) throw error;
}

export async function loadAudience(userId: string, day: string): Promise<ShareTarget[]> {
  const { data, error } = await supabase
    .from('share_audience')
    .select('group_id, friend_id')
    .eq('user_id', userId)
    .eq('day', day);
  if (error) return [];
  return (data ?? []).map((r) =>
    r.group_id
      ? ({ kind: 'group', id: r.group_id as string } as const)
      : ({ kind: 'friend', id: r.friend_id as string } as const),
  );
}
