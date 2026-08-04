import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { BASE_Y, treeLayout } from '../lib/treeGeometry';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export { STAGES, nextStage, stageFor, type PlantStage } from '../lib/treeGeometry';

// The tree is the streak, and the leaves are the days themselves: each one
// carries the blended colour of a day you filled in.
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
  const bark = t.inkFaint;
  const layout = treeLayout(streak, colors, t.good);

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy={BASE_Y + 4} rx="26" ry="5" fill={bark} opacity={0.25} />

        {layout.index === 0 ? (
          <Ellipse cx="50" cy={BASE_Y - 3} rx="7" ry="5.5" fill={bark} opacity={0.7} />
        ) : (
          <>
            <Path
              d={`M50 ${BASE_Y} L50 ${BASE_Y - layout.stem}`}
              stroke={bark}
              strokeWidth={layout.strokeWidth}
              strokeLinecap="round"
            />

            {layout.branches ? (
              <>
                <Path
                  d={`M50 ${BASE_Y - layout.stem * 0.55} Q 38 ${BASE_Y - layout.stem * 0.78} 33 ${BASE_Y - layout.stem * 0.58}`}
                  stroke={bark}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={`M50 ${BASE_Y - layout.stem * 0.4} Q 62 ${BASE_Y - layout.stem * 0.62} 67 ${BASE_Y - layout.stem * 0.42}`}
                  stroke={bark}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : null}

            {layout.leaves.map((l, i) => (
              <Circle
                key={i}
                cx={l.cx}
                cy={l.cy}
                r={layout.leafR}
                fill={l.fill}
                opacity={0.95}
              />
            ))}
          </>
        )}
      </Svg>
      {showLabel ? (
        <Text style={[styles.stage, { color: t.ink }]}>{layout.stageName}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { fontSize: 14, fontWeight: '700' },
});
