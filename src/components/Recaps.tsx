import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { todayKey, type Ball } from '../lib/balls';
import { journeyReasonLabel } from '../lib/journey';
import { formatDay } from '../lib/lane';
import { onThisDay, resurfaced } from '../lib/recaps';
import { radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Orb } from './Orb';

export function Recaps({ balls }: { balls: Ball[] }) {
  const t = useTheme();
  const router = useRouter();

  const flashbacks = onThisDay(balls);
  const journeyBalls = balls.filter((b) => b.journey);
  const pick = resurfaced(journeyBalls);
  const resurface = pick && pick.day !== todayKey() ? pick : null;

  if (flashbacks.length === 0 && !resurface) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.section, { color: t.inkMuted }]}>Looking back</Text>
        <Pressable onPress={() => router.push('/moments')}>
          <Text style={[styles.link, { color: t.accent }]}>Moments ›</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {flashbacks.map((f) => (
            <Pressable
              key={f.ball.id}
              onPress={() =>
                router.push({ pathname: '/ball/[day]', params: { day: f.ball.day } })
              }
              style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Orb size={56} fills={f.ball.fills} />
              <Text style={[styles.label, { color: t.ink }]}>{f.label}</Text>
              <Text style={[styles.date, { color: t.inkFaint }]} numberOfLines={1}>
                {formatDay(f.ball.day).split(',')[0]}
              </Text>
            </Pressable>
          ))}

          {resurface ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/ball/[day]', params: { day: resurface.day } })
              }
              style={[styles.card, { backgroundColor: t.accentSoft, borderColor: t.accent }]}
            >
              <Orb size={56} fills={resurface.fills} />
              <Text style={[styles.label, { color: t.accent }]}>
                ✦ {resurface.journey_reason
                  ? journeyReasonLabel[resurface.journey_reason]
                  : 'From Journey'}
              </Text>
              <Text style={[styles.date, { color: t.accent }]} numberOfLines={1}>
                {formatDay(resurface.day).split(',')[0]}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  link: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  card: {
    width: 132,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  date: { fontSize: 11 },
});
