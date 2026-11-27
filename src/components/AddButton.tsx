import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useMotion, PressableScale, useCartFlight } from '../motion';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/**
 * The "+" add-to-cart control.
 *
 * Purpose: make adding an item feel instant and confirmed. On press it springs,
 * then briefly flips to a check before returning to "+", so the tap is
 * acknowledged locally at the same moment the cart badge pops — no waiting, no
 * blocking. Under reduced motion the spring is instant and the check still
 * shows, so the confirmation survives without movement.
 */
export function AddButton({
  onPress,
  size = 40,
  accessibilityLabel = 'Add to cart',
}: {
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const { spring } = useMotion();
  const { fly } = useCartFlight();
  const scale = useSharedValue(1);
  const [checked, setChecked] = useState(false);
  const circleRef = useRef<View>(null);

  useEffect(() => {
    if (!checked) {
      return;
    }
    const t = setTimeout(() => setChecked(false), 700);
    return () => clearTimeout(t);
  }, [checked]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handle = (): void => {
    scale.value = withSequence(withSpring(0.86, spring('emphasized')), withSpring(1, spring('soft')));
    setChecked(true);
    // Launch the "fly into the cart" mark from this button's centre. Guarded:
    // measureInWindow is absent in some environments (tests), and a missing
    // flight costs nothing — the check and the cart badge still confirm the add.
    try {
      circleRef.current?.measureInWindow?.((x, y, w, h) => {
        if (typeof x === 'number' && typeof y === 'number') {
          fly({ x: x + w / 2, y: y + h / 2 });
        }
      });
    } catch {
      // ignore — purely decorative
    }
    onPress();
  };

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={handle}>
      <View ref={circleRef} collapsable={false}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          },
          theme.shadow(1),
          style,
        ]}
      >
        {checked ? (
          <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
            <Path d="M20 6L9 17l-5-5" stroke={theme.colors.onPrimary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : (
          <View style={{ marginTop: -2 }}>
            <AppText style={{ color: theme.colors.onPrimary, fontSize: size * 0.6, lineHeight: size * 0.7 }} weight="700">
              +
            </AppText>
          </View>
        )}
      </Animated.View>
      </View>
    </PressableScale>
  );
}
