import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useMotion } from '../MotionProvider';

export interface FloatingBarProps {
  visible: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A bar that springs up from the bottom when visible and springs
 * back down when hidden — used for the floating cart bar and the
 * checkout CTA.
 */
export function FloatingBar({ visible, children, style }: FloatingBarProps): React.JSX.Element {
  const { spring } = useMotion();
  const translateY = useSharedValue(visible ? 0 : 100);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 100, spring('standard'));
    opacity.value = withSpring(visible ? 1 : 0, spring('soft'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
