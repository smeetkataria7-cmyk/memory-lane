import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/lib/auth';
import {
  createGroup,
  joinGroup,
  leaveGroup,
  memberCounts,
  myGroups,
  type Group,
} from '../src/lib/groups';
import { radii, spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function CirclesScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = async () => {
    if (!userId) return;
    try {
      const gs = await myGroups(userId);
      setGroups(gs);
      setLoadError(null);
      setCounts(await memberCounts(gs.map((g) => g.id)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load circles.');
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const run = async (fn: () => Promise<unknown>, clear?: () => void) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      clear?.();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.paper }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: t.accent }]}>‹ Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: t.ink }]}>Circles</Text>
      <Text style={[styles.lead, { color: t.inkMuted }]}>
        A circle is a closed group of up to 20. You can be in as many as you like, and
        you pick which ones a day goes to each time you share.
      </Text>

      {loading ? (
        <ActivityIndicator color={t.accent} />
      ) : loadError ? (
        <View style={styles.errorBox}>
          <Text style={{ color: t.danger, fontSize: 14 }}>{loadError}</Text>
          <Pressable
            onPress={() => { setLoading(true); refresh().finally(() => setLoading(false)); }}
            style={[styles.btn, { backgroundColor: t.surface2, marginTop: spacing.sm }]}
          >
            <Text style={[styles.btnText, { color: t.inkMuted }]}>Try again</Text>
          </Pressable>
        </View>
      ) : groups.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {groups.map((g) => (
            <CircleCard
              key={g.id}
              group={g}
              members={counts[g.id]}
              onLeave={() => userId && run(() => leaveGroup(userId, g.id))}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.blank, { borderColor: t.line }]}>
          <Text style={[styles.blankTitle, { color: t.ink }]}>No circles yet</Text>
          <Text style={[styles.blankCopy, { color: t.inkMuted }]}>
            Start one below and share the code, or join with a code someone gave you.
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Text style={[styles.cardTitle, { color: t.ink }]}>Start a circle</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Circle name"
          placeholderTextColor={t.inkFaint}
          style={[styles.input, { backgroundColor: t.paper, borderColor: t.line, color: t.ink }]}
        />
        <Pressable
          disabled={busy || !name.trim() || !userId}
          onPress={() => run(() => createGroup(name), () => setName(''))}
          style={[styles.btn, { backgroundColor: !name.trim() ? t.surface2 : t.accent }]}
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
          disabled={busy || !code.trim() || !userId}
          onPress={() => run(() => joinGroup(code), () => setCode(''))}
          style={[styles.btn, { backgroundColor: !code.trim() ? t.surface2 : t.accent }]}
        >
          <Text style={[styles.btnText, { color: !code.trim() ? t.inkFaint : '#fff' }]}>
            Join
          </Text>
        </Pressable>
      </View>

      {busy ? <ActivityIndicator color={t.accent} /> : null}
      {error ? (
        <View style={[styles.card, { backgroundColor: t.danger + '18', borderColor: t.danger }]}>
          <Text style={{ color: t.danger, fontSize: 14, fontWeight: '600' }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Circles have no colour of their own, so derive a stable one from the name.
// Same name, same hue, every time - it becomes how you recognise the card.
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

function CircleCard({
  group,
  members,
  onLeave,
}: {
  group: Group;
  members?: number;
  onLeave: () => void;
}) {
  const t = useTheme();
  const hue = hueFor(group.name);
  const tint = `hsl(${hue}, 62%, 55%)`;

  const invite = async () => {
    try {
      await Share.share({
        message: `Join my circle "${group.name}" on Memory Lane — use code ${group.invite_code}`,
      });
    } catch {
      // The user dismissing the share sheet is not an error worth showing.
    }
  };

  return (
    <View style={[styles.card2, { backgroundColor: t.surface, borderColor: t.line }]}>
      <View style={styles.card2Head}>
        <View style={[styles.monogram, { backgroundColor: tint }]}>
          <Text style={styles.monogramText}>
            {group.name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, { color: t.ink }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.rowMeta, { color: t.inkMuted }]}>
            {members === undefined
              ? 'Loading…'
              : `${members} of 20 ${members === 1 ? 'person' : 'people'}`}
          </Text>
        </View>
      </View>

      <View style={[styles.codeStrip, { backgroundColor: t.surface2 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.codeLabel, { color: t.inkFaint }]}>INVITE CODE</Text>
          <Text style={[styles.codeValue, { color: t.ink }]}>{group.invite_code}</Text>
        </View>
        <Pressable onPress={invite} style={[styles.sharePill, { backgroundColor: t.accent }]}>
          <Text style={styles.sharePillText}>Share</Text>
        </Pressable>
      </View>

      <Pressable onPress={onLeave} hitSlop={8} style={styles.leaveRow}>
        <Text style={[styles.leave, { color: t.danger }]}>Leave this circle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700' },
  lead: { fontSize: 15, lineHeight: 22 },
  rowName: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 1 },
  leave: { fontSize: 13, fontWeight: '700' },
  card2: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  card2Head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  monogram: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  codeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  codeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  codeValue: { fontSize: 19, fontWeight: '700', letterSpacing: 3 },
  sharePill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  sharePillText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  leaveRow: { alignSelf: 'flex-start', paddingTop: 2 },
  blank: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  blankTitle: { fontSize: 16, fontWeight: '700' },
  blankCopy: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
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
  errorBox: { alignItems: 'center', paddingVertical: spacing.md },
});
