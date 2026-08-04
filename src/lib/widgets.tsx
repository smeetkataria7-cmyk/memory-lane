import { Platform } from 'react-native';
import type { Ball } from './balls';
import { saveSnapshot, snapshotFrom } from './widgetData';

// Push fresh data to the home screen widgets. Safe to call from anywhere:
// it is a no-op off Android, and a widget that fails to redraw never
// surfaces as an error in the app.
export async function refreshWidgets(balls: Ball[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  await saveSnapshot(snapshotFrom(balls));

  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { MemoryTreeWidget } = await import('../widgets/MemoryTreeWidget');
    const { TodayOrbWidget } = await import('../widgets/TodayOrbWidget');
    const { readSnapshot } = await import('./widgetData');
    const snapshot = await readSnapshot();

    await requestWidgetUpdate({
      widgetName: 'MemoryTree',
      renderWidget: () => <MemoryTreeWidget snapshot={snapshot} />,
    });
    await requestWidgetUpdate({
      widgetName: 'TodayOrb',
      renderWidget: () => <TodayOrbWidget snapshot={snapshot} />,
    });
  } catch {
    // No widget on the home screen, or the native module is unavailable.
  }
}
