import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../MotionProvider';

export interface PulsingDotProps {
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small dot with a gentle pulsing ring — used next to "Open now" or
 * an active order status to signal liveness. Under reduced motion the
 * ring is static.
 */
export function PulsingDot({ color, size = 8, style }: PulsingDotProps): React.JSX.Element {
  const { reduceMotion } = useMotion();
  const pulse = useSharedValue(reduceMotion ? 0.4 : 0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.4;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.2 }],
  }));

  return (
    <View style={[{ width: size * 3, height: size * 3, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 2.2,
            height: size * 2.2,
            borderRadius: size * 1.1,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
