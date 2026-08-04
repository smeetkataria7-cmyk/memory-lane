import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../src/components/Orb';
import { SharePicker } from '../src/components/SharePicker';
import { useAuth } from '../src/lib/auth';
import {
  deleteMedia,
  getBall,
  listBalls,
  listMedia,
  saveBall,
  signedMediaUrl,
  todayKey,
  type BallMedia,
  type PendingMedia,
} from '../src/lib/balls';
import { refreshWidgets } from '../src/lib/widgets';
import { loadAudience, type ShareTarget } from '../src/lib/groups';
import type { EmotionFill } from '../src/lib/blend';
import { detectJourney, journeyReasonLabel } from '../src/lib/journey';
import { refreshReminders } from '../src/lib/reminders';
import { radii, spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function ComposeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ fills?: string }>();

  const fills: EmotionFill[] = params.fills ? JSON.parse(params.fills) : [];
  const journeyReason = detectJourney(fills);

  const [note, setNote] = useState('');
  const [media, setMedia] = useState<PendingMedia[]>([]);
  // Already uploaded for this day, as opposed to `media` which is pending.
  const [saved, setSaved] = useState<(BallMedia & { url: string | null })[]>([]);
  const [shareWith, setShareWith] = useState<ShareTarget[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);

  // Re-editing a day lands here with only the emotions carried over. Without
  // reloading what was already saved, saving again would blank the note and
  // silently pull the day off everyone's board.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const day = todayKey();
    Promise.all([getBall(userId, day), loadAudience(userId, day)])
      .then(async ([ball, audience]) => {
        if (!alive) return;
        if (ball?.note) setNote(ball.note);
        setShareWith(audience);
        if (!ball) return;
        const rows = await listMedia(ball.id);
        const withUrls = await Promise.all(
          rows.map(async (r) => ({ ...r, url: await signedMediaUrl(r.storage_path) })),
        );
        if (alive) setSaved(withUrls);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const pick = async (kind: 'photo' | 'video') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Memory Lane needs access to your library to attach media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia((m) => [...m, { kind, uri: result.assets[0].uri }]);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await recorder.stop();
      setRecording(false);
      if (recorder.uri) {
        setMedia((m) => [...m, { kind: 'audio', uri: recorder.uri! }]);
      }
      return;
    }
    const { granted } = await (
      await import('expo-audio')
    ).requestRecordingPermissionsAsync();
    if (!granted) {
      setError('Memory Lane needs microphone access to record a voice note.');
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  };

  const save = async () => {
    if (!userId) return;
    setError(null);
    setBusy(true);
    try {
      await saveBall({ userId, fills, note, media, shareWith });
      // Today is done - drop tonight's nudge, keep the rest of the window.
      await refreshReminders(true).catch(() => {});
      await listBalls(userId).then(refreshWidgets).catch(() => {});
      router.replace('/lane');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save today.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.paper }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.head}>
        <Orb size={120} fills={fills} />
        <Text style={[styles.title, { color: t.ink }]}>Fill in the day</Text>
        {journeyReason ? (
          <View style={[styles.pill, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.pillText, { color: t.accent }]}>
              ✦ {journeyReasonLabel[journeyReason]} — this one goes to Journey
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.label, { color: t.inkMuted }]}>A few words (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What made it feel like this?"
        placeholderTextColor={t.inkFaint}
        multiline
        style={[
          styles.note,
          { backgroundColor: t.surface, borderColor: t.line, color: t.ink },
        ]}
      />

      <Text style={[styles.label, { color: t.inkMuted }]}>Hold onto something</Text>
      <View style={styles.mediaRow}>
        <Pressable
          onPress={() => pick('photo')}
          style={[styles.mediaBtn, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <Text style={[styles.mediaText, { color: t.ink }]}>Photo</Text>
        </Pressable>
        <Pressable
          onPress={() => pick('video')}
          style={[styles.mediaBtn, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <Text style={[styles.mediaText, { color: t.ink }]}>Video</Text>
        </Pressable>
        {Platform.OS !== 'web' ? (
          <Pressable
            onPress={toggleRecording}
            style={[
              styles.mediaBtn,
              {
                backgroundColor: recording ? t.danger : t.surface,
                borderColor: recording ? t.danger : t.line,
              },
            ]}
          >
            <Text style={[styles.mediaText, { color: recording ? '#fff' : t.ink }]}>
              {recording ? 'Stop' : 'Voice'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {saved.length > 0 ? (
        <View style={styles.thumbs}>
          {saved.map((m) => (
            <View key={m.id} style={styles.thumbWrap}>
              {m.kind === 'photo' && m.url ? (
                <Image source={{ uri: m.url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbAlt, { backgroundColor: t.surface2 }]}>
                  <Text style={{ color: t.inkMuted, fontSize: 12, fontWeight: '700' }}>
                    {m.kind === 'audio' ? '♪' : '▶'}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={async () => {
                  if (!userId) return;
                  const before = saved;
                  setSaved((prev) => prev.filter((x) => x.id !== m.id));
                  try {
                    await deleteMedia(m, userId, todayKey());
                  } catch {
                    setSaved(before);
                    setError('Could not remove that. Try again.');
                  }
                }}
                style={[styles.remove, { backgroundColor: t.ink }]}
              >
                <Text style={{ color: t.paper, fontSize: 11, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {media.length > 0 ? (
        <View style={styles.thumbs}>
          {media.map((m, i) => (
            <View key={`${m.uri}-${i}`} style={styles.thumbWrap}>
              {m.kind === 'photo' ? (
                <Image source={{ uri: m.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbAlt, { backgroundColor: t.surface2 }]}>
                  <Text style={{ color: t.inkMuted, fontSize: 12, fontWeight: '700' }}>
                    {m.kind === 'audio' ? '♪' : '▶'}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                style={[styles.remove, { backgroundColor: t.ink }]}
              >
                <Text style={{ color: t.paper, fontSize: 11, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => setPickerOpen(true)}
        style={[styles.shareRow, { backgroundColor: t.surface, borderColor: t.line }]}
      >
        <View style={styles.shareCopy}>
          <Text style={[styles.shareTitle, { color: t.ink }]}>Share with</Text>
          <Text style={[styles.shareSub, { color: t.inkMuted }]}>
            {shareWith.length === 0
              ? 'Nobody — this day stays private'
              : `${shareWith.length} selected. They see your color and media; your words stay private.`}
          </Text>
        </View>
        <Text style={[styles.shareChevron, { color: t.accent }]}>
          {shareWith.length === 0 ? 'Choose' : 'Change'} ›
        </Text>
      </Pressable>

      <SharePicker
        visible={pickerOpen}
        userId={userId}
        value={shareWith}
        onClose={() => setPickerOpen(false)}
        onChange={setShareWith}
      />

      {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.btn, { backgroundColor: t.surface2 }]}
        >
          <Text style={[styles.btnText, { color: t.inkMuted }]}>Back</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={busy}
          style={[styles.btn, styles.btnPrimary, { backgroundColor: t.accent }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.btnText, { color: '#fff' }]}>Save today</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.md, gap: spacing.md },
  head: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 24, fontWeight: '700' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  note: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 110,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  mediaRow: { flexDirection: 'row', gap: spacing.sm },
  mediaBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mediaText: { fontSize: 14, fontWeight: '700' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 68, height: 68, borderRadius: radii.sm },
  thumbAlt: { alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  shareCopy: { flex: 1, gap: 2 },
  shareTitle: { fontSize: 15, fontWeight: '700' },
  shareSub: { fontSize: 13, lineHeight: 18 },
  shareChevron: { fontSize: 14, fontWeight: '700' },
  error: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { paddingVertical: 15, paddingHorizontal: 24, borderRadius: radii.pill },
  btnPrimary: { flex: 1, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
});
