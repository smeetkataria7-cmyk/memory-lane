import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = 'reminder.enabled';
const TIME_KEY = 'reminder.time';
const CHANNEL_ID = 'daily-reminder';

// A rolling window of one-shot reminders rather than one repeating daily
// trigger. A repeating trigger cannot skip a single occurrence, so it
// would nag on evenings the orb was already filled. Scheduling the next
// two weeks individually lets today be left out, and still keeps
// reminding someone who does not open the app for a while.
const WINDOW_DAYS = 14;

export type ReminderTime = { hour: number; minute: number };
export const DEFAULT_TIME: ReminderTime = { hour: 21, minute: 30 };

const MESSAGES = [
  "Today's orb is still empty.",
  'How did today actually go?',
  'One colour before you sleep.',
  "Today hasn't been saved yet.",
];

export function formatTime({ hour, minute }: ReminderTime): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export async function getReminderSettings(): Promise<{
  enabled: boolean;
  time: ReminderTime;
}> {
  const [enabled, time] = await Promise.all([
    AsyncStorage.getItem(ENABLED_KEY),
    AsyncStorage.getItem(TIME_KEY),
  ]);
  return {
    enabled: enabled === 'true',
    time: time ? (JSON.parse(time) as ReminderTime) : DEFAULT_TIME,
  };
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function scheduleWindow(time: ReminderTime, skipToday: boolean) {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  for (let i = 0; i < WINDOW_DAYS; i += 1) {
    const when = new Date(now);
    when.setDate(when.getDate() + i);
    when.setHours(time.hour, time.minute, 0, 0);

    if (when <= now) continue;
    if (i === 0 && skipToday) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Memory Lane',
        body: MESSAGES[i % MESSAGES.length],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function setReminder(
  enabled: boolean,
  time: ReminderTime,
  filledToday = false,
): Promise<boolean> {
  if (enabled) {
    const granted = await requestReminderPermission();
    if (!granted) {
      // Record that reminders are off before giving up, so the stored state
      // matches what will actually happen rather than what was asked for.
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
      await AsyncStorage.setItem(TIME_KEY, JSON.stringify(time));
      return false;
    }
    await scheduleWindow(time, filledToday);
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  await AsyncStorage.setItem(TIME_KEY, JSON.stringify(time));
  return true;
}

// Called when the app opens and after a day is saved, so the window stays
// topped up and tonight's reminder disappears once the orb is filled.
export async function refreshReminders(filledToday: boolean): Promise<void> {
  const { enabled, time } = await getReminderSettings();
  if (!enabled) return;
  const granted = await Notifications.getPermissionsAsync();
  if (!granted.granted) return;
  await scheduleWindow(time, filledToday);
}
