import { correctedType, fulfilmentOptions } from '../../src/util/fulfilment';

const both = { acceptsPickup: true, acceptsDelivery: true };
const deliveryOnly = { acceptsPickup: false, acceptsDelivery: true };
const pickupOnly = { acceptsPickup: true, acceptsDelivery: false };
const closed = { acceptsPickup: false, acceptsDelivery: false };

describe('fulfilmentOptions', () => {
  it('offers a choice when the branch does both', () => {
    expect(fulfilmentOptions(both)).toEqual({
      offersPickup: true,
      offersDelivery: true,
      showsChoice: true,
      closed: false,
    });
  });

  it('offers no choice at a delivery-only branch', () => {
    // The owner switched pickup off. There is nothing to choose between, so
    // the screen states what the branch does rather than showing a tab that
    // cannot be pressed.
    const options = fulfilmentOptions(deliveryOnly);

    expect(options.offersPickup).toBe(false);
    expect(options.showsChoice).toBe(false);
    expect(options.closed).toBe(false);
  });

  it('offers no choice at a pickup-only branch', () => {
    expect(fulfilmentOptions(pickupOnly).offersDelivery).toBe(false);
  });

  it('knows a branch that will take nothing', () => {
    expect(fulfilmentOptions(closed).closed).toBe(true);
  });

  it('assumes both while the branch is still loading', () => {
    // So the tabs do not flicker in and out on a slow connection. The server
    // refuses an unsupported type at placement regardless.
    expect(fulfilmentOptions(null).showsChoice).toBe(true);
    expect(fulfilmentOptions(undefined).showsChoice).toBe(true);
  });
});

describe('correctedType', () => {
  it('leaves a supported choice alone', () => {
    expect(correctedType(both, 'PICKUP')).toBeNull();
    expect(correctedType(both, 'DELIVERY')).toBeNull();
    expect(correctedType(deliveryOnly, 'DELIVERY')).toBeNull();
  });

  it('moves a customer off pickup at a delivery-only branch', () => {
    // They can arrive here from a deep link, or because the owner switched
    // pickup off after the menu loaded. Leaving them on it means a rejection
    // on the final press instead of a screen that is simply correct.
    expect(correctedType(deliveryOnly, 'PICKUP')).toBe('DELIVERY');
  });

  it('moves a customer off delivery at a pickup-only branch', () => {
    expect(correctedType(pickupOnly, 'DELIVERY')).toBe('PICKUP');
  });

  it('moves nobody at a closed branch', () => {
    // Switching them to a type that is also refused is a different dead end,
    // not a fix.
    expect(correctedType(closed, 'PICKUP')).toBeNull();
    expect(correctedType(closed, 'DELIVERY')).toBeNull();
  });

  it('moves nobody while the branch is still loading', () => {
    expect(correctedType(null, 'PICKUP')).toBeNull();
  });
});
