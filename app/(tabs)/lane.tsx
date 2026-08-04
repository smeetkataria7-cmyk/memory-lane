import { LinearGradient } from 'expo-linear-gradient';
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
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/lib/auth';
import { listBalls, type Ball } from '../../src/lib/balls';
import { buildLane, monthLabel, type LaneCell } from '../../src/lib/lane';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

// The vault is deliberately dark in both themes: a lit orb only reads as lit
// against something darker than it is. This is the one screen that opts out
// of the paper palette.
const VAULT_TOP = '#191527';
const VAULT_BOTTOM = '#0e0c16';
const VAULT_EDGE = '#3b2f1c';

// Gold is a gradient, not a colour. A flat band reads as painted card; what
// makes metal look like metal is the fast ramp from a near-white specular
// down through saturated gold into a deep shadow. These ramps run top-to-
// bottom on the shelves (lit from above by the orbs) and left-to-right on
// the uprights (so they read as round columns).
type Ramp = readonly [string, string, ...string[]];

const LIP_RAMP: Ramp = ['#fffaf0', '#ffe9a8', '#f0c552', '#b8871f'];
const BOARD_RAMP: Ramp = ['#c99a34', '#9a7024', '#6b4a14', '#4a3210'];
const UPRIGHT_RAMP: Ramp = ['#3d2a0b', '#a87c26', '#f5dc94', '#c9a052', '#4a340f'];
// Mirrored so the two columns catch the light from opposite sides.
const UPRIGHT_RAMP_R: Ramp = ['#4a340f', '#c9a052', '#f5dc94', '#a87c26', '#3d2a0b'];
const SHEEN: Ramp = ['#ffffff00', '#ffffff26', '#ffffff00'];
const SHELF_LIP = '#e8c377';
const VAULT_INK = '#e8dcc0';
const VAULT_INK_FAINT = '#8a7b5c';

// Seven to a shelf, so a row is a week and every shelf is full.
const PER_SHELF = 7;
const ORB = 40;

export default function LaneScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);

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
            Nothing on the shelves yet. Fill today's orb and it will be the first.
          </Text>
        </View>
      </Screen>
    );
  }

  const months = buildLane(balls);
  const lit = balls.length;

  return (
    <Screen title="Lane">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <LinearGradient
          colors={[VAULT_TOP, VAULT_BOTTOM]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.vault}
        >
          {/* Uprights the shelves appear to be fixed to, lit from the inside. */}
          <LinearGradient
            colors={UPRIGHT_RAMP}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.upright, styles.uprightLeft]}
          />
          <LinearGradient
            colors={UPRIGHT_RAMP_R}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.upright, styles.uprightRight]}
          />

          <View style={styles.racks}>
            {months.map((m) => (
              <View key={m.key} style={styles.rack}>
                <View style={styles.rackHead}>
                  <Text style={styles.rackLabel}>{monthLabel(m.key)}</Text>
                  <Text style={styles.rackCount}>
                    {m.cells.filter((c) => c.ball).length}/{m.cells.length}
                  </Text>
                </View>
                {chunk(m.cells, PER_SHELF).map((row, i) => (
                  <Shelf
                    key={`${m.key}-${i}`}
                    cells={row}
                    onOpen={(day) =>
                      router.push({ pathname: '/ball/[day]', params: { day } })
                    }
                  />
                ))}
              </View>
            ))}
          </View>
        </LinearGradient>

        <Text style={[styles.footnote, { color: t.inkFaint }]}>
          {lit} {lit === 1 ? 'memory' : 'memories'} on the shelves. Tap one to open it.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function Shelf({
  cells,
  onOpen,
}: {
  cells: LaneCell[];
  onOpen: (day: string) => void;
}) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfRow}>
        {cells.map((cell) => (
          <Socket key={cell.day} cell={cell} onOpen={onOpen} />
        ))}
        {/* A short final week still spans the shelf. */}
        {Array.from({ length: PER_SHELF - cells.length }, (_, i) => (
          <View key={`pad-${i}`} style={styles.cell} />
        ))}
      </View>
      {/* The leading edge: a hard specular line where the light off the orbs
          catches the rounded front of the rail. */}
      <LinearGradient
        colors={LIP_RAMP}
        locations={[0, 0.18, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.shelfLip}
      />
      {/* The board below it, falling into shadow. */}
      <LinearGradient
        colors={BOARD_RAMP}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.shelfBoard}
      >
        {/* A sheen sweeping along the length, so the metal is not uniform
            across the width the way a painted bar would be. */}
        <LinearGradient
          colors={SHEEN}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </LinearGradient>
    </View>
  );
}

function Socket({
  cell,
  onOpen,
}: {
  cell: LaneCell;
  onOpen: (day: string) => void;
}) {
  if (!cell.ball) {
    return (
      <View style={styles.cell}>
        <View style={[styles.socket, cell.future && styles.socketFuture]} />
        <Text style={[styles.dayNum, cell.future && styles.dayNumFuture]}>
          {cell.dayOfMonth}
        </Text>
      </View>
    );
  }

  return (
    <Pressable style={styles.cell} onPress={() => onOpen(cell.day)}>
      <Orb size={ORB} fills={cell.ball.fills} glow />
      <Text style={[styles.dayNum, styles.dayNumLit]}>{cell.dayOfMonth}</Text>
      {cell.ball.journey ? <View style={styles.pin} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  empty: { fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  // flexGrow lets the vault fill the screen when there is little to show,
  // so it reads as a room rather than a card floating in space.
  scroll: { flexGrow: 1, paddingBottom: spacing.lg },
  vault: {
    flex: 1,
    borderColor: VAULT_EDGE,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    paddingVertical: spacing.md,
  },
  upright: { position: 'absolute', top: 0, bottom: 0, width: 10 },
  uprightLeft: { left: 0 },
  uprightRight: { right: 0 },
  racks: { paddingHorizontal: 14, gap: spacing.lg },
  rack: { gap: 2 },
  rackHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rackLabel: {
    color: VAULT_INK,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  rackCount: {
    color: VAULT_INK_FAINT,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  shelf: { marginBottom: spacing.sm },
  shelfRow: { flexDirection: 'row', alignItems: 'flex-end' },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  // An empty socket is a brass cradle with nothing resting in it.
  socket: {
    width: ORB * 0.42,
    height: ORB * 0.42,
    marginVertical: ORB * 0.29,
    borderRadius: ORB,
    borderWidth: 1,
    borderColor: SHELF_LIP,
    opacity: 0.3,
  },
  socketFuture: { opacity: 0.15 },
  dayNum: {
    color: VAULT_INK_FAINT,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    marginTop: -1,
  },
  dayNumLit: { color: VAULT_INK, fontWeight: '600' },
  dayNumFuture: { opacity: 0.4 },
  shelfLip: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 3,
  },
  shelfBoard: {
    height: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#ffd76a',
  },
  footnote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
