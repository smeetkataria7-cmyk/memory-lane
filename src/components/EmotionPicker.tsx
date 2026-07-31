import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EMOTIONS, radii, spacing, type EmotionKey } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import type { Weights } from '../lib/useEmotionPool';

type Props = {
  weights: Weights;
  onHoldStart: (key: EmotionKey) => void;
  onHoldEnd: () => void;
  onClearOne: (key: EmotionKey) => void;
};

export function EmotionPicker({ weights, onHoldStart, onHoldEnd, onClearOne }: Props) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {EMOTIONS.map((e) => {
        const w = weights[e.key];
        const pct = Math.round(w);
        return (
          <Pressable
            key={e.key}
            onPressIn={() => onHoldStart(e.key)}
            onPressOut={onHoldEnd}
            onLongPress={undefined}
            delayLongPress={100000}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: t.surface,
                borderColor: w > 0 ? e.color : t.line,
                transform: [{ scale: pressed ? 1.06 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: e.color,
                  opacity: 0.22,
                  width: `${pct}%`,
                },
              ]}
            />
            <View style={[styles.dot, { backgroundColor: e.color }]} />
            <Text style={[styles.label, { color: t.ink }]} numberOfLines={1}>
              {e.label}
            </Text>
            {w > 0 ? (
              <Pressable hitSlop={8} onPress={() => onClearOne(e.key)}>
                <Text style={[styles.pct, { color: t.inkMuted }]}>{pct}% ✕</Text>
              </Pressable>
            ) : (
              <Text style={[styles.pct, { color: t.inkFaint }]}>hold</Text>
            )}
          </Pressable>
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
