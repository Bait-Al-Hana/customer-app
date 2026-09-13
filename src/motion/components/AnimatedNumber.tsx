import React, { useEffect, useRef } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../MotionProvider';

export interface AnimatedNumberProps {
  value: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Text that pops briefly whenever its value changes, drawing the eye to
 * the update (e.g. a price recalculating in the cart). The first render
 * is silent — only subsequent changes trigger the pop.
 */
export function AnimatedNumber({ value, style }: AnimatedNumberProps): React.JSX.Element {
  const { timing } = useMotion();
  const scale = useSharedValue(1);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      scale.value = withSequence(
        withTiming(1.15, timing('fast')),
        withTiming(1, timing('fast')),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.Text style={[style, animatedStyle]}>{value}</Animated.Text>;
}
