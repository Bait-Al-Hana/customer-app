/**
 * Smooth driver-marker movement between polls.
 *
 * The tracking map refreshes the driver's position on an 8-second poll. Jumping
 * the pin to each new coordinate reads as a stutter on the one screen a
 * customer watches *because* they want to know where their food is. This glides
 * it from the old point to the new one instead — no new location source, just
 * animated interpolation of the value already arriving.
 *
 * `lerpCoordinate` is pure and unit-tested; the hook is a thin `requestAnimation
 * Frame` loop over it. Under reduced motion the hook snaps to the target, with
 * no travel — the position is the essential part, not the movement.
 */

import { useEffect, useRef, useState } from 'react';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Linear interpolation between two coordinates. `t` is clamped to [0, 1]. Pure. */
export function lerpCoordinate(from: Coordinate, to: Coordinate, t: number): Coordinate {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * clamped,
    longitude: from.longitude + (to.longitude - from.longitude) * clamped,
  };
}

/** True when two coordinates are close enough to treat as the same point. */
export function sameCoordinate(a: Coordinate | null, b: Coordinate | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  // ~1e-6 degrees is roughly 0.1 m — well below GPS noise.
  return Math.abs(a.latitude - b.latitude) < 1e-6 && Math.abs(a.longitude - b.longitude) < 1e-6;
}

export interface AnimatedCoordinateOptions {
  /** How long the glide takes, in ms. Defaults to the poll interval. */
  durationMs?: number;
  /** Snap instantly when true (reduced motion). */
  reduceMotion?: boolean;
}

/**
 * Returns a coordinate that animates toward `target` whenever `target` changes.
 *
 * The first non-null target appears immediately (a pin should not glide in from
 * nowhere). After that, each change animates from the current displayed point
 * to the new one. A null target yields null.
 */
export function useAnimatedCoordinate(
  target: Coordinate | null,
  options: AnimatedCoordinateOptions = {},
): Coordinate | null {
  const { durationMs = 8000, reduceMotion = false } = options;
  const [current, setCurrent] = useState<Coordinate | null>(target);
  const frameRef = useRef<number | null>(null);
  const currentRef = useRef<Coordinate | null>(target);
  currentRef.current = current;

  useEffect(() => {
    if (target === null) {
      setCurrent(null);
      return;
    }
    const start = currentRef.current;
    // No prior point, reduced motion, or an imperceptible move: snap.
    if (start === null || reduceMotion || durationMs <= 0 || sameCoordinate(start, target)) {
      setCurrent(target);
      return;
    }

    const from = start;
    const startedAt = Date.now();
    const step = (): void => {
      const t = Math.min(1, (Date.now() - startedAt) / durationMs);
      setCurrent(lerpCoordinate(from, target, t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
    // Animate on a genuine change of destination only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.latitude, target?.longitude, reduceMotion, durationMs]);

  return current;
}
