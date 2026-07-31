import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmotionPicker } from '../../src/components/EmotionPicker';
import { Orb } from '../../src/components/Orb';
import { Screen } from '../../src/components/Screen';
import { useEmotionPool } from '../../src/lib/useEmotionPool';
import { POOL_TOTAL, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function TodayScreen() {
  const t = useTheme();
  const pool = useEmotionPool();
  const empty = pool.used === 0;

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl, gap: spacing.lg },
  orbWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  hint: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  meter: {
    width: 180,
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: radii.pill },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
  },
  btnPrimary: { minWidth: 140, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
