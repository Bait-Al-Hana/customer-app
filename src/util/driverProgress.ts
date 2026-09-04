import { distanceKm, GeoPoint, pointOf } from './branchChoice';

/**
 * "Where has the driver got to?" — from the two things we actually know.
 *
 * The tracking screen used to answer that with a hard-coded **"~15 min"** shown
 * to every customer on every order, and a map that never moved because nothing
 * in the platform ever sent a driver's position. Both halves were fiction.
 *
 * Now the driver's app pings while it is carrying the order, and this turns the
 * latest ping into the two facts a waiting customer wants: how far away their
 * food is, and roughly how long that is. Pure, so the arithmetic and — more
 * importantly — the refusals are testable without a map, a driver or a phone.
 *
 * ## What it will not say
 *
 * - **No ETA without a fix.** A number invented while we do not know where the
 *   driver is, is the "~15 min" all over again.
 * - **No ETA from a stale fix.** A driver whose last ping was ten minutes ago
 *   may be at the door or may have lost signal on the ring road. The screen
 *   says when they were last seen and stops there, because a confident wrong
 *   ETA is what makes someone ring the branch.
 * - **No promise of precision.** The estimate is straight-line distance
 *   inflated for roads and divided by a town speed — the same shape of
 *   approximation the backend prices delivery with. It is rendered as a rounded
 *   "about N min", never as an arrival time.
 */

/**
 * Straight-line distance is multiplied by this to approximate the road.
 * The same 1.3 the backend charges delivery by — the two must not disagree
 * about how far away a customer is.
 */
const ROAD_FACTOR = 1.3;

/**
 * Average speed of a delivery bike through a city, in km/h, door to door —
 * lights, turns and finding the building included. Deliberately conservative:
 * arriving before the estimate is a good surprise, and the opposite is the
 * phone call.
 */
const AVERAGE_SPEED_KMH = 22;

/**
 * How old a fix may be and still count as live. Pings arrive every 30 seconds
 * while a driver is carrying an order, so three minutes is several missed ones
 * — a signal drop, a backgrounded app, a dead battery — not ordinary jitter.
 */
export const STALE_AFTER_MS = 3 * 60 * 1000;

export interface DriverProgress {
  /** Road-adjusted distance to the customer, in km. Null when unknown. */
  distanceKm: number | null;
  /** Rounded minutes, or null when we will not guess. */
  etaMinutes: number | null;
  /** Milliseconds since the driver's last fix, or null when there has been none. */
  fixAgeMs: number | null;
  /** True when the last fix is recent enough to present as where they are now. */
  live: boolean;
}

export interface DriverFix {
  latitude?: number | null;
  longitude?: number | null;
  lastLocationAt?: string | null;
}

export function driverProgress(
  driver: DriverFix | null | undefined,
  destination: { latitude?: number | null; longitude?: number | null } | null | undefined,
  now: number = Date.now(),
): DriverProgress {
  const from = pointOf(driver);
  const to = pointOf(destination);
  const fixAgeMs = ageOf(driver?.lastLocationAt, now);
  const live = fixAgeMs !== null && fixAgeMs <= STALE_AFTER_MS;

  if (!from || !to) {
    return { distanceKm: null, etaMinutes: null, fixAgeMs, live: live && !!from };
  }

  const km = round1(distanceKm(from as GeoPoint, to as GeoPoint) * ROAD_FACTOR);

  return {
    distanceKm: km,
    // An estimate is only offered while the fix is worth trusting.
    etaMinutes: live ? etaFor(km) : null,
    fixAgeMs,
    live,
  };
}

/**
 * Minutes, rounded up and floored at one.
 *
 * "0 min away" reads as a bug, and a driver 200 m from the door is still a
 * minute of parking and stairs away.
 */
function etaFor(km: number): number {
  return Math.max(1, Math.ceil((km / AVERAGE_SPEED_KMH) * 60));
}

/** "just now", "4 min ago" — how fresh the position on screen is. */
export function freshnessLabel(fixAgeMs: number | null): string | null {
  if (fixAgeMs === null || fixAgeMs < 0) {
    return null;
  }
  const minutes = Math.floor(fixAgeMs / 60_000);
  if (minutes < 1) {
    return 'updated just now';
  }
  if (minutes === 1) {
    return 'updated 1 min ago';
  }
  if (minutes < 60) {
    return `updated ${minutes} min ago`;
  }
  return 'updated over an hour ago';
}

function ageOf(iso: string | null | undefined, now: number): number | null {
  if (!iso) {
    return null;
  }
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? null : Math.max(0, now - at);
}

function round1(km: number): number {
  return Math.round(km * 10) / 10;
}
