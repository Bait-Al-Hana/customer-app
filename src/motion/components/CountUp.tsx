import React, { useEffect, useRef } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  decimals?: number;
}

export function CountUp({
  to,
  from = 0,
  duration = 1000,
  prefix = '',
  suffix = '',
  style,
  decimals = 0,
}: CountUpProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const animValue = useSharedValue(reduced ? to : from);
  const prevTo = useRef(to);

  useEffect(() => {
    if (reduced) {
      animValue.value = to;
    } else {
      animValue.value = withTiming(to, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
    prevTo.current = to;
  }, [to, duration, reduced, animValue]);

  // Reanimated renders a shared value passed as a child of `Animated.Text`,
  // which is how this counts without a re-render per frame. Its own types make
  // `DerivedValue<string>` unassignable to the `SharedValue<ReactNode>` the
  // child slot declares — the setter is contravariant, and a derived value has
  // no meaningful setter at all. The runtime contract is unchanged; only the
  // declaration needs the bridge.
  const text = useDerivedValue(() => {
    const val = decimals > 0
      ? animValue.value.toFixed(decimals)
      : Math.round(animValue.value).toString();
    return `${prefix}${val}${suffix}`;
  });

  const scaleStyle = useAnimatedStyle(() => {
    const diff = Math.abs(animValue.value - to);
    const maxDiff = Math.abs(to - from) || 1;
    const scaling = diff / maxDiff;
    return {
      transform: [{ scale: 1 + scaling * 0.05 }],
    };
  });

  return (
    <Animated.Text
      style={[
        { color: theme.colors.text, fontWeight: '800', fontSize: 24 },
        style,
        scaleStyle,
      ]}
    >
      {text as unknown as React.ReactNode}
    </Animated.Text>
  );
}
