import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StreakPlant, nextStage } from '../../src/components/StreakPlant';
import { useAuth, signOut } from '../../src/lib/auth';
import { listBalls, type Ball } from '../../src/lib/balls';
import { currentStreak } from '../../src/lib/lane';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileScreen() {
  const t = useTheme();
  const { userId, session } = useAuth();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!userId) return;
      listBalls(userId, 400)
        .then((b) => alive && setBalls(b))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [userId]),
  );

  if (loading) {
    return (
      <Screen title="Profile">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  const streak = currentStreak(balls);
  const next = nextStage(streak);
  const journeyCount = balls.filter((b) => b.journey).length;
  const name =
    (session?.user.user_metadata?.display_name as string) ||
    session?.user.email?.split('@')[0] ||
    'You';

  return (
    <Screen title="Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.name, { color: t.ink }]}>{name}</Text>

        <View style={[styles.plantCard, { backgroundColor: t.surface, borderColor: t.line }]}>
          <StreakPlant streak={streak} />
          <Text style={[styles.streakNum, { color: t.ink }]}>
            {streak} {streak === 1 ? 'day' : 'days'} in a row
          </Text>
          <Text style={[styles.streakSub, { color: t.inkMuted }]}>
            {streak === 0
              ? 'Fill today to plant a seed.'
              : next
                ? `${next.minDays - streak} more to reach ${next.name.toLowerCase()}.`
                : 'Fully grown. Keep it alive.'}
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.statNum, { color: t.ink }]}>{balls.length}</Text>
            <Text style={[styles.statLabel, { color: t.inkMuted }]}>days filled</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.statNum, { color: t.ink }]}>{journeyCount}</Text>
            <Text style={[styles.statLabel, { color: t.inkMuted }]}>in Journey</Text>
          </View>
        </View>

        <Pressable
          onPress={signOut}
          style={[styles.signOut, { borderColor: t.line }]}
        >
          <Text style={[styles.signOutText, { color: t.danger }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
  name: { fontSize: 20, fontWeight: '700' },
  plantCard: {
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  streakNum: { fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  streakSub: { fontSize: 14, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12 },
  signOut: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
});
