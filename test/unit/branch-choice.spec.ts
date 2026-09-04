import { branchesFor, distanceKm, hasPin, resolveBranch } from '../../src/util/branchChoice';
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
