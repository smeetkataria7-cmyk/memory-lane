import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

// Feedback belongs on the press, not the release. Most buttons in the app
// had no pressed state at all, which reads as dead the moment you touch
// them - the interface hasn't acknowledged you until whatever the button
// does finishes. This acknowledges immediately.
//
// Deliberately subtle: these are tapped often enough that anything larger
// would get tiring. Scale stays inside 0.97-0.98 and opacity does the rest.
export function PressableScale({
  style,
  scale = 0.97,
  dim = 0.85,
  ...rest
}: Omit<PressableProps, 'style'> & {
  style?: ViewStyle | ViewStyle[];
  scale?: number;
  dim?: number;
}) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style as ViewStyle,
        pressed && !rest.disabled
          ? { transform: [{ scale }], opacity: dim }
          : null,
      ]}
    />
  );
}
