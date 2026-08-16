import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../src/components/Orb';
import { useAuth } from '../src/lib/auth';
import { listBalls, type Ball } from '../src/lib/balls';
import { refreshWidgets } from '../src/lib/widgets';
import { formatDay, monthLabel } from '../src/lib/lane';
import { availableMonths, monthMoments } from '../src/lib/recaps';
import { radii, spacing, typography } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function MomentsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    listBalls(userId, 400)
      .then((b) => {
        if (!alive) return;
        setBalls(b);
        const months = availableMonths(b);
        setMonth(months[0] ?? null);
        refreshWidgets(b).catch(() => {});
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  const months = availableMonths(balls);

  if (!month) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <Text style={{ color: t.inkMuted, textAlign: 'center' }}>
          Fill a few days and your first month will show up here.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const m = monthMoments(balls, month);

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

      <Text style={[styles.title, { color: t.ink }]}>Moments</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.monthRow}>
          {months.map((k) => (
            <Pressable
              key={k}
              onPress={() => setMonth(k)}
              style={[
                styles.monthChip,
                {
                  backgroundColor: k === month ? t.accent : t.surface,
                  borderColor: k === month ? t.accent : t.line,
                },
              ]}
            >
              <Text
                style={[styles.monthChipText, { color: k === month ? '#fff' : t.inkMuted }]}
              >
                {monthLabel(k)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Text style={[styles.big, { color: t.ink }]}>
          {m.daysFilled} of {m.totalDays} days
        </Text>
        <Text style={[styles.sub, { color: t.inkMuted }]}>
          {m.dominant
            ? `Mostly ${m.dominant.label.toLowerCase()} this month.`
            : 'No days filled in this month.'}
        </Text>

        {m.spread.length > 0 ? (
          <View style={styles.spread}>
            {m.spread.map((s) => (
              <View key={s.emotion} style={styles.spreadRow}>
                <Text style={[styles.spreadLabel, { color: t.inkMuted }]}>{s.label}</Text>
                <View style={[styles.track, { backgroundColor: t.surface2 }]}>
                  <View
                    style={[styles.fill, { backgroundColor: s.color, width: `${s.share}%` }]}
                  />
                </View>
                <Text style={[styles.pct, { color: t.inkFaint }]}>
                  {Math.round(s.share)}%
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {m.heaviest && m.lightest && m.heaviest.id !== m.lightest.id ? (
        <View style={styles.pair}>
          <MiniCard ball={m.lightest} caption="Lightest day" />
          <MiniCard ball={m.heaviest} caption="Heaviest day" />
        </View>
      ) : null}

      {m.journeyDays.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.section, { color: t.inkMuted }]}>
            {m.journeyDays.length} in Journey
          </Text>
          {m.journeyDays.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/ball/[day]', params: { day: b.day } })}
              style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Orb size={44} fills={b.fills} />
              <Text style={[styles.rowDate, { color: t.ink }]}>{formatDay(b.day)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function MiniCard({ ball, caption }: { ball: Ball; caption: string }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ball/[day]', params: { day: ball.day } })}
      style={[styles.mini, { backgroundColor: t.surface, borderColor: t.line }]}
    >
      <Orb size={56} fills={ball.fills} />
      <Text style={[styles.miniCaption, { color: t.inkMuted }]}>{caption}</Text>
      <Text style={[styles.miniDate, { color: t.ink }]}>{ball.day.slice(-2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  title: typography.title,
  monthRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  monthChip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthChipText: { fontSize: 13, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  big: { ...typography.subhead, fontSize: 22 },
  sub: { fontSize: 15 },
  spread: { gap: 6, marginTop: spacing.sm },
  spreadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spreadLabel: { fontSize: 13, width: 104 },
  track: { flex: 1, height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  pct: { fontSize: 12, width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pair: { flexDirection: 'row', gap: spacing.sm },
  mini: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  miniCaption: { fontSize: 12, fontWeight: '700' },
  miniDate: { fontSize: 13, fontVariant: ['tabular-nums'] },
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
  },
  rowDate: { fontSize: 14, fontWeight: '600' },
});
