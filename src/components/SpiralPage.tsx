import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const SPIRAL_WIDTH = 28;
const HOLE_RADIUS = 4;
const HOLE_SPACING = 32;

// A bound page: rings punched down the left edge, content on the paper to
// the right. The binding has to know how tall the page ended up, so the
// page measures itself and the holes are drawn to match.
export function SpiralPage({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [height, setHeight] = useState(240);

  const holeCount = Math.max(3, Math.floor(height / HOLE_SPACING));

  return (
    <View style={styles.notebook}>
      <View style={styles.spiralCol}>
        <View style={[styles.spine, { backgroundColor: t.line }]} />
        <Svg width={SPIRAL_WIDTH} height={height} style={styles.spiralSvg}>
          {Array.from({ length: holeCount }, (_, i) => {
            const cy = HOLE_SPACING / 2 + i * HOLE_SPACING;
            return (
              <SvgCircle
                key={cy}
                cx={SPIRAL_WIDTH / 2}
                cy={cy}
                r={HOLE_RADIUS}
                fill={t.paper}
                stroke={t.inkFaint}
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      </View>
      <View
        style={[styles.page, { backgroundColor: t.surface, borderColor: t.line }]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notebook: { flexDirection: 'row', minHeight: 200 },
  spiralCol: { width: SPIRAL_WIDTH, alignItems: 'center', zIndex: 1 },
  spine: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 2 },
  spiralSvg: { position: 'absolute', top: 0, left: 0 },
  page: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRadius: radii.md,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: spacing.md,
    gap: spacing.md,
  },
});
