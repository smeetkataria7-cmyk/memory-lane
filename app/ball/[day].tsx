import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../../src/components/Orb';
import { useAuth } from '../../src/lib/auth';
import {
  getBall,
  listMedia,
  setBoardShare,
  setJourneyPin,
  signedMediaUrl,
  type Ball,
  type BallMedia,
} from '../../src/lib/balls';
import { journeyReasonLabel } from '../../src/lib/journey';
import { formatDay } from '../../src/lib/lane';
import { EMOTIONS, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function BallDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { day } = useLocalSearchParams<{ day: string }>();

  const [ball, setBall] = useState<Ball | null>(null);
  const [media, setMedia] = useState<(BallMedia & { url: string | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId || !day) return;
    getBall(userId, day)
      .then(async (b) => {
        if (!alive) return;
        setBall(b);
        if (b) {
          const rows = await listMedia(b.id);
          const withUrls = await Promise.all(
            rows.map(async (r) => ({ ...r, url: await signedMediaUrl(r.storage_path) })),
          );
          if (alive) setMedia(withUrls);
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, day]);

  const togglePin = async () => {
    if (!ball) return;
    const next = !ball.journey;
    setBall({ ...ball, journey: next, journey_reason: next ? 'manual' : null });
    try {
      await setJourneyPin(ball.id, next);
    } catch {
      setBall(ball);
    }
  };

  const toggleShare = async (value: boolean) => {
    if (!ball) return;
    setBall({ ...ball, shared_to_board: value });
    try {
      await setBoardShare(ball.id, value);
    } catch {
      setBall(ball);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  if (!ball) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <Text style={{ color: t.inkMuted }}>Nothing was saved for this day.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const total = ball.fills.reduce((s, f) => s + f.weight, 0) || 1;
  const sorted = [...ball.fills].sort((a, b) => b.weight - a.weight);

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

      <View style={styles.head}>
        <Orb size={180} fills={ball.fills} />
        <Text style={[styles.date, { color: t.ink }]}>{formatDay(ball.day)}</Text>
        {ball.journey && ball.journey_reason ? (
          <View style={[styles.pill, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.pillText, { color: t.accent }]}>
              ✦ {journeyReasonLabel[ball.journey_reason]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bars}>
        {sorted.map((f) => {
          const meta = EMOTIONS.find((e) => e.key === f.emotion)!;
          return (
            <View key={f.emotion} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: t.inkMuted }]}>{meta.label}</Text>
              <View style={[styles.barTrack, { backgroundColor: t.surface2 }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: meta.color, width: `${(f.weight / total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.barPct, { color: t.inkFaint }]}>
                {Math.round(f.weight)}%
              </Text>
            </View>
          );
        })}
      </View>

      {ball.note ? (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[styles.note, { color: t.ink }]}>{ball.note}</Text>
        </View>
      ) : null}

      {media.length > 0 ? (
        <View style={styles.mediaGrid}>
          {media.map((m) =>
            m.kind === 'photo' && m.url ? (
              <Image key={m.id} source={{ uri: m.url }} style={styles.photo} />
            ) : (
              <View
                key={m.id}
                style={[styles.photo, styles.mediaAlt, { backgroundColor: t.surface2 }]}
              >
                <Text style={{ color: t.inkMuted, fontWeight: '700' }}>
                  {m.kind === 'audio' ? '♪' : '▶'}
                </Text>
              </View>
            ),
          )}
        </View>
      ) : null}

      <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: t.ink }]}>Keep in Journey</Text>
          <Text style={[styles.rowSub, { color: t.inkMuted }]}>
            {ball.journey_reason && ball.journey_reason !== 'manual'
              ? 'Flagged automatically — you can still turn this off.'
              : 'Pin any day you want to keep, spike or not.'}
          </Text>
        </View>
        <Switch value={ball.journey} onValueChange={togglePin} />
      </View>

      <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: t.ink }]}>Share to the group board</Text>
          <Text style={[styles.rowSub, { color: t.inkMuted }]}>
            Only the color leaves this screen.
          </Text>
        </View>
        <Switch value={ball.shared_to_board} onValueChange={toggleShare} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  head: { alignItems: 'center', gap: spacing.sm },
  date: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  bars: { gap: 6, marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { fontSize: 13, width: 108 },
  barTrack: { flex: 1, height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.pill },
  barPct: { fontSize: 12, width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  note: { fontSize: 16, lineHeight: 24 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 100, height: 100, borderRadius: radii.sm },
  mediaAlt: { alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 13 },
});
