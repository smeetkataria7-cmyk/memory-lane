import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ball } from './balls';
import { todayKey } from './dates';
import { currentStreak } from './lane';

const KEY = 'memory-lane/widget-snapshot/v1';

// The widget's task handler runs headless, without the app's Supabase
// session, so it cannot fetch anything. The app leaves it a snapshot on
// disk instead, refreshed whenever the underlying data changes.
export type WidgetSnapshot = {
  // The day this snapshot describes. If it is not today, the widget knows
  // today has not been filled in rather than showing yesterday's colour.
  day: string;
  todayColor: string | null;
  streak: number;
  leafColors: string[];
};

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  day: '',
  todayColor: null,
  streak: 0,
  leafColors: [],
};

export function snapshotFrom(balls: Ball[]): WidgetSnapshot {
  const day = todayKey();
  const today = balls.find((b) => b.day === day) ?? null;
  return {
    day,
    todayColor: today?.blended_color ?? null,
    streak: currentStreak(balls),
    // 22 is the most leaves any stage draws; more would just be carried.
    leafColors: balls.slice(0, 22).map((b) => b.blended_color),
  };
}

export async function saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // A widget that cannot be refreshed is not worth failing a save over.
  }
}

export async function readSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    // A snapshot written before midnight describes a day that is now over.
    if (parsed.day !== todayKey()) {
      return { ...parsed, todayColor: null };
    }
    return parsed;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}
