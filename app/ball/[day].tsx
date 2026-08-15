import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../../src/components/Orb';
import { SharePicker } from '../../src/components/SharePicker';
import { useAuth } from '../../src/lib/auth';
import {
  getBall,
  listMedia,
  setBoardShare,
  setJourneyPin,
  signedMediaUrl,
  type Ball,
  type BallMedia,
} from '../../src/lib/balls';
import { loadAudience, type ShareTarget } from '../../src/lib/groups';
import { journeyReasonLabel } from '../../src/lib/journey';
import { formatDay } from '../../src/lib/lane';
import { EMOTIONS, radii, spacing, typography } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

function AudioButton({ url }: { url: string }) {
  const t = useTheme();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      style={[styles.mediaItem, styles.mediaAlt, { backgroundColor: status.playing ? t.accent : t.surface2 }]}
    >
      <Text style={{ color: status.playing ? '#fff' : t.ink, fontSize: 18 }}>
        {status.playing ? '■' : '♪'}
      </Text>
      <Text style={{ color: status.playing ? '#fff' : t.inkMuted, fontSize: 11, fontWeight: '600' }}>
        {status.playing ? 'Stop' : 'Play'}
      </Text>
    </Pressable>
  );
}

export default function BallDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { day } = useLocalSearchParams<{ day: string }>();

  const [ball, setBall] = useState<Ball | null>(null);
  const [media, setMedia] = useState<(BallMedia & { url: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [shareWith, setShareWith] = useState<ShareTarget[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId || !day) return;
    getBall(userId, day)
      .then(async (b) => {
        if (!alive) return;
        setBall(b);
        if (b) {
          const [rows, audience] = await Promise.all([
            listMedia(b.id),
            loadAudience(userId, b.day),
          ]);
          const withUrls = await Promise.all(
            rows.map(async (r) => ({ ...r, url: await signedMediaUrl(r.storage_path) })),
          );
          if (alive) {
            setMedia(withUrls);
            setShareWith(audience);
          }
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, day]);

  const togglePin = async () => {
    if (!ball) return;
    const next = !ball.journey;
    setBall({ ...ball, journey: next, journey_reason: next ? 'manual' : null });
    try {
      await setJourneyPin(ball.id, next);
    } catch {
      setBall(ball);
    }
  };

  const applyShare = async (targets: ShareTarget[]) => {
    if (!ball) return;
    const before = ball;
    setShareWith(targets);
    setBall({ ...ball, shared_to_board: targets.length > 0 });
    try {
      await setBoardShare(ball, targets);
    } catch {
      setBall(before);
      loadAudience(before.user_id, before.day).then(setShareWith).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  if (!ball) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <Text style={{ color: t.inkMuted }}>Nothing was saved for this day.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const total = ball.fills.reduce((s, f) => s + f.weight, 0) || 1;
  const sorted = [...ball.fills].sort((a, b) => b.weight - a.weight);
  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: t.paper }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: t.accent }]}>‹ Back</Text>
        </Pressable>

        <View style={styles.head}>
          <Orb size={180} fills={ball.fills} />
          <Text style={[styles.date, { color: t.ink }]}>{formatDay(ball.day)}</Text>
          {ball.journey && ball.journey_reason ? (
            <View style={[styles.pill, { backgroundColor: t.accentSoft }]}>
              <Text style={[styles.pillText, { color: t.accent }]}>
                ✦ {journeyReasonLabel[ball.journey_reason]}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bars}>
          {sorted.map((f) => {
            const meta = EMOTIONS.find((e) => e.key === f.emotion)!;
            return (
              <View key={f.emotion} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: t.inkMuted }]}>{meta.label}</Text>
                <View style={[styles.barTrack, { backgroundColor: t.surface2 }]}>
                  <View
                    style={[
                      styles.barFill,
                      { backgroundColor: meta.color, width: `${(f.weight / total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.barPct, { color: t.inkFaint }]}>
                  {Math.round(f.weight)}%
                </Text>
              </View>
            );
          })}
        </View>

        {ball.note ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.note, { color: t.ink }]}>{ball.note}</Text>
          </View>
        ) : null}

        {media.length > 0 ? (
          <View style={styles.mediaGrid}>
            {media.map((m) => {
              if (!m.url) return null;
              if (m.kind === 'photo') {
                return (
                  <Pressable key={m.id} onPress={() => setViewingImage(m.url)}>
                    <Image source={{ uri: m.url }} style={styles.mediaItem} />
                  </Pressable>
                );
              }
              if (m.kind === 'audio') {
                return <AudioButton key={m.id} url={m.url} />;
              }
              return (
                <Pressable
                  key={m.id}
                  onPress={() => m.url && Linking.openURL(m.url)}
                  style={[styles.mediaItem, styles.mediaAlt, { backgroundColor: t.surface2 }]}
                >
                  <Text style={{ color: t.ink, fontSize: 18 }}>▶</Text>
                  <Text style={{ color: t.inkMuted, fontSize: 11, fontWeight: '600' }}>
                    Video
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: t.ink }]}>Keep in Journey</Text>
            <Text style={[styles.rowSub, { color: t.inkMuted }]}>
              {ball.journey_reason && ball.journey_reason !== 'manual'
                ? 'Flagged automatically — you can still turn this off.'
                : 'Pin any day you want to keep, spike or not.'}
            </Text>
          </View>
          <Switch value={ball.journey} onValueChange={togglePin} />
        </View>

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.row, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: t.ink }]}>Share with</Text>
            <Text style={[styles.rowSub, { color: t.inkMuted }]}>
              {shareWith.length === 0
                ? 'Nobody — this day stays private'
                : `${shareWith.length} selected. Your note stays private.`}
            </Text>
          </View>
          <Text style={[styles.rowAction, { color: t.accent }]}>
            {shareWith.length === 0 ? 'Choose' : 'Change'} ›
          </Text>
        </Pressable>
      </ScrollView>

      <SharePicker
        visible={pickerOpen}
        userId={userId}
        value={shareWith}
        onClose={() => setPickerOpen(false)}
        onChange={applyShare}
      />

      <Modal visible={!!viewingImage} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setViewingImage(null)}
        >
          <View style={[styles.modalClose, { backgroundColor: t.ink }]}>
            <Text style={{ color: t.paper, fontSize: 16, fontWeight: '700' }}>✕</Text>
          </View>
          {viewingImage ? (
            <Image
              source={{ uri: viewingImage }}
              style={{ width: screenWidth - 32, height: screenWidth - 32 }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  back: { fontSize: 16, fontWeight: '700' },
  head: { alignItems: 'center', gap: spacing.sm },
  date: { ...typography.subhead, textAlign: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  bars: { gap: 6, marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { fontSize: 13, width: 108 },
  barTrack: { flex: 1, height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.pill },
  barPct: { fontSize: 12, width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  note: { fontSize: 16, lineHeight: 24 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mediaItem: { width: 100, height: 100, borderRadius: radii.sm },
  mediaAlt: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 13, lineHeight: 18 },
  rowAction: { fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
