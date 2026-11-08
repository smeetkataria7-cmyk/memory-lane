import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tapTick } from '../lib/haptics';
import { EMOTIONS, radii, spacing, type EmotionKey } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import type { Weights } from '../lib/useEmotionPool';

type Props = {
  weights: Weights;
  onHoldStart: (key: EmotionKey) => void;
  onHoldEnd: () => void;
  onClearOne: (key: EmotionKey) => void;
  onNudge: (key: EmotionKey, delta: number) => void;
};

// How far one swipe up or down moves an emotion for screen-reader users.
const NUDGE = 5;

export function EmotionPicker({ weights, onHoldStart, onHoldEnd, onClearOne, onNudge }: Props) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {EMOTIONS.map((e) => {
        const w = weights[e.key];
        const pct = Math.round(w);
        return (
          // The clear button is a sibling of the hold area, not a child of
          // it. Nested inside, Android would sometimes hand the touch to the
          // outer Pressable first, so tapping "clear" added weight instead.
          <View
            key={e.key}
            style={[
              styles.chip,
              { backgroundColor: t.surface, borderColor: w > 0 ? e.color : t.line },
            ]}
          >
            <View
              style={[
                styles.fill,
                { backgroundColor: e.color, opacity: 0.22, width: `${pct}%` },
              ]}
            />
            <Pressable
              onPressIn={() => {
                tapTick();
                onHoldStart(e.key);
              }}
              onPressOut={onHoldEnd}
              delayLongPress={100000}
              // Holding is a gesture a screen reader can't make, so the same
              // control also works as a slider: swipe up or down to adjust.
              accessibilityRole="adjustable"
              accessibilityLabel={e.label}
              accessibilityHint="Hold to fill, or swipe up and down to adjust"
              accessibilityValue={{ text: `${pct} percent` }}
              accessibilityActions={[
                { name: 'increment', label: `Add ${NUDGE} percent` },
                { name: 'decrement', label: `Remove ${NUDGE} percent` },
              ]}
              onAccessibilityAction={(ev) => {
                if (ev.nativeEvent.actionName === 'increment') onNudge(e.key, NUDGE);
                if (ev.nativeEvent.actionName === 'decrement') onNudge(e.key, -NUDGE);
              }}
              style={({ pressed }) => [
                styles.hold,
                { transform: [{ scale: pressed ? 1.06 : 1 }] },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: e.color }]} />
              <Text style={[styles.label, { color: t.ink }]} numberOfLines={1}>
                {e.label}
              </Text>
            </Pressable>
            {w > 0 ? (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Clear ${e.label}, now ${pct} percent`}
                onPress={() => {
                  tapTick();
                  onClearOne(e.key);
                }}
                style={styles.clear}
              >
                <Text style={[styles.pct, { color: t.inkMuted }]}>{pct}%</Text>
                <Text style={[styles.clearGlyph, { color: t.inkFaint }]}>✕</Text>
              </Pressable>
            ) : (
              <Text style={[styles.pct, { color: t.inkFaint }]}>hold</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  hold: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  clearGlyph: { fontSize: 12, fontWeight: '700' },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 13, fontWeight: '600' },
  pct: { fontSize: 11, fontWeight: '700' },
});
