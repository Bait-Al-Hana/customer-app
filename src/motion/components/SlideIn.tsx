import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DurationToken } from '../tokens';
import { useMotion } from '../MotionProvider';

export interface SlideInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  delay?: number;
  duration?: DurationToken;
}

/**
 * One-shot directional entrance. Like FadeIn but with a configurable
 * slide direction — useful for floating bars, side-entering elements.
 */
export function SlideIn({
  children,
  style,
  direction = 'up',
  distance = 20,
  delay = 0,
  duration = 'normal',
}: SlideInProps): React.JSX.Element {
  const { timing, reduceMotion } = useMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, timing(duration, 'enter')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const remaining = 1 - progress.value;
    const x =
      direction === 'left'
        ? -remaining * distance
        : direction === 'right'
          ? remaining * distance
          : 0;
    const y =
      direction === 'up'
        ? remaining * distance
        : direction === 'down'
          ? -remaining * distance
          : 0;
    return {
      opacity: progress.value,
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
