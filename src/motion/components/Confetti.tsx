import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface ConfettiProps {
  /** When true, the burst mounts and plays exactly once. Render conditionally. */
  active?: boolean;
  /** How many pieces. Kept modest on purpose. */
  pieceCount?: number;
}

/**
 * A one-shot celebratory confetti burst.
 *
 * ── A deliberate exception to the motion brief. ──────────────────────────────
 * The motion design system says "nothing animates for decoration". Confetti is
 * decoration: it communicates no state the surrounding UI does not already
 * carry (the payment view says "confirmed" in words, colour and a glyph). It is
 * included as an explicitly-scoped celebratory accent for the single
 * payment-confirmed moment, with the owner's knowledge that it departs from the
 * brief. It is therefore kept narrow and safe:
 *
 *   - It is **suppressed entirely under reduced motion** (renders `null`) — the
 *     accessibility gate is not negotiable even for an accepted exception.
 *   - It **never blocks interaction**: a full-screen overlay with
 *     `pointerEvents="none"`, above nothing it needs to cover.
 *   - It **plays once and stops** — no looping, the thing the brief most warns
 *     against. One timed pass, then every piece rests invisible.
 *
 * Do not reach for this as a general-purpose effect. One confirmed-payment
 * moment is the whole remit.
 */
export function Confetti({ active = true, pieceCount = 14 }: ConfettiProps): React.JSX.Element | null {
  const { reduceMotion } = useMotion();
  const { width, height } = useWindowDimensions();
  const play = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      return;
    }
    play.value = 0;
    play.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  if (!active || reduceMotion) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    >
      {Array.from({ length: pieceCount }).map((_, i) => (
        <ConfettiPiece key={i} index={i} count={pieceCount} play={play} width={width} height={height} />
      ))}
    </Animated.View>
  );
}

function ConfettiPiece({
  index,
  count,
  play,
  width,
  height,
}: {
  index: number;
  count: number;
  play: Animated.SharedValue<number>;
  width: number;
  height: number;
}): React.JSX.Element {
  const theme = useTheme();
  const palette = [theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.success];
  const color = palette[index % palette.length];

  // Deterministic per-piece parameters, so the burst is stable and testable.
  const startX = (width * (index + 0.5)) / count;
  const drift = ((index % 5) - 2) * 26; // spread left/right
  const fall = height * (0.55 + ((index % 4) * 0.1)); // varied fall depth
  const spin = (index % 2 === 0 ? 1 : -1) * (180 + (index % 3) * 120);
  const size = 8 + (index % 3) * 2;
  const delay = (index % 6) * 0.04; // staggered starts within [0, 0.2]

  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (play.value - delay) / (1 - delay)));
    return {
      opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: drift * p },
        { translateY: -20 + fall * p },
        { rotate: `${spin * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width: size,
          height: size * 1.6,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
