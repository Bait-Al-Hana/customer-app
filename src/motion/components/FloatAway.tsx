import React, { useEffect } from 'react';
import { StyleProp, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface FloatAwayProps {
  /**
   * A counter. A *change* in this value (never the initial mount) plays one
   * float. Callers bump it — e.g. `setBursts((b) => b + 1)` — on the action
   * being reinforced.
   */
  trigger: number;
  /** The text that floats. Defaults to `+1`. */
  label?: string;
  /** Upward travel in px. */
  distance?: number;
  color?: string;
  /** Positioning is the parent's job; give the parent `position: 'relative'`. */
  style?: StyleProp<ViewStyle>;
}

/**
 * A one-shot "+1" that drifts upward and fades, replayed each time `trigger`
 * changes.
 *
 * Purpose: a small, decorative reinforcement that an action *landed* (the
 * canonical use is add-to-cart), layered on top of the authoritative signal —
 * the cart badge, which still carries the real count. Because it is pure
 * reinforcement and not state, it is suppressed **entirely** under reduced
 * motion: the component renders `null`, the badge alone conveys the change.
 *
 * It never affects layout — it is absolutely positioned by its parent and
 * `pointerEvents="none"` — so it can be dropped over any control without
 * shifting it.
 */
export function FloatAway({
  trigger,
  label = '+1',
  distance = 44,
  color,
  style,
}: FloatAwayProps): React.JSX.Element | null {
  const theme = useTheme();
  const { timing, reduceMotion } = useMotion();
  // Rest state is 1 (fully travelled, invisible); a trigger resets to 0 and
  // animates back to 1, so nothing shows until the first real change.
  const progress = useSharedValue(1);
  const first = useSharedValue(true);

  useEffect(() => {
    if (first.value) {
      first.value = false;
      return;
    }
    if (reduceMotion) {
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, timing('slow', 'exit'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: -distance * progress.value },
      { scale: 1 + 0.1 * (1 - progress.value) },
    ],
  }));

  if (reduceMotion) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
        style,
      ]}
    >
      <Text style={{ color: color ?? theme.colors.primary, fontWeight: '800', fontSize: 16 }}>
        {label}
      </Text>
    </Animated.View>
  );
}
