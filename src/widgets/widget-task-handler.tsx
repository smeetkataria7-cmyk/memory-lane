import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readSnapshot } from '../lib/widgetData';
import { MemoryTreeWidget } from './MemoryTreeWidget';
import { TodayOrbWidget } from './TodayOrbWidget';

// Runs headless, outside the app process. Everything it draws comes from
// the snapshot the app left on disk - there is no session here to fetch with.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readSnapshot();

  switch (widgetInfo.widgetName) {
    case 'MemoryTree':
      renderWidget(<MemoryTreeWidget snapshot={snapshot} />);
      break;
    case 'TodayOrb':
      renderWidget(<TodayOrbWidget snapshot={snapshot} />);
      break;
    default:
      break;
  }
}
