import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';

export interface AnimatedGradientProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: string[];
}

export function AnimatedGradient({
  children,
  style,
}: AnimatedGradientProps): React.JSX.Element {
  const theme = useTheme();
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [phase]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(phase.value * Math.PI * 2) * 30 },
      { translateY: Math.cos(phase.value * Math.PI * 2) * 20 },
      { scale: 0.9 + phase.value * 0.2 },
    ],
    opacity: 0.06 + phase.value * 0.02,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(phase.value * Math.PI * 2 + 1) * 25 },
      { translateY: Math.sin(phase.value * Math.PI * 2 + 1) * 30 },
      { scale: 1 + (1 - phase.value) * 0.15 },
    ],
    opacity: 0.04 + (1 - phase.value) * 0.02,
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(phase.value * Math.PI * 2 + 2) * 20 },
      { translateY: Math.cos(phase.value * Math.PI * 2 + 2) * 25 },
    ],
    opacity: 0.04 + phase.value * 0.015,
  }));

  return (
    <View style={[{ position: 'relative', overflow: 'hidden' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -80,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: theme.colors.primary,
          },
          orb1Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: '40%',
            left: -50,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: theme.colors.secondary,
          },
          orb2Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: -40,
            right: -30,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: theme.colors.accent,
          },
          orb3Style,
        ]}
      />
      {children}
    </View>
  );
}
