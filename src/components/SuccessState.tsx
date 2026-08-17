import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useMotion } from '../motion';
import { useTheme } from '../theme/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A one-shot success mark: a ring settles in, then the check draws itself.
 *
 * Purpose: a short, elegant celebratory moment for order/payment success —
 * enough to feel rewarding, never the drawn-out confetti the brief warns
 * against. The check length is animated with `strokeDashoffset` so it draws on;
 * under reduced motion everything is shown complete instantly (no draw, no
 * spring), because the essential message is "done", not the animation.
 */
export function SuccessCheck({ size = 96, color }: { size?: number; color?: string }): React.JSX.Element {
  const theme = useTheme();
  const { spring, reduceMotion } = useMotion();
  const tint = color ?? theme.colors.success;

  const ring = useSharedValue(reduceMotion ? 1 : 0);
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const CHECK_LEN = 40; // approximate path length for the check

  useEffect(() => {
    if (reduceMotion) {
      ring.value = 1;
      draw.value = 1;
      return;
    }
    ring.value = withSpring(1, spring('emphasized'));
    draw.value = withDelay(160, withTiming(1, { duration: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + ring.value * 0.4 }], opacity: ring.value }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill={theme.colors.successSoft} stroke={tint} strokeWidth={3} />
        <AnimatedPath
          d="M30 51l13 13 27-28"
          fill="none"
          stroke={tint}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LEN}
          animatedProps={checkProps}
        />
      </Svg>
      <View />
    </Animated.View>
  );
}
