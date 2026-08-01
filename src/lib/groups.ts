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

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

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

export async function createGroup(userId: string, name: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), invite_code: makeCode(), created_by: userId })
    .select('id, name, invite_code')
    .single();
  if (error) throw error;
  const group = data as Group;
  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId });
  if (joinError) throw joinError;
  return group;
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
