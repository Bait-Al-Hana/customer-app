import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';

export interface ShimmerProps {
  width?: number | string;
  height: number;
  radius?: number;
  style?: object;
}

export function Shimmer({
  width,
  height,
  radius = 12,
  style,
}: ShimmerProps): React.JSX.Element {
  const theme = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.6,
  }));

  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            backgroundColor: theme.colors.skeleton,
            borderRadius: radius,
          },
          animatedStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.skeletonHighlight,
              borderRadius: radius,
            },
            useAnimatedStyle(() => ({
              opacity: shimmer.value,
            })),
          ]}
        />
      </Animated.View>
    </View>
  );
}
