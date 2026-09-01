import React, { useEffect } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../motion';
import { useTheme } from '../theme/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.jpeg');
const LOGO_ASPECT = 1600 / 384;

const HOLD_MS = 850;

export interface LaunchScreenProps {
  onFinish: () => void;
}

export function LaunchScreen({ onFinish }: LaunchScreenProps): React.JSX.Element {
  const theme = useTheme();
  const { timing, spring, reduceMotion } = useMotion();
  const { width } = useWindowDimensions();

  const logoWidth = Math.min(width * 0.68, 380);
  const logoHeight = logoWidth / LOGO_ASPECT;

  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const overlay = useSharedValue(1);
  const lineWidth = useSharedValue(reduceMotion ? 1 : 0);
  const orb1 = useSharedValue(reduceMotion ? 1 : 0);
  const orb2 = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    enter.value = reduceMotion ? 1 : withSpring(1, spring('emphasized'));

    lineWidth.value = reduceMotion
      ? 1
      : withDelay(200, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));

    orb1.value = reduceMotion
      ? 1
      : withDelay(100, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    orb2.value = reduceMotion
      ? 1
      : withDelay(250, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    overlay.value = withDelay(
      HOLD_MS,
      withTiming(0, timing('normal', 'exit'), (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.92 + enter.value * 0.08 }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineWidth.value }],
    opacity: lineWidth.value,
  }));

  const orb1Style = useAnimatedStyle(() => ({
    opacity: orb1.value * 0.08,
    transform: [{ scale: 0.5 + orb1.value * 0.5 }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    opacity: orb2.value * 0.06,
    transform: [{ scale: 0.5 + orb2.value * 0.5 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.launch,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        },
        overlayStyle,
      ]}
    >
      {/* Decorative orbs */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: '#E5178B',
          },
          orb1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -40,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: '#F47C20',
          },
          orb2Style,
        ]}
      />

      <Animated.View style={logoStyle}>
        <Image
          source={LOGO}
          resizeMode="contain"
          style={{ width: logoWidth, height: logoHeight }}
          accessible
          accessibilityRole="image"
          accessibilityLabel="بيت الهناء — for fast food"
        />
      </Animated.View>

      {/* Animated brand underline */}
      <Animated.View style={[{ marginTop: 16 }, lineStyle]}>
        <View
          style={{
            width: logoWidth * 0.36,
            height: 3,
            borderRadius: 2,
            backgroundColor: '#E5178B',
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}
