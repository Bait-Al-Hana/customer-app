import React, { useEffect } from 'react';
import { ActivityIndicator, Text, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { useTheme } from '../../theme/theme';
import { useReducedMotion } from '../useReducedMotion';

export interface PulseButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
}

export function PulseButton({
  label,
  onPress,
  busy,
  disabled,
  style,
  glowColor,
}: PulseButtonProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const color = glowColor ?? theme.colors.primary;
  const off = disabled || busy;

  useEffect(() => {
    if (off || reduced) {
      glow.value = 0;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [off, reduced, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 + glow.value * 0.3,
    shadowRadius: 12 + glow.value * 8,
  }));

  return (
    <Animated.View
      style={[
        {
          shadowColor: color,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          borderRadius: 999,
        },
        glowStyle,
      ]}
    >
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        disabled={off}
        style={[
          {
            backgroundColor: color,
            borderRadius: 999,
            paddingVertical: 18,
            paddingHorizontal: 32,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: off ? 0.5 : 1,
          },
          style,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 17, letterSpacing: 0.3 }}>
            {label}
          </Text>
        )}
      </PressableScale>
    </Animated.View>
  );
}
