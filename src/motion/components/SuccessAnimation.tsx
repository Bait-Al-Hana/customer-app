import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface SuccessAnimationProps {
  size?: number;
  playing?: boolean;
}

/**
 * A checkmark-in-circle that draws itself on mount — the "payment
 * succeeded" moment. The ring scales up, then the tick strokes in.
 * Under reduced motion everything appears instantly.
 */
export function SuccessAnimation({
  size = 100,
  playing = true,
}: SuccessAnimationProps): React.JSX.Element {
  const theme = useTheme();
  const { reduceMotion } = useMotion();

  const circleScale = useSharedValue(reduceMotion || !playing ? 1 : 0);
  const circleOpacity = useSharedValue(reduceMotion || !playing ? 1 : 0);
  const checkOpacity = useSharedValue(reduceMotion || !playing ? 1 : 0);
  const checkScale = useSharedValue(reduceMotion || !playing ? 1 : 0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);

  useEffect(() => {
    if (!playing || reduceMotion) return;

    circleScale.value = withSequence(
      withTiming(1.1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) }),
    );
    circleOpacity.value = withTiming(1, { duration: 250 });

    checkOpacity.value = withDelay(280, withTiming(1, { duration: 200 }));
    checkScale.value = withDelay(
      280,
      withSequence(
        withTiming(1.15, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 150 }),
      ),
    );

    burstOpacity.value = withDelay(350, withSequence(
      withTiming(0.6, { duration: 150 }),
      withTiming(0, { duration: 400 }),
    ));
    burstScale.value = withDelay(350, withTiming(1.8, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const circleAnim = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [{ scale: circleScale.value }],
  }));

  const checkAnim = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const burstAnim = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  const r = size / 2;
  const stroke = size * 0.06;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, burstAnim]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={r} cy={r} r={r - stroke} fill="none" stroke={theme.colors.success} strokeWidth={stroke * 0.5} strokeDasharray="4 8" opacity={0.4} />
        </Svg>
      </Animated.View>

      <Animated.View style={circleAnim}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={r} cy={r} r={r - stroke} fill={theme.colors.success} opacity={0.12} />
          <Circle cx={r} cy={r} r={r - stroke} fill="none" stroke={theme.colors.success} strokeWidth={stroke} />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute' }, checkAnim]}>
        <Svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
          <Path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke={theme.colors.success}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
