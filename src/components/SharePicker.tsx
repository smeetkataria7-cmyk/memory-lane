import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loadFriendships } from '../lib/friends';
import { myGroups, type Group, type ShareTarget } from '../lib/groups';
import type { Profile } from '../lib/profiles';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Avatar } from './Avatar';

const keyOf = (t: ShareTarget) => `${t.kind}:${t.id}`;

export function summarise(
  targets: ShareTarget[],
  groups: Group[],
  friends: Profile[],
): string {
  if (targets.length === 0) return 'Private — not shared with anyone';

  const groupNames = targets
    .filter((t) => t.kind === 'group')
    .map((t) => groups.find((g) => g.id === t.id)?.name)
    .filter(Boolean) as string[];
  const friendNames = targets
    .filter((t) => t.kind === 'friend')
    .map((t) => friends.find((f) => f.id === t.id)?.display_name)
    .filter(Boolean) as string[];

  const all = [...groupNames, ...friendNames];
  if (all.length === 0) return 'Shared';
  if (all.length <= 2) return `Shared with ${all.join(' and ')}`;
  return `Shared with ${all[0]}, ${all[1]} and ${all.length - 2} more`;
}

export function SharePicker({
  visible,
  userId,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  userId: string | null;
  value: ShareTarget[];
  onClose: () => void;
  onChange: (next: ShareTarget[]) => void;
}) {
  const t = useTheme();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<ShareTarget[]>(value);

  useEffect(() => {
    if (visible) setPicked(value);
  }, [visible, value]);

  useEffect(() => {
    if (!visible || !userId) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      myGroups(userId).catch(() => [] as Group[]),
      loadFriendships(userId)
        .then((r) => r.friends)
        .catch(() => [] as Profile[]),
    ])
      .then(([gs, fs]) => {
        if (!alive) return;
        setGroups(gs);
        setFriends(fs);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [visible, userId]);

  const has = (target: ShareTarget) => picked.some((p) => keyOf(p) === keyOf(target));

  const toggle = (target: ShareTarget) => {
    setPicked((prev) =>
      prev.some((p) => keyOf(p) === keyOf(target))
        ? prev.filter((p) => keyOf(p) !== keyOf(target))
        : [...prev, target],
    );
  };

  const done = () => {
    onChange(picked);
    onClose();
  };

  const nothingToShareWith = !loading && groups.length === 0 && friends.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={[styles.headerAction, { color: t.inkMuted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: t.ink }]}>Share with</Text>
            <Pressable onPress={done}>
              <Text style={[styles.headerAction, { color: t.accent }]}>Done</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={t.accent} style={{ paddingVertical: spacing.xl }} />
          ) : nothingToShareWith ? (
            <Text style={[styles.empty, { color: t.inkMuted }]}>
              You're not in a circle and haven't added any friends yet. Your day
              stays private until you do.
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {groups.length > 0 ? (
                <>
                  <Text style={[styles.section, { color: t.inkFaint }]}>Circles</Text>
                  {groups.map((g) => {
                    const target: ShareTarget = { kind: 'group', id: g.id };
                    const on = has(target);
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => toggle(target)}
                        style={[styles.row, { borderColor: t.line }]}
                      >
                        <View
                          style={[
                            styles.groupDot,
                            { backgroundColor: on ? t.accent : t.surface2 },
                          ]}
                        >
                          <Text style={{ color: on ? '#fff' : t.inkMuted, fontWeight: '700' }}>
                            {g.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.rowName, { color: t.ink }]} numberOfLines={1}>
                          {g.name}
                        </Text>
                        <Check on={on} />
                      </Pressable>
                    );
                  })}
                </>
              ) : null}

              {friends.length > 0 ? (
                <>
                  <Text style={[styles.section, { color: t.inkFaint }]}>Friends</Text>
                  {friends.map((f) => {
                    const target: ShareTarget = { kind: 'friend', id: f.id };
                    const on = has(target);
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => toggle(target)}
                        style={[styles.row, { borderColor: t.line }]}
                      >
                        <Avatar profile={f} size={34} />
                        <Text style={[styles.rowName, { color: t.ink }]} numberOfLines={1}>
                          {f.display_name}
                        </Text>
                        <Check on={on} />
                      </Pressable>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
          )}

          <View style={[styles.footer, { borderColor: t.line }]}>
            <Text style={[styles.footerText, { color: t.inkMuted }]}>
              {picked.length === 0
                ? 'Nobody selected — this day stays private.'
                : `${picked.length} selected`}
            </Text>
            {picked.length > 0 ? (
              <Pressable onPress={() => setPicked([])}>
                <Text style={[styles.footerClear, { color: t.accent }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Check({ on }: { on: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.check,
        {
          backgroundColor: on ? t.accent : 'transparent',
          borderColor: on ? t.accent : t.line,
        },
      ]}
    >
      {on ? <Text style={styles.checkMark}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerAction: { fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: spacing.md },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 13 },
  footerClear: { fontSize: 13, fontWeight: '700' },
});
