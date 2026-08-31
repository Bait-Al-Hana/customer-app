import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface StatusBadgeProps {
  label: string;
  color: string;
  textColor?: string;
}

/**
 * A small pill badge that springs into view on mount — used for order
 * status, branch open/closed, and similar labelled states.
 */
export function StatusBadge({ label, color, textColor }: StatusBadgeProps): React.JSX.Element {
  const theme = useTheme();
  const { spring, reduceMotion } = useMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.5);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(1, spring('emphasized'));
    opacity.value = withSpring(1, spring('soft'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius: theme.radius.pill,
          paddingVertical: 4,
          paddingHorizontal: 12,
          alignSelf: 'flex-start',
        },
        animatedStyle,
      ]}
    >
      <Text style={{ color: textColor ?? theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </Animated.View>
  );
}
