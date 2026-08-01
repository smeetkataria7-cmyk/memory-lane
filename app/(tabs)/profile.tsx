import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../src/components/Avatar';
import { ReminderCard } from '../../src/components/ReminderCard';
import { Screen } from '../../src/components/Screen';
import { StreakPlant, nextStage } from '../../src/components/StreakPlant';
import { signOut, useAuth } from '../../src/lib/auth';
import { listBalls, todayKey, type Ball } from '../../src/lib/balls';
import { loadFriendships } from '../../src/lib/friends';
import { myGroups } from '../../src/lib/groups';
import { currentStreak } from '../../src/lib/lane';
import {
  getProfile,
  updateDisplayName,
  uploadAvatar,
  type Profile,
} from '../../src/lib/profiles';
import { radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();

  const [balls, setBalls] = useState<Ball[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState({ friends: 0, circles: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!userId) return;
      Promise.all([
        listBalls(userId, 400),
        getProfile(userId),
        loadFriendships(userId),
        myGroups(userId),
      ])
        .then(([b, p, f, g]) => {
          if (!alive) return;
          setBalls(b);
          setProfile(p);
          setCounts({ friends: f.friends.length, circles: g.length });
        })
        .catch(() => {})
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [userId]),
  );

  const pickAvatar = async () => {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Memory Lane needs access to your photos to set a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setError(null);
    setBusy(true);
    try {
      const url = await uploadAvatar(userId, result.assets[0].uri);
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that picture.');
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    if (!userId || !draftName.trim()) return;
    setBusy(true);
    try {
      await updateDisplayName(userId, draftName);
      setProfile((p) => (p ? { ...p, display_name: draftName.trim() } : p));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that name.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Profile">
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} />
        </View>
      </Screen>
    );
  }

  const streak = currentStreak(balls);
  const next = nextStage(streak);
  const journeyCount = balls.filter((b) => b.journey).length;
  const shown = profile ?? { id: '', display_name: 'You', avatar_url: null };

  return (
    <Screen title="Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <Pressable onPress={pickAvatar} disabled={busy}>
            <Avatar profile={shown} size={76} />
            <View style={[styles.editBadge, { backgroundColor: t.accent }]}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </Pressable>

          {editing ? (
            <View style={styles.nameEdit}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={t.inkFaint}
                style={[
                  styles.nameInput,
                  { backgroundColor: t.surface, borderColor: t.line, color: t.ink },
                ]}
              />
              <Pressable onPress={saveName} disabled={busy || !draftName.trim()}>
                <Text style={[styles.nameAction, { color: t.accent }]}>Save</Text>
              </Pressable>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={[styles.nameAction, { color: t.inkFaint }]}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setDraftName(shown.display_name);
                setEditing(true);
              }}
            >
              <Text style={[styles.name, { color: t.ink }]}>
                {shown.display_name || 'Add your name'}
              </Text>
            </Pressable>
          )}
          {busy ? <ActivityIndicator color={t.accent} /> : null}
          {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
        </View>

        <View style={[styles.plantCard, { backgroundColor: t.surface, borderColor: t.line }]}>
          <StreakPlant streak={streak} />
          <Text style={[styles.streakNum, { color: t.ink }]}>
            {streak} {streak === 1 ? 'day' : 'days'} in a row
          </Text>
          <Text style={[styles.streakSub, { color: t.inkMuted }]}>
            {streak === 0
              ? 'Fill today to plant a seed.'
              : next
                ? `${next.minDays - streak} more to reach ${next.name.toLowerCase()}.`
                : 'Fully grown. Keep it alive.'}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={balls.length} label="days filled" />
          <Stat value={journeyCount} label="in Journey" />
        </View>

        <ReminderCard filledToday={balls.some((b) => b.day === todayKey())} />

        <Pressable
          onPress={() => router.push('/friends')}
          style={[styles.link, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <Text style={[styles.linkTitle, { color: t.ink }]}>Friends</Text>
          <Text style={[styles.linkValue, { color: t.inkMuted }]}>
            {counts.friends} ›
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/circles')}
          style={[styles.link, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <Text style={[styles.linkTitle, { color: t.ink }]}>Circles</Text>
          <Text style={[styles.linkValue, { color: t.inkMuted }]}>
            {counts.circles} ›
          </Text>
        </Pressable>

        <Pressable onPress={signOut} style={[styles.signOut, { borderColor: t.line }]}>
          <Text style={[styles.signOutText, { color: t.danger }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Text style={[styles.statNum, { color: t.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: spacing.xl, gap: spacing.md },
  identity: { alignItems: 'center', gap: spacing.sm },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700' },
  nameEdit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  nameAction: { fontSize: 14, fontWeight: '700' },
  plantCard: {
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  streakNum: { fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  streakSub: { fontSize: 14, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  linkTitle: { fontSize: 15, fontWeight: '700' },
  linkValue: { fontSize: 14, fontWeight: '600' },
  signOut: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
});
