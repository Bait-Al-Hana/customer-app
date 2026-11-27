import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/theme';
import { useMotion } from './MotionProvider';

/** A point on screen, in window coordinates. */
export interface FlightOrigin {
  x: number;
  y: number;
}

interface Flight extends FlightOrigin {
  id: number;
}

export interface CartFlightContextValue {
  /**
   * Launch a little mark from `from` (a window-coordinate point, e.g. the centre
   * of a pressed "+") that arcs down into the cart. A no-op under reduced
   * motion — the add is already confirmed by the button's check and the cart
   * badge, so the flight is pure delight, never the signal itself.
   */
  fly: (from: FlightOrigin) => void;
}

const CartFlightContext = createContext<CartFlightContextValue | null>(null);

/**
 * Renders the "item flies into the cart" animation on add-to-cart.
 *
 * It sits once near the top of the tree and exposes `fly(point)`. Each call
 * mounts one short-lived dot in a full-screen, non-interactive overlay that
 * travels from the press point to the floating cart (bottom-centre), shrinking
 * and fading as it lands. Dots remove themselves when they finish, so nothing
 * accumulates.
 *
 * Why an overlay provider rather than per-button animation: the dot has to
 * travel *across* components (from a menu card down to the cart bar), which a
 * view clipped to the card cannot do. The provider owns one overlay above
 * everything instead.
 */
export function CartFlightProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { reduceMotion } = useMotion();
  const [flights, setFlights] = useState<Flight[]>([]);

  const remove = useCallback((id: number) => {
    setFlights((list) => list.filter((f) => f.id !== id));
  }, []);

  const fly = useCallback(
    (from: FlightOrigin) => {
      if (reduceMotion) {
        return;
      }
      // A monotonic id; Date.now ties are avoided by also mixing in a counter.
      const id = Date.now() + Math.random();
      setFlights((list) => [...list, { id, x: from.x, y: from.y }]);
    },
    [reduceMotion],
  );

  const value = useMemo<CartFlightContextValue>(() => ({ fly }), [fly]);

  return (
    <CartFlightContext.Provider value={value}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // High stacking order so the mark paints above the navigator and tab
        // bar — on react-native-web especially, without this the dot can render
        // behind page content and look like "nothing happened".
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 9999, elevation: 9999 }}
      >
        {flights.map((f) => (
          <FlightDot key={f.id} from={f} onDone={() => remove(f.id)} />
        ))}
      </Animated.View>
    </CartFlightContext.Provider>
  );
}

function FlightDot({ from, onDone }: { from: Flight; onDone: () => void }): React.JSX.Element {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const SIZE = 22;

  // The cart lives bottom-centre (the FloatingCart bar). Travel there from the
  // press point; measure from the dot's own top-left, so offset by half its size.
  const dx = width / 2 - from.x;
  const dy = height - 72 - from.y;

  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // A gentle arc: lift up a touch early, then fall into the cart.
    const arc = -60 * Math.sin(Math.PI * p);
    return {
      opacity: p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15,
      transform: [
        { translateX: dx * p },
        { translateY: dy * p + arc },
        { scale: 1 - 0.6 * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: from.x - SIZE / 2,
          top: from.y - SIZE / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: theme.colors.primary,
        },
        theme.shadow(2),
        style,
      ]}
    />
  );
}

/**
 * Access the cart-flight launcher. Never throws without a provider — it returns
 * a no-op `fly`, so an `AddButton` rendered in a test or outside the provider
 * still works (it just skips the decorative flight).
 */
export function useCartFlight(): CartFlightContextValue {
  return useContext(CartFlightContext) ?? { fly: () => undefined };
}
