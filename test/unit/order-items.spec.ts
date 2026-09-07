import { itemCount, itemCountLabel } from '../../src/util/orderItems';

/**
 * `Order.items` is what the server sends, and an app on a customer's phone
 * cannot be updated to match a server. `.length` on an absent array throws
 * inside render and unmounts the tree — which is the blank "Something went
 * wrong" screen, not a missing line of text. Found in Chromium against the real
 * web bundle by serving an order with no `items` key.
 */
describe('itemCountLabel', () => {
  it('counts and pluralises', () => {
    expect(itemCountLabel([{}])).toBe('1 item');
    expect(itemCountLabel([{}, {}])).toBe('2 items');
    expect(itemCountLabel([])).toBe('0 items');
  });

  it('survives an order that arrived without its items', () => {
    expect(itemCount(undefined)).toBe(0);
    expect(itemCount(null)).toBe(0);
    expect(itemCountLabel(undefined)).toBe('0 items');
    // Not an array at all — a server sending an object here must cost the
    // count, not the screen.
    expect(itemCount({ length: 3 } as unknown as unknown[])).toBe(0);
  });
});
