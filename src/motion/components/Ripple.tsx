import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';

export interface RippleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
  disabled?: boolean;
}

export function Ripple({
  children,
  onPress,
  style,
  rippleColor,
  disabled,
}: RippleProps): React.JSX.Element {
  const theme = useTheme();
  const color = rippleColor ?? theme.colors.primary + '20';
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const handlePress = useCallback((e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setOrigin({ x: locationX, y: locationY });
    scale.value = 0;
    opacity.value = 1;
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }, () => {
      if (onPress) runOnJS(onPress)();
    });
  }, [scale, opacity, onPress]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * 4 }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[{ overflow: 'hidden' }, style]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: color,
            left: origin.x - 20,
            top: origin.y - 20,
          },
          rippleStyle,
        ]}
      />
    </Pressable>
  );
}
