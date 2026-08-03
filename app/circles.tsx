import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useAuth } from '../src/lib/auth';
import {
  createGroup,
  joinGroup,
  leaveGroup,
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

  const refresh = async () => {
    if (!userId) return;
    try {
      setGroups(await myGroups(userId));
      setLoadError(null);
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
        A circle is a closed group of up to 20. You can be in as many as you like — your
        color goes to all of them when you share a day.
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
            <View
              key={g.id}
              style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: t.ink }]}>{g.name}</Text>
                <Text style={[styles.rowCode, { color: t.inkFaint }]}>
                  Code {g.invite_code}
                </Text>
              </View>
              <Pressable
                onPress={() => userId && run(() => leaveGroup(userId, g.id))}
                hitSlop={8}
              >
                <Text style={[styles.leave, { color: t.danger }]}>Leave</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

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
          onPress={() => run(() => createGroup(userId!, name), () => setName(''))}
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

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700' },
  lead: { fontSize: 15, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowCode: { fontSize: 12, letterSpacing: 1 },
  leave: { fontSize: 14, fontWeight: '700' },
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
