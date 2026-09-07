import { ORDER_TYPE, OrderType } from '../types/backend';
import { isOrderable } from './branchOpen';

/**
 * Which branch an order comes from, and whether the customer gets to choose.
 *
 * Owner decision (2026-09-04), and the two halves are deliberately different:
 *
 * - **Pickup — the customer chooses.** They are the one driving there, so every
 *   branch that does pickup is offered and the choice is theirs.
 * - **Delivery — the app chooses, and it is not changeable.** The branch that
 *   delivers is the one nearest the address, because that is the one that
 *   arrives while the food is still hot and it is what the delivery fee is
 *   measured from. Letting a customer order delivery from across the city is a
 *   worse meal and a fee neither side expected.
 *
 * Pure, because this is a rule about where an order comes from — not a layout.
 * The screen renders what this decides.
 */

export interface BranchChoiceInput {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  isAcceptingOrders: boolean;
  /**
   * Inside its opening hours. Optional and **absent means no opinion**, not
   * closed — see `util/branchOpen.ts`. It matters here because a branch that is
   * merely shut for the night must not be picked as the nearest *open* one when
   * a genuinely open branch exists.
   */
  isOpenNow?: boolean;
  opensAt?: string | null;
  closedNote?: string | null;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Mean Earth radius in km — the same constant the backend prices distance with. */
const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in km.
 *
 * The straight line, like the backend's own fee calculation. This app never
 * shows a fee it computed — the number here only ranks branches and tells the
 * customer roughly how far away theirs is.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The point, when there is a real one. `0,0` is the Atlantic — what an unset
 * default looks like, and never a Saudi address, so it counts as no pin.
 *
 * Returns the point rather than narrowing its argument, so a branch passed in
 * here comes back out as a branch.
 */
export function pointOf(
  value:
    | { latitude?: number | string | null; longitude?: number | string | null }
    | null
    | undefined,
): GeoPoint | null {
  const latitude = coerce(value?.latitude);
  const longitude = coerce(value?.longitude);
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
    return null;
  }
  return { latitude, longitude };
}

/**
 * A coordinate as a number, whatever shape the server sent.
 *
 * This used to be `typeof value === 'number'`, which is stricter than it looks:
 * the backend stores latitude and longitude as `Decimal` columns and
 * **`Prisma.Decimal` serialises to a JSON string**, so a driver's live position
 * arrived as `"24.72"`. The strict check quietly returned null for it, so the
 * tracking screen reported no fix at all — no distance, no ETA, no marker —
 * while the driver was pinging every thirty seconds. That failure is silent,
 * which is why it outlived the crash on the same data (`AppMap.web.tsx`
 * called `.toFixed` on the string and took the tree down).
 *
 * The backend converts at its boundary now. This stays, because an app already
 * on a customer's phone cannot be updated to match a server.
 */
function coerce(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** True when a point is real. */
export function hasPin(
  value:
    | { latitude?: number | string | null; longitude?: number | string | null }
    | null
    | undefined,
): boolean {
  return pointOf(value) !== null;
}

/** The branches that can serve this mode at all. */
export function branchesFor<T extends BranchChoiceInput>(branches: readonly T[], mode: OrderType): T[] {
  return branches.filter((b) =>
    mode === ORDER_TYPE.DELIVERY ? b.acceptsDelivery : b.acceptsPickup,
  );
}

export interface ResolvedBranch<T> {
  branch: T | null;
  /** Straight-line km from the customer to that branch, when both are pinned. */
  distanceKm: number | null;
  /**
   * True when the customer may pick a different one. Pickup: yes. Delivery: no
   * — the nearest branch is the one that delivers.
   */
  changeable: boolean;
  /**
   * Set on delivery when we could not measure distance — no saved address with
   * a pin, or branches without coordinates. The branch shown is then a
   * *provisional* one and the screen should ask for an address rather than
   * quietly implying the nearest was worked out.
   */
  needsAddress: boolean;
}

/**
 * Resolves the branch for a mode.
 *
 * Delivery picks the nearest branch to `customer`. When nothing can be
 * measured — the customer has saved no address with a map pin, or no branch
 * carries coordinates — it falls back to the first branch that delivers and
 * flags `needsAddress`, because turning a customer away over our own missing
 * data is the more expensive error (the same call the backend makes when it
 * cannot measure a delivery distance) but pretending we found their nearest
 * branch would be a lie on the screen.
 *
 * Pickup returns `preferredId` when it is still a branch that does pickup, and
 * otherwise the first one — so a saved choice survives, and a branch that stops
 * doing pickup does not strand the customer on it.
 */
export function resolveBranch<T extends BranchChoiceInput>(
  branches: readonly T[],
  mode: OrderType,
  customer: GeoPoint | null,
  preferredId?: string | null,
): ResolvedBranch<T> {
  const candidates = branchesFor(branches, mode);
  // An open branch is preferred, but a closed one is still shown rather than
  // leaving the screen empty — "closed now" is information; nothing is not.
  //
  // "Open" now means both halves: staff have not paused orders **and** the
  // branch is inside its hours. Reading only the switch would send a customer
  // to a branch that has been shut since 23:00, and they would find out at the
  // Pay button.
  const open = candidates.filter((b) => isOrderable(b));
  const pool = open.length > 0 ? open : candidates;

  const first = pool[0];

  if (!first) {
    return {
      branch: null,
      distanceKm: null,
      changeable: mode === ORDER_TYPE.PICKUP,
      needsAddress: false,
    };
  }

  if (mode === ORDER_TYPE.PICKUP) {
    const chosen = pool.find((b) => b.id === preferredId) ?? first;
    return {
      branch: chosen,
      distanceKm: measure(customer, chosen),
      changeable: true,
      needsAddress: false,
    };
  }

  const measured = pool
    .map((branch) => ({ branch, km: measure(customer, branch) }))
    .filter((entry): entry is { branch: T; km: number } => entry.km !== null);

  if (measured.length === 0) {
    return { branch: first, distanceKm: null, changeable: false, needsAddress: true };
  }

  const nearest = measured.reduce((best, entry) => (entry.km < best.km ? entry : best));

  return {
    branch: nearest.branch,
    distanceKm: round1(nearest.km),
    changeable: false,
    needsAddress: false,
  };
}

/** Distance from the customer to a branch, or null when either has no pin. */
function measure(customer: GeoPoint | null, branch: BranchChoiceInput): number | null {
  const point = pointOf(branch);
  return customer && point ? round1(distanceKm(customer, point)) : null;
}

function round1(km: number): number {
  return Math.round(km * 10) / 10;
}
