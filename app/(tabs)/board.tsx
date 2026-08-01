import { useFocusEffect } from 'expo-router';
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
import { Orb } from '../../src/components/Orb';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/lib/auth';
import {
  createGroup,
  joinGroup,
  loadBoard,
  myGroup,
  subscribeBoard,
  type BoardSlot,
  type Group,
} from '../../src/lib/groups';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function BoardScreen() {
  const t = useTheme();
  const { userId } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [slots, setSlots] = useState<BoardSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const g = await myGroup(userId);
    setGroup(g);
    if (g) setSlots(await loadBoard(g.id));
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
    if (!group) return;
    return subscribeBoard(group.id, () => {
      loadBoard(group.id).then(setSlots).catch(() => {});
    });
  }, [group]);

  if (loading) {
    return (
      <Screen title="Board">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  if (!group) {
    return <GroupSetup onDone={refresh} />;
  }

  const filled = slots.filter((s) => s.color).length;

  return (
    <Screen title="Board">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headRow}>
          <View>
            <Text style={[styles.groupName, { color: t.ink }]}>{group.name}</Text>
            <Text style={[styles.sub, { color: t.inkMuted }]}>
              {filled} of {slots.length} filled today
            </Text>
          </View>
          <View style={[styles.codePill, { backgroundColor: t.surface2 }]}>
            <Text style={[styles.codeText, { color: t.inkMuted }]}>{group.invite_code}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {slots.map((s) => (
            <View key={s.userId} style={styles.slot}>
              {s.color ? (
                <Orb size={54} fills={[]} colorOverride={s.color} />
              ) : (
                <View style={[styles.waiting, { borderColor: t.line }]} />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.slotName,
                  { color: s.color ? t.inkMuted : t.inkFaint },
                ]}
              >
                {s.userId === userId ? 'You' : s.displayName}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.footnote, { color: t.inkFaint }]}>
          Only colors show here. Notes and media never leave your lane.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function GroupSetup({ onDone }: { onDone: () => Promise<void> }) {
  const t = useTheme();
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Board">
      <ScrollView contentContainerStyle={styles.setup} showsVerticalScrollIndicator={false}>
        <Text style={[styles.setupLead, { color: t.inkMuted }]}>
          The board is one closed group of up to 20 people. No feed, no strangers.
        </Text>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[styles.cardTitle, { color: t.ink }]}>Start a group</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={t.inkFaint}
            style={[styles.input, { backgroundColor: t.paper, borderColor: t.line, color: t.ink }]}
          />
          <Pressable
            disabled={busy || !name.trim() || !userId}
            onPress={() => run(() => createGroup(userId!, name.trim()))}
            style={[
              styles.btn,
              { backgroundColor: !name.trim() ? t.surface2 : t.accent },
            ]}
          >
            <Text style={[styles.btnText, { color: !name.trim() ? t.inkFaint : '#fff' }]}>
              Create
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[styles.cardTitle, { color: t.ink }]}>Join with a code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="ABC123"
            placeholderTextColor={t.inkFaint}
            autoCapitalize="characters"
            style={[styles.input, { backgroundColor: t.paper, borderColor: t.line, color: t.ink }]}
          />
          <Pressable
            disabled={busy || !code.trim()}
            onPress={() => run(() => joinGroup(code))}
            style={[styles.btn, { backgroundColor: !code.trim() ? t.surface2 : t.accent }]}
          >
            <Text style={[styles.btnText, { color: !code.trim() ? t.inkFaint : '#fff' }]}>
              Join
            </Text>
          </Pressable>
        </View>

        {busy ? <ActivityIndicator color={t.accent} /> : null}
        {error ? <Text style={{ color: t.danger }}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13 },
  codePill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill },
  codeText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  slot: { width: 62, alignItems: 'center', gap: 5 },
  waiting: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  slotName: { fontSize: 11, fontWeight: '600', maxWidth: 62, textAlign: 'center' },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  setup: { gap: spacing.md, paddingBottom: spacing.xl },
  setupLead: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: { borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
