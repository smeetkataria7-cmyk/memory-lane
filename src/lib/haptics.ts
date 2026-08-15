import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are rationed on purpose. Feedback that fires constantly trains
// people to stop noticing it, so these are reserved for the moments that
// actually mean something: starting to fill an emotion, spending the last
// of the day's weight, and committing the day.
//
// Every call is fire-and-forget - a device without a motor, or one where
// the user has switched haptics off, must never surface an error.

const off = Platform.OS === 'web';

export function tapTick() {
  if (off) return;
  Haptics.selectionAsync().catch(() => {});
}

// The whole 100% is spoken for - the one moment in the gesture with a
// natural boundary, so it gets the firmer knock.
export function poolFull() {
  if (off) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function saved() {
  if (off) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function failed() {
  if (off) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
