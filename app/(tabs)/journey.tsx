import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Orb } from '../../src/components/Orb';
import { LoadError } from '../../src/components/LoadError';
import { Screen } from '../../src/components/Screen';
import { SpiralPage } from '../../src/components/SpiralPage';
import { useAuth } from '../../src/lib/auth';
import { listJourney, type Ball } from '../../src/lib/balls';
import { journeyReasonLabel } from '../../src/lib/journey';
import { formatDay } from '../../src/lib/lane';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function JourneyScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!userId) return;
      setLoading(true);
      listJourney(userId)
        .then((b) => {
          if (!alive) return;
          setBalls(b);
          setLoadError(null);
        })
        .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Check your connection and try again.'))
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [userId, reloadKey]),
  );

  if (loading) {
    return (
      <Screen title="Journey">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen title="Journey">
        <LoadError message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      </Screen>
    );
  }

  if (balls.length === 0) {
    return (
      <Screen title="Journey">
        <View style={styles.center}>
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            The big days land here on their own — or pin any day you want to keep.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Journey"
      subtitle={`${balls.length} ${balls.length === 1 ? 'day' : 'days'} kept`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SpiralPage>
          {balls.map((b, i) => (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/ball/[day]', params: { day: b.day } })}
              style={[
                styles.entry,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
              ]}
            >
              <Orb size={64} fills={b.fills} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardDate, { color: t.ink }]}>{formatDay(b.day)}</Text>
                {b.journey_reason ? (
                  <Text style={[styles.cardReason, { color: t.accent }]}>
                    ✦ {journeyReasonLabel[b.journey_reason]}
                  </Text>
                ) : null}
                {b.note ? (
                  <Text numberOfLines={3} style={[styles.cardNote, { color: t.inkMuted }]}>
                    {b.note}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </SpiralPage>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  empty: { fontSize: 15, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  scroll: { paddingBottom: spacing.xl, paddingRight: spacing.sm },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  cardBody: { flex: 1, gap: 2 },
  cardDate: { fontSize: 15, fontWeight: '700' },
  cardReason: { fontSize: 12, fontWeight: '700' },
  cardNote: { fontSize: 13, lineHeight: 19 },
});
