import { todayKey } from './dates';
import { supabase } from './supabase';

export type Group = {
  id: string;
  name: string;
  invite_code: string;
};

export type BoardSlot = {
  userId: string;
  displayName: string;
  color: string | null; // null = hasn't filled today yet
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export async function myGroup(userId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, invite_code)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const g = (data as { groups: Group | Group[] } | null)?.groups;
  if (!g) return null;
  return Array.isArray(g) ? (g[0] ?? null) : g;
}

export async function createGroup(userId: string, name: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, invite_code: makeCode(), created_by: userId })
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

export async function loadBoard(groupId: string): Promise<BoardSlot[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', groupId);
  if (error) throw error;

  const { data: shared, error: sharedError } = await supabase
    .from('board_posts')
    .select('user_id, color')
    .eq('group_id', groupId)
    .eq('day', todayKey());
  if (sharedError) throw sharedError;

  const colorByUser = new Map(
    (shared ?? []).map((r) => [r.user_id as string, r.color as string]),
  );

  return (members ?? []).map((m) => {
    const raw = (m as { profiles: { display_name: string } | { display_name: string }[] })
      .profiles;
    const profile = Array.isArray(raw) ? raw[0] : raw;
    return {
      userId: m.user_id as string,
      displayName: profile?.display_name || 'Someone',
      color: colorByUser.get(m.user_id as string) ?? null,
    };
  });
}

// Orbs land on the board the moment a friend fills theirs.
export function subscribeBoard(groupId: string, onChange: () => void) {
  const channel = supabase
    .channel(`board-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_posts',
        filter: `group_id=eq.${groupId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Sharing is per-ball and deliberate: only the color is ever written,
// and unsharing removes the row entirely.
export async function publishColor(
  userId: string,
  day: string,
  color: string,
): Promise<void> {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  if (error) throw error;

  const rows = (memberships ?? []).map((m) => ({
    group_id: m.group_id as string,
    user_id: userId,
    day,
    color,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from('board_posts')
    .upsert(rows, { onConflict: 'group_id,user_id,day' });
  if (upsertError) throw upsertError;
}

export async function unpublishColor(userId: string, day: string): Promise<void> {
  const { error } = await supabase
    .from('board_posts')
    .delete()
    .eq('user_id', userId)
    .eq('day', day);
  if (error) throw error;
}
