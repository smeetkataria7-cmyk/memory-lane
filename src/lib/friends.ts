import { todayKey } from './dates';
import type { Profile } from './profiles';
import { supabase } from './supabase';

export type FriendRequest = {
  id: string;
  status: 'pending' | 'accepted';
  requester_id: string;
  addressee_id: string;
  profile: Profile;
};

export type FriendSlot = {
  profile: Profile;
  color: string | null;
};

type Row = {
  id: string;
  status: 'pending' | 'accepted';
  requester_id: string;
  addressee_id: string;
  requester: Profile | Profile[];
  addressee: Profile | Profile[];
};

const one = <T,>(v: T | T[]): T => (Array.isArray(v) ? v[0] : v);

const SELECT =
  'id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)';

async function rows(userId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(SELECT)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function loadFriendships(userId: string): Promise<{
  friends: Profile[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const all = await rows(userId);
  const friends: Profile[] = [];
  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];

  for (const r of all) {
    const other = one(r.requester_id === userId ? r.addressee : r.requester);
    if (r.status === 'accepted') {
      friends.push(other);
    } else if (r.addressee_id === userId) {
      incoming.push({ ...r, profile: other } as FriendRequest);
    } else {
      outgoing.push({ ...r, profile: other } as FriendRequest);
    }
  }

  friends.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return { friends, incoming, outgoing };
}

export async function sendRequest(userId: string, addresseeId: string) {
  // If they already asked you, accepting theirs is the sane outcome
  // rather than creating a second row pointing the other way.
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return;
    if (existing.addressee_id === userId) {
      await acceptRequest(existing.id);
    }
    return;
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: addresseeId });
  if (error) throw error;
}

export async function acceptRequest(id: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function removeFriendship(id: string) {
  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) throw error;
}

export async function removeFriendByUser(userId: string, otherId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
    );
  if (error) throw error;
}

export async function pendingIncomingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

export async function loadFriendBoard(userId: string): Promise<FriendSlot[]> {
  const { friends } = await loadFriendships(userId);
  if (friends.length === 0) return [];

  const { data, error } = await supabase
    .from('shared_colors')
    .select('user_id, color')
    .eq('day', todayKey())
    .in(
      'user_id',
      friends.map((f) => f.id),
    );
  if (error) throw error;

  const byUser = new Map(
    (data ?? []).map((r) => [r.user_id as string, r.color as string]),
  );
  return friends.map((profile) => ({
    profile,
    color: byUser.get(profile.id) ?? null,
  }));
}
