import React, { useEffect } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useMotion } from '../MotionProvider';

export interface AnimatedNumberProps {
  /** The numeric value (e.g. a total in minor units). */
  value: number;
  /** Turns the value into display text — e.g. `formatSar`. */
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * A number that gives a small pop each time it changes.
 *
 * Purpose: make a total (cart subtotal, checkout total) visibly *respond* when
 * it updates, so the eye follows the change instead of a figure silently
 * swapping. It does not tween the digits — the value is always the exact text
 * `format` returns, so the displayed amount is never a midpoint a customer
 * could misread; only the scale animates.
 *
 * The pop uses the `fast` duration, which is 0 under reduced motion, so the
 * value simply updates in place with no special-casing.
 */
export function AnimatedNumber({
  value,
  format,
  style,
  testID,
}: AnimatedNumberProps): React.JSX.Element {
  const { timing } = useMotion();
  const pop = useSharedValue(1);
  const first = useSharedValue(true);

  useEffect(() => {
    if (first.value) {
      first.value = false;
      return;
    }
    pop.value = withSequence(withTiming(1.12, timing('fast')), withTiming(1, timing('fast')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.Text testID={testID} style={[style, animatedStyle]}>
      {format(value)}
    </Animated.Text>
  );
}
