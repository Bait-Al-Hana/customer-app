import { acceptDriverPing } from '../../src/realtime/driver-ping';

const ORDER = 'order-1';
const good = { orderId: ORDER, latitude: 24.7241, longitude: 46.6812, at: 'now' };

describe('acceptDriverPing', () => {
  it('accepts a well-formed ping for the order on screen', () => {
    expect(acceptDriverPing(good, ORDER)).toBe(true);
  });

  it('drops a ping for another order', () => {
    // A customer with two deliveries out must not see one driver on the other's
    // map — they would be watching a stranger drive around.
    expect(acceptDriverPing({ ...good, orderId: 'order-2' }, ORDER)).toBe(false);
  });

  it('drops an unlabelled ping rather than trusting it', () => {
    // Deliberately the opposite of the reload hook, which treats a missing
    // orderId as relevant. A needless refetch is cheap; a wrong marker is not.
    expect(acceptDriverPing({ ...good, orderId: undefined }, ORDER)).toBe(false);
  });

  it('drops coordinates that are not numbers', () => {
    // These are Decimal columns, and a Decimal serialises to a JSON *string*.
    // That exact shape crashed this screen once.
    expect(
      acceptDriverPing({ ...good, latitude: '24.72' as unknown as number }, ORDER),
    ).toBe(false);
    expect(acceptDriverPing({ ...good, longitude: undefined }, ORDER)).toBe(false);
  });

  it('drops nothing at all', () => {
    expect(acceptDriverPing(null, ORDER)).toBe(false);
    expect(acceptDriverPing(undefined, ORDER)).toBe(false);
  });
});
