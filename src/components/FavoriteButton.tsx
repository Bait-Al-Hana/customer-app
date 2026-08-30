import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useMotion } from '../motion';
import { PressableScale } from '../motion';
import { useTheme } from '../theme/theme';

/**
 * A heart toggle with a subtle pop when it becomes filled.
 *
 * Purpose: make favouriting feel rewarding without the "excessive bounce" the
 * brief rejects — a single small spring on the fill, nothing on unfill. Under
 * reduced motion the spring settles instantly, so the state still flips clearly.
 * The heart sits on a translucent chip so it stays legible over food imagery.
 */
export function FavoriteButton({
  active,
  onToggle,
  size = 34,
  onImage,
}: {
  active: boolean;
  onToggle: () => void;
  size?: number;
  onImage?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const { spring, reduceMotion } = useMotion();
  const pop = useSharedValue(1);
  const first = useSharedValue(true);

  useEffect(() => {
    if (first.value) {
      first.value = false;
      return;
    }
    if (active && !reduceMotion) {
      pop.value = withSequence(withSpring(1.3, spring('emphasized')), withSpring(1, spring('soft')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const iconColor = active ? theme.colors.primary : onImage ? '#FFFFFF' : theme.colors.textMuted;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? 'Remove from favorites' : 'Add to favorites'}
      onPress={onToggle}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: onImage ? 'rgba(0,0,0,0.28)' : theme.colors.surfaceAlt,
      }}
    >
      <Animated.View style={style}>
        <View>
          <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill={active ? theme.colors.primary : 'none'}>
            <Path
              d="M12 21s-7.5-4.7-10-9.3C.6 8.9 2 5.5 5.2 5.5c2 0 3.3 1.2 4.8 3 1.5-1.8 2.8-3 4.8-3 3.2 0 4.6 3.4 3.2 6.2C19.5 16.3 12 21 12 21z"
              fill={active ? theme.colors.primary : 'none'}
              stroke={iconColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Animated.View>
    </PressableScale>
  );
}
