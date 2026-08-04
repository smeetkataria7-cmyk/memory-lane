import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
const VAULT = '#15131f';
const VAULT_EDGE = '#231f33';
const SHELF = '#2f2a45';
const SHELF_LIP = '#443c63';
const VAULT_INK = '#cfc9e6';
const VAULT_INK_FAINT = '#6d6689';

const CELL = 48;
const ORB = 46;

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
  const width = Dimensions.get('window').width;
  // Screen padding, then the vault's own inset, then whatever whole cells fit.
  const usable = width - spacing.md * 2 - spacing.md * 2;
  const perRow = Math.max(4, Math.floor(usable / CELL));

  return (
    <Screen title="Lane">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.vault}>
          {months.map((m) => (
            <View key={m.key} style={styles.rack}>
              <Text style={styles.rackLabel}>{monthLabel(m.key)}</Text>
              {chunk(m.cells, perRow).map((row, i) => (
                <Shelf
                  key={`${m.key}-${i}`}
                  cells={row}
                  perRow={perRow}
                  onOpen={(day) =>
                    router.push({ pathname: '/ball/[day]', params: { day } })
                  }
                />
              ))}
            </View>
          ))}
        </View>
        <Text style={[styles.footnote, { color: t.inkFaint }]}>
          Every orb is a day you filled in. Tap one to open it.
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
  perRow,
  onOpen,
}: {
  cells: LaneCell[];
  perRow: number;
  onOpen: (day: string) => void;
}) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfRow}>
        {cells.map((cell) => (
          <Socket key={cell.day} cell={cell} onOpen={onOpen} />
        ))}
        {/* Keep the last shelf of a month the same width as the others. */}
        {Array.from({ length: perRow - cells.length }, (_, i) => (
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
        <View style={styles.emptySocket} />
        <Text style={styles.dayNum}>{cell.dayOfMonth}</Text>
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
  scroll: { paddingBottom: spacing.xl, gap: spacing.sm },
  vault: {
    backgroundColor: VAULT,
    borderColor: VAULT_EDGE,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.lg,
  },
  rack: { gap: spacing.xs },
  rackLabel: {
    color: VAULT_INK,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  shelf: { marginBottom: spacing.sm },
  shelfRow: { flexDirection: 'row', alignItems: 'flex-end' },
  cell: {
    width: CELL,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  emptySocket: {
    width: ORB * 0.5,
    height: ORB * 0.5,
    marginVertical: ORB * 0.25,
    borderRadius: ORB,
    borderWidth: 1,
    borderColor: VAULT_INK_FAINT,
    opacity: 0.35,
  },
  dayNum: {
    color: VAULT_INK_FAINT,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginTop: -2,
  },
  dayNumLit: { color: VAULT_INK },
  // Two bars: a bright lip catching the light from the orbs above it, and a
  // darker board below for the shelf's thickness.
  shelfLip: {
    height: 2,
    backgroundColor: SHELF_LIP,
    borderRadius: 1,
    marginTop: 2,
    opacity: 0.9,
  },
  shelfBoard: {
    height: 5,
    backgroundColor: SHELF,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  pin: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: '#ffd76a',
  },
  footnote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
