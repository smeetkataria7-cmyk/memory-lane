import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmotionPicker } from '../../src/components/EmotionPicker';
import { Orb } from '../../src/components/Orb';
import { Recaps } from '../../src/components/Recaps';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/lib/auth';
import { listBalls, todayKey, type Ball } from '../../src/lib/balls';
import { refreshReminders } from '../../src/lib/reminders';
import { useEmotionPool } from '../../src/lib/useEmotionPool';
import { POOL_TOTAL, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function TodayScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const pool = useEmotionPool();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [existing, setExisting] = useState<Ball | null>(null);
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setEditing(false);
      if (!userId) {
        setChecked(true);
        return;
      }
      listBalls(userId, 400)
        .then((all) => {
          if (!alive) return;
          const today = all.find((b) => b.day === todayKey()) ?? null;
          setBalls(all);
          setExisting(today);
          setChecked(true);
          refreshReminders(today !== null).catch(() => {});
        })
        .catch(() => alive && setChecked(true));
      return () => {
        alive = false;
      };
    }, [userId]),
  );

  const startEditing = () => {
    if (existing) {
      pool.load(existing.fills as { emotion: any; weight: number }[]);
    }
    setEditing(true);
  };

  const empty = pool.used === 0;
  const showPicker = !existing || editing;

  if (checked && !showPicker) {
    return (
      <Screen title="Today">
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.done}>
            <Orb size={180} fills={existing!.fills} />
            <Text style={[styles.doneTitle, { color: t.ink }]}>Today is filled in.</Text>
            {existing!.note ? (
              <Text style={[styles.doneNote, { color: t.inkMuted }]}>{existing!.note}</Text>
            ) : null}
            <View style={styles.doneActions}>
              <Pressable
                onPress={() => router.push('/lane')}
                style={[styles.btn, { backgroundColor: t.surface2 }]}
              >
                <Text style={[styles.btnText, { color: t.inkMuted }]}>See your lane</Text>
              </Pressable>
              <Pressable
                onPress={startEditing}
                style={[styles.btn, { backgroundColor: t.accent }]}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Edit</Text>
              </Pressable>
            </View>
          </View>
          <Recaps balls={balls} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen title="Today">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.orbWrap}>
          <Orb size={180} fills={pool.fills} />
          {empty ? (
            <Text style={[styles.hint, { color: t.inkMuted }]}>
              Hold an emotion below to start filling today's orb.
            </Text>
          ) : (
            <View style={[styles.meter, { backgroundColor: t.surface2 }]}>
              <View
                style={[
                  styles.meterFill,
                  {
                    backgroundColor: t.accent,
                    width: `${Math.min(100, (pool.used / POOL_TOTAL) * 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <EmotionPicker
          weights={pool.weights}
          onHoldStart={pool.start}
          onHoldEnd={pool.stop}
          onClearOne={pool.clearOne}
        />

        <View style={styles.actions}>
          {!empty && (
            <Pressable
              onPress={pool.reset}
              style={[styles.btn, { backgroundColor: t.surface2 }]}
            >
              <Text style={[styles.btnText, { color: t.inkMuted }]}>Start over</Text>
            </Pressable>
          )}
          <Pressable
            disabled={empty}
            onPress={() =>
              router.push({
                pathname: '/compose',
                params: { fills: JSON.stringify(pool.fills) },
              })
            }
            style={[
              styles.btn,
              styles.btnPrimary,
              { backgroundColor: empty ? t.surface2 : t.accent },
            ]}
          >
            <Text style={[styles.btnText, { color: empty ? t.inkFaint : '#fff' }]}>
              Continue
            </Text>
          </Pressable>
        </View>

        <Recaps balls={balls} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl, gap: spacing.lg },
  orbWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  hint: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  meter: { width: 180, height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: radii.pill },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: radii.pill },
  btnPrimary: { minWidth: 140, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  doneNote: { fontSize: 15, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  doneActions: { flexDirection: 'row', gap: spacing.sm },
});
