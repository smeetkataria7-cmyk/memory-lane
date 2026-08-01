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

// The plant is the streak: it grows with consecutive days and
// drops back to a seed when the run breaks.
export function StreakPlant({ streak, size = 150 }: { streak: number; size?: number }) {
  const t = useTheme();
  const { index } = stageFor(streak);
  const green = t.good;
  const soil = t.inkFaint;

  // Sized so the tallest stage still fits inside the 100x100 viewBox.
  const stemHeight = [0, 12, 24, 34, 42][index];
  const foliage = [0, 8, 14, 21, 27][index];
  const baseY = 88;

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy={baseY + 4} rx="26" ry="5" fill={soil} opacity={0.25} />

        {index === 0 ? (
          <Ellipse cx="50" cy={baseY - 3} rx="7" ry="5.5" fill={soil} opacity={0.7} />
        ) : (
          <>
            <Path
              d={`M50 ${baseY} L50 ${baseY - stemHeight}`}
              stroke={green}
              strokeWidth={index >= 3 ? 5 : 3}
              strokeLinecap="round"
            />
            {index >= 2 ? (
              <>
                <Path
                  d={`M50 ${baseY - stemHeight * 0.55} Q ${38} ${baseY - stemHeight * 0.75} ${34} ${baseY - stemHeight * 0.5}`}
                  stroke={green}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={`M50 ${baseY - stemHeight * 0.4} Q ${62} ${baseY - stemHeight * 0.6} ${66} ${baseY - stemHeight * 0.35}`}
                  stroke={green}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : null}
            <Circle cx="50" cy={baseY - stemHeight - foliage * 0.45} r={foliage} fill={green} />
            {index >= 3 ? (
              <>
                <Circle
                  cx={50 - foliage * 0.72}
                  cy={baseY - stemHeight - foliage * 0.1}
                  r={foliage * 0.62}
                  fill={green}
                  opacity={0.92}
                />
                <Circle
                  cx={50 + foliage * 0.72}
                  cy={baseY - stemHeight - foliage * 0.1}
                  r={foliage * 0.62}
                  fill={green}
                  opacity={0.92}
                />
              </>
            ) : null}
          </>
        )}
      </Svg>
      <Text style={[styles.stage, { color: t.ink }]}>{STAGES[index].name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { fontSize: 14, fontWeight: '700' },
});
