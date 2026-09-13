import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';

export interface SwipeActionProps {
  children: React.ReactNode;
  onSwipe: () => void;
  actionLabel?: string;
  actionColor?: string;
  threshold?: number;
}

export function SwipeAction({
  children,
  onSwipe,
  actionLabel = 'Delete',
  actionColor,
  threshold = -80,
}: SwipeActionProps): React.JSX.Element {
  const theme = useTheme();
  const bgColor = actionColor ?? theme.colors.danger;
  const translateX = useSharedValue(0);
  const ctx = useSharedValue(0);

  const triggerSwipe = useCallback(() => {
    onSwipe();
  }, [onSwipe]);

  const pan = Gesture.Pan()
    .onStart(() => {
      ctx.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = ctx.value + e.translationX;
      translateX.value = Math.min(0, next);
    })
    .onEnd(() => {
      if (translateX.value < threshold) {
        runOnJS(triggerSwipe)();
        translateX.value = withSpring(-200, { damping: 20, stiffness: 200 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / Math.abs(threshold)),
  }));

  return (
    <View style={{ overflow: 'hidden', borderRadius: theme.radius.lg }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 120,
            backgroundColor: bgColor,
            borderRadius: theme.radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
          },
          actionStyle,
        ]}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{actionLabel}</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
