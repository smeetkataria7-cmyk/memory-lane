import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/Avatar';
import { useAuth } from '../src/lib/auth';
import {
  acceptRequest,
  loadFriendships,
  removeFriendByUser,
  removeFriendship,
  sendRequest,
  type FriendRequest,
} from '../src/lib/friends';
import { searchProfiles, type Profile } from '../src/lib/profiles';
import { radii, spacing, typography } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function FriendsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const [friends, setFriends] = useState<Profile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const r = await loadFriendships(userId);
    setFriends(r.friends);
    setIncoming(r.incoming);
    setOutgoing(r.outgoing);
  }, [userId]);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  // Debounced so a search fires once the typing settles, not per keystroke.
  useEffect(() => {
    if (!userId || term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchProfiles(term, userId)
        .then(setResults)
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(id);
  }, [term, userId]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    }
  };

  const relationOf = (id: string): 'friend' | 'sent' | 'incoming' | 'none' => {
    if (friends.some((f) => f.id === id)) return 'friend';
    if (outgoing.some((r) => r.profile.id === id)) return 'sent';
    if (incoming.some((r) => r.profile.id === id)) return 'incoming';
    return 'none';
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.paper }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: t.accent }]}>‹ Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: t.ink }]}>Friends</Text>

      <TextInput
        value={term}
        onChangeText={setTerm}
        placeholder="Search by name"
        placeholderTextColor={t.inkFaint}
        autoCapitalize="none"
        style={[styles.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
      />

      {searching ? <ActivityIndicator color={t.accent} /> : null}

      {results.length > 0 ? (
        <Section title="Results">
          {results.map((p) => {
            const rel = relationOf(p.id);
            return (
              <Row key={p.id} profile={p}>
                {rel === 'friend' ? (
                  <Tag label="Friends" />
                ) : rel === 'sent' ? (
                  <Tag label="Requested" />
                ) : rel === 'incoming' ? (
                  <Action
                    label="Accept"
                    onPress={() =>
                      run(() =>
                        acceptRequest(incoming.find((r) => r.profile.id === p.id)!.id),
                      )
                    }
                  />
                ) : (
                  <Action
                    label="Add"
                    onPress={() => userId && run(() => sendRequest(userId, p.id))}
                  />
                )}
              </Row>
            );
          })}
        </Section>
      ) : null}

      {loading ? <ActivityIndicator color={t.accent} /> : null}

      {incoming.length > 0 ? (
        <Section title={`Requests (${incoming.length})`}>
          {incoming.map((r) => (
            <Row key={r.id} profile={r.profile}>
              <View style={styles.actions}>
                <Action label="Accept" onPress={() => run(() => acceptRequest(r.id))} />
                <Pressable onPress={() => run(() => removeFriendship(r.id))} hitSlop={8}>
                  <Text style={[styles.decline, { color: t.inkFaint }]}>Decline</Text>
                </Pressable>
              </View>
            </Row>
          ))}
        </Section>
      ) : null}

      {outgoing.length > 0 ? (
        <Section title="Sent">
          {outgoing.map((r) => (
            <Row key={r.id} profile={r.profile}>
              <Pressable onPress={() => run(() => removeFriendship(r.id))} hitSlop={8}>
                <Text style={[styles.decline, { color: t.inkFaint }]}>Cancel</Text>
              </Pressable>
            </Row>
          ))}
        </Section>
      ) : null}

      <Section title={friends.length > 0 ? `Friends (${friends.length})` : 'Friends'}>
        {friends.length === 0 ? (
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            No friends yet. Search a name above to send the first request.
          </Text>
        ) : (
          friends.map((p) => (
            <Row key={p.id} profile={p}>
              <Pressable
                onPress={() => userId && run(() => removeFriendByUser(userId, p.id))}
                hitSlop={8}
              >
                <Text style={[styles.decline, { color: t.danger }]}>Remove</Text>
              </Pressable>
            </Row>
          ))
        )}
      </Section>

      {error ? <Text style={{ color: t.danger }}>{error}</Text> : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.section, { color: t.inkMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Avatar profile={profile} size={38} />
      <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
        {profile.display_name || 'Someone'}
      </Text>
      {children}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.action, { backgroundColor: t.accent }]}>
      <Text style={[styles.actionText, { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: t.surface2 }]}>
      <Text style={[styles.tagText, { color: t.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  title: typography.title,
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 16,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  action: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill },
  actionText: { fontSize: 13, fontWeight: '700' },
  decline: { fontSize: 13, fontWeight: '700' },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  tagText: { fontSize: 12, fontWeight: '700' },
  empty: { fontSize: 14, lineHeight: 21 },
});
