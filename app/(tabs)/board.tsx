import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '../../src/components/Avatar';
import { Orb } from '../../src/components/Orb';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/lib/auth';
import { loadFriendBoard, type FriendSlot } from '../../src/lib/friends';
import {
  loadBoard,
  myGroups,
  subscribeColors,
  type BoardSlot,
  type Group,
} from '../../src/lib/groups';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

type Tab = 'circles' | 'friends';

export default function BoardScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();

  const [tab, setTab] = useState<Tab>('circles');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [slots, setSlots] = useState<BoardSlot[]>([]);
  const [friends, setFriends] = useState<FriendSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [gs, fs] = await Promise.all([myGroups(userId), loadFriendBoard(userId)]);
    setGroups(gs);
    setFriends(fs);
    setActiveId((prev) => (prev && gs.some((g) => g.id === prev) ? prev : gs[0]?.id ?? null));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      refresh()
        .catch(() => {})
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [refresh]),
  );

  useEffect(() => {
    if (!activeId) {
      setSlots([]);
      return;
    }
    loadBoard(activeId).then(setSlots).catch(() => {});
  }, [activeId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeColors(() => {
      if (activeId) loadBoard(activeId).then(setSlots).catch(() => {});
      loadFriendBoard(userId).then(setFriends).catch(() => {});
    });
  }, [activeId, userId]);

  if (loading) {
    return (
      <Screen title="Board">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  const active = groups.find((g) => g.id === activeId) ?? null;
  const shown =
    tab === 'circles'
      ? slots
      : friends.map((f) => ({ profile: f.profile, color: f.color }));
  const filled = shown.filter((s) => s.color).length;

  return (
    <Screen title="Board">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.segment, { backgroundColor: t.surface2 }]}>
          {(['circles', 'friends'] as Tab[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={[
                styles.segmentBtn,
                tab === k && { backgroundColor: t.surface },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: tab === k ? t.ink : t.inkMuted },
                ]}
              >
                {k === 'circles' ? 'Circles' : 'Friends'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'circles' ? (
          groups.length === 0 ? (
            <Empty
              copy="You're not in a circle yet. Start one and share the code, or join with a friend's."
              action="Manage circles"
              onPress={() => router.push('/circles')}
            />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {groups.map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => setActiveId(g.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: g.id === activeId ? t.accent : t.surface,
                          borderColor: g.id === activeId ? t.accent : t.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: g.id === activeId ? '#fff' : t.inkMuted },
                        ]}
                      >
                        {g.name}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => router.push('/circles')}
                    style={[styles.chip, { borderColor: t.line, borderStyle: 'dashed' }]}
                  >
                    <Text style={[styles.chipText, { color: t.inkMuted }]}>+ Manage</Text>
                  </Pressable>
                </View>
              </ScrollView>

              {active ? (
                <View style={styles.headRow}>
                  <Text style={[styles.sub, { color: t.inkMuted }]}>
                    {filled} of {shown.length} shared today
                  </Text>
                  <View style={[styles.codePill, { backgroundColor: t.surface2 }]}>
                    <Text style={[styles.codeText, { color: t.inkMuted }]}>
                      {active.invite_code}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )
        ) : friends.length === 0 ? (
          <Empty
            copy="No friends yet. Find people by name and send a request."
            action="Find friends"
            onPress={() => router.push('/friends')}
          />
        ) : (
          <View style={styles.headRow}>
            <Text style={[styles.sub, { color: t.inkMuted }]}>
              {filled} of {shown.length} shared today
            </Text>
            <Pressable onPress={() => router.push('/friends')}>
              <Text style={[styles.link, { color: t.accent }]}>Manage ›</Text>
            </Pressable>
          </View>
        )}

        {shown.length > 0 ? (
          <View style={styles.grid}>
            {shown.map((s) => (
              <View key={s.profile.id} style={styles.slot}>
                {s.color ? (
                  <Orb size={54} fills={[]} colorOverride={s.color} />
                ) : (
                  <View style={[styles.waiting, { borderColor: t.line }]} />
                )}
                <Avatar profile={s.profile} size={22} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.slotName,
                    { color: s.color ? t.inkMuted : t.inkFaint },
                  ]}
                >
                  {s.profile.id === userId ? 'You' : s.profile.display_name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {shown.length > 0 ? (
          <Text style={[styles.footnote, { color: t.inkFaint }]}>
            Only colors show here. Notes and media never leave your lane.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Empty({
  copy,
  action,
  onPress,
}: {
  copy: string;
  action: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyCopy, { color: t.inkMuted }]}>{copy}</Text>
      <Pressable onPress={onPress} style={[styles.btn, { backgroundColor: t.accent }]}>
        <Text style={[styles.btnText, { color: '#fff' }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
  segment: { flexDirection: 'row', borderRadius: radii.pill, padding: 3 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { fontSize: 13 },
  link: { fontSize: 13, fontWeight: '700' },
  codePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  codeText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  slot: { width: 64, alignItems: 'center', gap: 4 },
  waiting: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  slotName: { fontSize: 11, fontWeight: '600', maxWidth: 64, textAlign: 'center' },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyCopy: { fontSize: 15, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  btn: { paddingVertical: 13, paddingHorizontal: 26, borderRadius: radii.pill },
  btnText: { fontSize: 15, fontWeight: '700' },
});
