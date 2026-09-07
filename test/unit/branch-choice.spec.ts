import { branchesFor, distanceKm, hasPin, pointOf, resolveBranch } from '../../src/util/branchChoice';
import { ORDER_TYPE } from '../../src/types/backend';

const branch = (
  id: string,
  latitude: number | null,
  longitude: number | null,
  overrides: Partial<{ acceptsDelivery: boolean; acceptsPickup: boolean; isAcceptingOrders: boolean }> = {},
) => ({
  id,
  name: `Branch ${id}`,
  latitude,
  longitude,
  acceptsDelivery: true,
  acceptsPickup: true,
  isAcceptingOrders: true,
  ...overrides,
});

// Riyadh: roughly 3 km apart, which is the scale this actually runs at.
const HOME = { latitude: 24.7136, longitude: 46.6753 };
const NEAR = branch('near', 24.72, 46.68);
const FAR = branch('far', 24.85, 46.9);

describe('distanceKm', () => {
  it('measures a known short hop in kilometres', () => {
    const km = distanceKm(HOME, { latitude: 24.7136, longitude: 46.7053 });
    // 0.03° of longitude at this latitude is a little over 3 km.
    expect(km).toBeGreaterThan(2.8);
    expect(km).toBeLessThan(3.4);
  });

  it('is zero for the same point', () => {
    expect(distanceKm(HOME, HOME)).toBeCloseTo(0, 6);
  });
});

describe('hasPin', () => {
  it('rejects a missing pin and the 0,0 default', () => {
    expect(hasPin(null)).toBe(false);
    expect(hasPin({ latitude: null, longitude: null })).toBe(false);
    // 0,0 is the Atlantic — an unset default, never a Saudi address.
    expect(hasPin({ latitude: 0, longitude: 0 })).toBe(false);
    expect(hasPin(HOME)).toBe(true);
  });
});

describe('branchesFor', () => {
  it('offers only branches that do the thing being asked for', () => {
    const pickupOnly = branch('p', 24.7, 46.7, { acceptsDelivery: false });
    const deliveryOnly = branch('d', 24.7, 46.7, { acceptsPickup: false });

    expect(branchesFor([pickupOnly, deliveryOnly], ORDER_TYPE.PICKUP).map((b) => b.id)).toEqual(['p']);
    expect(branchesFor([pickupOnly, deliveryOnly], ORDER_TYPE.DELIVERY).map((b) => b.id)).toEqual(['d']);
  });
});

describe('resolveBranch — delivery', () => {
  it('picks the nearest branch and does not let the customer change it', () => {
    const resolved = resolveBranch([FAR, NEAR], ORDER_TYPE.DELIVERY, HOME);

    expect(resolved.branch?.id).toBe('near');
    expect(resolved.changeable).toBe(false);
    expect(resolved.needsAddress).toBe(false);
    expect(resolved.distanceKm).not.toBeNull();
    expect(resolved.distanceKm!).toBeLessThan(2);
  });

  it('ignores a nearer branch that does not deliver', () => {
    const nearPickupOnly = branch('near-pickup', 24.714, 46.676, { acceptsDelivery: false });

    expect(resolveBranch([nearPickupOnly, FAR], ORDER_TYPE.DELIVERY, HOME).branch?.id).toBe('far');
  });

  it('asks for an address rather than claiming a nearest branch it could not work out', () => {
    // No saved address with a pin: we still show a branch (refusing to serve
    // someone over our own missing data is the worse error) but we say so.
    const noPin = resolveBranch([NEAR, FAR], ORDER_TYPE.DELIVERY, null);
    expect(noPin.branch?.id).toBe('near');
    expect(noPin.needsAddress).toBe(true);
    expect(noPin.distanceKm).toBeNull();

    // Branches without coordinates are the same situation from the other side.
    const unpinnedBranches = resolveBranch(
      [branch('a', null, null), branch('b', null, null)],
      ORDER_TYPE.DELIVERY,
      HOME,
    );
    expect(unpinnedBranches.needsAddress).toBe(true);
    expect(unpinnedBranches.branch?.id).toBe('a');
  });

  it('prefers an open branch, but shows a closed one rather than nothing', () => {
    const closedNear = branch('near', 24.72, 46.68, { isAcceptingOrders: false });
    expect(resolveBranch([closedNear, FAR], ORDER_TYPE.DELIVERY, HOME).branch?.id).toBe('far');

    const allClosed = [closedNear, branch('far', 24.85, 46.9, { isAcceptingOrders: false })];
    expect(resolveBranch(allClosed, ORDER_TYPE.DELIVERY, HOME).branch?.id).toBe('near');
  });

  it('returns nothing when no branch delivers', () => {
    const pickupOnly = branch('p', 24.7, 46.7, { acceptsDelivery: false });
    const resolved = resolveBranch([pickupOnly], ORDER_TYPE.DELIVERY, HOME);

    expect(resolved.branch).toBeNull();
    expect(resolved.changeable).toBe(false);
  });
});

describe('resolveBranch — pickup', () => {
  it('keeps the customer’s own choice and lets them change it', () => {
    const resolved = resolveBranch([NEAR, FAR], ORDER_TYPE.PICKUP, HOME, 'far');

    expect(resolved.branch?.id).toBe('far');
    expect(resolved.changeable).toBe(true);
  });

  it('falls back when the branch they chose stopped doing pickup', () => {
    const noLongerPickup = branch('far', 24.85, 46.9, { acceptsPickup: false });
    const resolved = resolveBranch([NEAR, noLongerPickup], ORDER_TYPE.PICKUP, HOME, 'far');

    expect(resolved.branch?.id).toBe('near');
  });

  it('does not need an address — the customer is the one travelling', () => {
    const resolved = resolveBranch([NEAR, FAR], ORDER_TYPE.PICKUP, null);

    expect(resolved.needsAddress).toBe(false);
    expect(resolved.distanceKm).toBeNull();
    expect(resolved.branch?.id).toBe('near');
  });
});

/**
 * The backend stores latitude and longitude as `Decimal` columns, and
 * `Prisma.Decimal` serialises to a JSON **string**. `pointOf` used to require
 * `typeof === 'number'`, so `"24.72"` read as no pin at all: the tracking screen
 * showed no distance and no ETA while the driver was pinging every thirty
 * seconds, and the web map crashed on the same value. Both are fixed at the
 * backend boundary; this holds the client's side of it, because an app already
 * installed cannot be updated to match a server.
 */
describe('pointOf with a coordinate that arrived as a string', () => {
  it('reads a decimal string', () => {
    expect(pointOf({ latitude: '24.7241234', longitude: '46.6812345' })).toEqual({
      latitude: 24.7241234,
      longitude: 46.6812345,
    });
  });

  it('still refuses 0,0 — the Atlantic, never a Saudi address', () => {
    expect(pointOf({ latitude: '0', longitude: '0' })).toBeNull();
  });

  it('refuses anything unreadable rather than producing NaN', () => {
    expect(pointOf({ latitude: 'nowhere', longitude: '46.68' })).toBeNull();
    expect(pointOf({ latitude: '', longitude: '' })).toBeNull();
    expect(pointOf(null)).toBeNull();
  });
});

/**
 * A branch shut for the night must not be picked as the nearest *open* one.
 * `resolveBranch` used to read only `isAcceptingOrders` — the manual switch —
 * so a customer was routed to a branch that had closed at 23:00 and found out
 * at the Pay button.
 */
describe('resolveBranch with opening hours', () => {
  const branch = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    name: id,
    latitude: 24.7,
    longitude: 46.7,
    acceptsDelivery: true,
    acceptsPickup: true,
    isAcceptingOrders: true,
    ...extra,
  });

  it('prefers a branch inside its hours over one that has closed for the night', () => {
    const resolved = resolveBranch(
      [branch('shut', { isOpenNow: false }), branch('open', { isOpenNow: true })],
      ORDER_TYPE.PICKUP,
      null,
    );
    expect(resolved.branch?.id).toBe('open');
  });

  it('still shows a closed branch when every branch is closed', () => {
    // "Closed now" is information; an empty screen is not.
    const resolved = resolveBranch([branch('shut', { isOpenNow: false })], ORDER_TYPE.PICKUP, null);
    expect(resolved.branch?.id).toBe('shut');
  });

  it('treats a branch with no schedule as available, not as closed', () => {
    const resolved = resolveBranch([branch('unscheduled')], ORDER_TYPE.PICKUP, null);
    expect(resolved.branch?.id).toBe('unscheduled');
  });
});
