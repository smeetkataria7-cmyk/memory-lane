import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  DEFAULT_TIME,
  formatTime,
  getReminderSettings,
  setReminder,
  type ReminderTime,
} from '../lib/reminders';
import { radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const CHOICES: ReminderTime[] = [
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
  { hour: 21, minute: 30 },
  { hour: 22, minute: 0 },
  { hour: 22, minute: 30 },
  { hour: 23, minute: 0 },
];

export function ReminderCard({ filledToday }: { filledToday: boolean }) {
  const t = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState<ReminderTime>(DEFAULT_TIME);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    getReminderSettings().then((s) => {
      setEnabled(s.enabled);
      setTime(s.time);
    });
  }, []);

  const apply = async (nextEnabled: boolean, nextTime: ReminderTime) => {
    setEnabled(nextEnabled);
    setTime(nextTime);
    const ok = await setReminder(nextEnabled, nextTime, filledToday);
    if (!ok) {
      setEnabled(false);
      setDenied(true);
    } else {
      setDenied(false);
    }
  };

  if (Platform.OS === 'web') return null;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.ink }]}>Nightly reminder</Text>
          <Text style={[styles.sub, { color: t.inkMuted }]}>
            {enabled
              ? `A nudge at ${formatTime(time)}, skipped on days you've already filled.`
              : 'A quiet nudge so a day never slips past you.'}
          </Text>
        </View>
        <Switch value={enabled} onValueChange={(v) => apply(v, time)} />
      </View>

      {enabled ? (
        <View style={styles.times}>
          {CHOICES.map((c) => {
            const active = c.hour === time.hour && c.minute === time.minute;
            return (
              <Pressable
                key={`${c.hour}:${c.minute}`}
                onPress={() => apply(true, c)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? t.accent : t.paper,
                    borderColor: active ? t.accent : t.line,
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: active ? '#fff' : t.inkMuted }]}
                >
                  {formatTime(c)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {denied ? (
        <Text style={[styles.denied, { color: t.danger }]}>
          Notifications are turned off for Memory Lane. Enable them in your phone's
          settings, then try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 13, lineHeight: 19 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  denied: { fontSize: 13, lineHeight: 19 },
});
