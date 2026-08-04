import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export type PlantStage = {
  name: string;
  minDays: number;
};

export const STAGES: PlantStage[] = [
  { name: 'Seed', minDays: 0 },
  { name: 'Sprout', minDays: 1 },
  { name: 'Sapling', minDays: 7 },
  { name: 'Young tree', minDays: 30 },
  { name: 'Full tree', minDays: 90 },
];

export function stageFor(streak: number): { index: number; stage: PlantStage } {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (streak >= STAGES[i].minDays) index = i;
  }
  return { index, stage: STAGES[index] };
}

export function nextStage(streak: number): PlantStage | null {
  return STAGES.find((s) => s.minDays > streak) ?? null;
}

// Sized so the tallest stage still fits inside the 100x100 viewBox.
const STEM = [0, 14, 24, 32, 38];
const CANOPY = [0, 8, 15, 21, 26];
const LEAVES = [0, 3, 8, 14, 22];
const LEAF_R = [0, 4, 4.2, 4.4, 4.6];
const BASE_Y = 88;

// Leaves land on a phyllotactic spiral - the same 137.5° step real plants
// use - so the canopy fills evenly and never looks like a grid. The angle
// is derived from the index, so a given streak always draws the same tree.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// The tree is the streak, and the leaves are the days themselves: each one
// carries the blended colour of a day you filled in, newest at the centre.
export function MemoryTree({
  streak,
  colors = [],
  size = 150,
  showLabel = true,
}: {
  streak: number;
  colors?: string[];
  size?: number;
  showLabel?: boolean;
}) {
  const t = useTheme();
  const { index } = stageFor(streak);

  const stem = STEM[index];
  const canopyR = CANOPY[index];
  const leafR = LEAF_R[index];
  const leafCount = Math.min(LEAVES[index], Math.max(colors.length, LEAVES[index]));
  const canopyCy = BASE_Y - stem - canopyR * 0.35;

  const bark = t.inkFaint;
  const fallback = t.good;

  const leaves = Array.from({ length: leafCount }, (_, k) => {
    const angle = k * GOLDEN_ANGLE;
    const r = canopyR * Math.sqrt((k + 0.5) / Math.max(leafCount, 1));
    return {
      key: k,
      cx: 50 + r * Math.cos(angle),
      // Squashed vertically so the canopy reads as a crown, not a ball.
      cy: canopyCy + r * Math.sin(angle) * 0.82,
      fill: colors.length > 0 ? colors[k % colors.length] : fallback,
    };
  });

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy={BASE_Y + 4} rx="26" ry="5" fill={bark} opacity={0.25} />

        {index === 0 ? (
          <Ellipse cx="50" cy={BASE_Y - 3} rx="7" ry="5.5" fill={bark} opacity={0.7} />
        ) : (
          <>
            <Path
              d={`M50 ${BASE_Y} L50 ${BASE_Y - stem}`}
              stroke={bark}
              strokeWidth={index >= 3 ? 5 : 3}
              strokeLinecap="round"
            />

            {index >= 2 ? (
              <>
                <Path
                  d={`M50 ${BASE_Y - stem * 0.55} Q 38 ${BASE_Y - stem * 0.78} 33 ${BASE_Y - stem * 0.58}`}
                  stroke={bark}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={`M50 ${BASE_Y - stem * 0.4} Q 62 ${BASE_Y - stem * 0.62} 67 ${BASE_Y - stem * 0.42}`}
                  stroke={bark}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : null}

            {leaves.map((l) => (
              <Circle
                key={l.key}
                cx={l.cx}
                cy={l.cy}
                r={leafR}
                fill={l.fill}
                opacity={0.95}
              />
            ))}
          </>
        )}
      </Svg>
      {showLabel ? (
        <Text style={[styles.stage, { color: t.ink }]}>{STAGES[index].name}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { fontSize: 14, fontWeight: '700' },
});
