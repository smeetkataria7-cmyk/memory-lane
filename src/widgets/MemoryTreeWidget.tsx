import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { stageFor } from '../lib/treeGeometry';
import { treeSvg } from '../lib/widgetSvg';
import type { WidgetSnapshot } from '../lib/widgetData';

const BG = '#191527';
const INK = '#d6d0ec';
const INK_FAINT = '#7d75a0';
const BARK = '#6f6690';
const LEAF_FALLBACK = '#4caf7d';

// 2x2: the tree, grown by the streak and leafed in the colours of the days
// behind it. Tapping anywhere opens the app.
export function MemoryTreeWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const { stage } = stageFor(snapshot.streak);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BG,
        borderRadius: 24,
        padding: 8,
      }}
    >
      <SvgWidget
        svg={treeSvg({
          streak: snapshot.streak,
          colors: snapshot.leafColors,
          bark: BARK,
          fallbackLeaf: LEAF_FALLBACK,
        })}
        style={{ height: 92, width: 92 }}
      />
      <TextWidget
        text={`${snapshot.streak} ${snapshot.streak === 1 ? 'day' : 'days'}`}
        style={{ fontSize: 14, fontWeight: '700', color: INK }}
      />
      <TextWidget
        text={stage.name}
        style={{ fontSize: 11, color: INK_FAINT }}
      />
    </FlexWidget>
  );
}
