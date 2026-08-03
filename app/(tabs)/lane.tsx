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
import Svg, { Circle as SvgCircle, Line } from 'react-native-svg';
import { Orb } from '../../src/components/Orb';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/lib/auth';
import { listBalls, type Ball } from '../../src/lib/balls';
import { buildLane, monthLabel, type LaneCell } from '../../src/lib/lane';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

const SPIRAL_WIDTH = 28;
const HOLE_RADIUS = 4;
const HOLE_SPACING = 32;

function SpiralBinding({ height }: { height: number }) {
  const t = useTheme();
  const holeCount = Math.max(3, Math.floor(height / HOLE_SPACING));
  const holes = Array.from({ length: holeCount }, (_, i) => {
    const y = HOLE_SPACING / 2 + i * HOLE_SPACING;
    return y;
  });

  return (
    <View style={styles.spiralCol}>
      <View style={[styles.spiralSpine, { backgroundColor: t.line }]} />
      <Svg width={SPIRAL_WIDTH} height={height} style={styles.spiralSvg}>
        {holes.map((y) => (
          <SvgCircle
            key={y}
            cx={SPIRAL_WIDTH / 2}
            cy={y}
            r={HOLE_RADIUS}
            fill={t.paper}
            stroke={t.inkFaint}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function LaneScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageHeight, setPageHeight] = useState(400);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!userId) return;
      setLoading(true);
      listBalls(userId)
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
      <Screen title="Lane">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  if (balls.length === 0) {
    return (
      <Screen title="Lane">
        <View style={styles.center}>
          <Text style={[styles.empty, { color: t.inkMuted }]}>
            Nothing here yet. Fill today's orb and it will be the first.
          </Text>
        </View>
      </Screen>
    );
  }

  const months = buildLane(balls);

  return (
    <Screen title="Lane">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.notebook}>
          <SpiralBinding height={pageHeight} />
          <View
            style={[styles.page, { backgroundColor: t.surface, borderColor: t.line }]}
            onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
          >
            {months.map((m) => (
              <View key={m.key} style={styles.month}>
                <Text style={[styles.monthName, { color: t.inkMuted }]}>
                  {monthLabel(m.key)}
                </Text>
                <View style={styles.grid}>
                  {m.cells.map((cell: LaneCell) => (
                    <LaneDot
                      key={cell.day}
                      cell={cell}
                      onPress={() =>
                        cell.ball && router.push({ pathname: '/ball/[day]', params: { day: cell.day } })
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function LaneDot({ cell, onPress }: { cell: LaneCell; onPress: () => void }) {
  const t = useTheme();
  if (!cell.ball) {
    return (
      <View style={styles.cell}>
        <View style={[styles.blank, { borderColor: t.line }]} />
        <Text style={[styles.dayNum, { color: t.inkFaint }]}>{cell.dayOfMonth}</Text>
      </View>
    );
  }
  return (
    <Pressable style={styles.cell} onPress={onPress}>
      <Orb size={38} fills={cell.ball.fills} />
      <Text style={[styles.dayNum, { color: t.inkMuted }]}>{cell.dayOfMonth}</Text>
      {cell.ball.journey ? (
        <View style={[styles.pin, { backgroundColor: t.accent }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  empty: { fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  scroll: { paddingBottom: spacing.xl, paddingRight: spacing.sm },
  notebook: { flexDirection: 'row', minHeight: 200 },
  spiralCol: {
    width: SPIRAL_WIDTH,
    alignItems: 'center',
    zIndex: 1,
  },
  spiralSpine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 2,
  },
  spiralSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  page: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRadius: radii.md,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: spacing.md,
    gap: spacing.lg,
  },
  month: { gap: spacing.sm },
  monthName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: 44, alignItems: 'center', gap: 2, position: 'relative' },
  blank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dayNum: { fontSize: 10, fontVariant: ['tabular-nums'] },
  pin: {
    position: 'absolute',
    top: 0,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
});
