import React, { useImperativeHandle, forwardRef, useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '../useReducedMotion';

export interface ShakeViewRef {
  shake: () => void;
}

export interface ShakeViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

export const ShakeView = forwardRef<ShakeViewRef, ShakeViewProps>(
  function ShakeView({ children, style, intensity = 8 }, ref) {
    const reduced = useReducedMotion();
    const x = useSharedValue(0);

    const shake = useCallback(() => {
      if (reduced) return;
      x.value = withSequence(
        withTiming(-intensity, { duration: 50 }),
        withTiming(intensity, { duration: 50 }),
        withTiming(-intensity * 0.7, { duration: 50 }),
        withTiming(intensity * 0.7, { duration: 50 }),
        withTiming(-intensity * 0.3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }, [reduced, intensity, x]);

    useImperativeHandle(ref, () => ({ shake }), [shake]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: x.value }],
    }));

    return (
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    );
  },
);
