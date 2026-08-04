import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { emptyOrbSvg, orbSvg } from '../lib/widgetSvg';
import type { WidgetSnapshot } from '../lib/widgetData';

const BG = '#191527';
const INK = '#d6d0ec';
const INK_FAINT = '#7d75a0';

// 2x2: today's orb, or an empty socket nudging you to fill one in.
// Tapping anywhere opens the app.
export function TodayOrbWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const filled = snapshot.todayColor !== null;

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
        svg={
          filled
            ? orbSvg({ color: snapshot.todayColor!, glowBehind: true })
            : emptyOrbSvg(INK_FAINT)
        }
        style={{ height: 96, width: 96 }}
      />
      <TextWidget
        text={filled ? 'Today' : 'Fill today'}
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: filled ? INK : INK_FAINT,
          marginTop: 2,
        }}
      />
    </FlexWidget>
  );
}
