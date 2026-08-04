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
const VAULT_EDGE = '#282243';
const UPRIGHT = '#231d3a';
const UPRIGHT_LIT = '#3a3159';
const SHELF = '#2a2440';
const SHELF_LIP = '#4a4070';
const VAULT_INK = '#d6d0ec';
const VAULT_INK_FAINT = '#615a7d';

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
            colors={[UPRIGHT_LIT, UPRIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.upright, styles.uprightLeft]}
          />
          <LinearGradient
            colors={[UPRIGHT, UPRIGHT_LIT]}
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
      <View style={styles.shelfLip} />
      <View style={styles.shelfBoard} />
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
  socket: {
    width: ORB * 0.42,
    height: ORB * 0.42,
    marginVertical: ORB * 0.29,
    borderRadius: ORB,
    borderWidth: 1,
    borderColor: VAULT_INK_FAINT,
    opacity: 0.4,
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
    height: 2,
    backgroundColor: SHELF_LIP,
    borderRadius: 1,
    marginTop: 3,
    opacity: 0.85,
  },
  shelfBoard: {
    height: 5,
    backgroundColor: SHELF,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
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
