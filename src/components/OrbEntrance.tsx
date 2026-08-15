import { useEffect, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// The moment a day becomes a lit orb on a shelf is the emotional peak of
// the app, and it used to just appear. This marks it - for today's orb
// only, once, on arrival.
//
// Bounce is earned here: the orb has just been set down on a shelf, so a
// little overshoot reads as physical rather than decorative. Anywhere the
// motion isn't momentum-driven it would feel wrong, which is why nothing
// else on this screen animates.
export function OrbEntrance({
  animate,
  children,
}: {
  animate: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const play = animate && !reduced;

  const scale = useSharedValue(play ? 0.9 : 1);
  const opacity = useSharedValue(play ? 0 : 1);

  useEffect(() => {
    if (!play) return;
    scale.value = withSpring(1, { duration: 350, dampingRatio: 0.8 });
    opacity.value = withTiming(1, { duration: 200 });
  }, [play, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
