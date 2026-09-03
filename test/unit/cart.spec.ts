import {
  Cart,
  cartCount,
  cartFromOrder,
  cartReducer,
  EMPTY_CART,
  estimatedTotalMinor,
  lineKey,
  toOrderItems,
} from '../../src/cart/cart';

const addBurger = (over = {}) =>
  ({
    type: 'ADD' as const,
    branchId: 'b1',
    line: { productId: 'p1', productName: 'Burger', unitPriceMinor: 3000, addonIds: [], addonNames: [] },
    ...over,
  });

/** First line, asserted present — keeps `noUncheckedIndexedAccess` happy in tests. */
function first(cart: Cart) {
  const line = cart.lines[0];
  if (!line) {
    throw new Error('expected at least one cart line');
  }
  return line;
}

describe('cart reducer', () => {
  it('adds an item and stacks the same product+addons', () => {
    let cart: Cart = EMPTY_CART;
    cart = cartReducer(cart, addBurger());
    cart = cartReducer(cart, addBurger());
    expect(cart.lines).toHaveLength(1);
    expect(first(cart).quantity).toBe(2);
    expect(cartCount(cart)).toBe(2);
    expect(cart.branchId).toBe('b1');
  });

  it('keeps different addon sets as separate lines', () => {
    let cart: Cart = EMPTY_CART;
    cart = cartReducer(cart, addBurger());
    cart = cartReducer(cart, addBurger({ line: { productId: 'p1', productName: 'Burger', unitPriceMinor: 3500, addonIds: ['a1'], addonNames: ['Cheese'] } }));
    expect(cart.lines).toHaveLength(2);
  });

  it('replaces the cart when adding from a different branch', () => {
    let cart: Cart = EMPTY_CART;
    cart = cartReducer(cart, addBurger());
    cart = cartReducer(cart, addBurger({ branchId: 'b2' }));
    expect(cart.branchId).toBe('b2');
    expect(cart.lines).toHaveLength(1);
  });

  it('sets quantity and removes a line at zero', () => {
    let cart: Cart = cartReducer(EMPTY_CART, addBurger());
    const key = first(cart).key;
    cart = cartReducer(cart, { type: 'SET_QTY', key, quantity: 5 });
    expect(first(cart).quantity).toBe(5);
    cart = cartReducer(cart, { type: 'SET_QTY', key, quantity: 0 });
    expect(cart.lines).toHaveLength(0);
    expect(cart.branchId).toBeNull();
  });

  it('removes a line and clears', () => {
    let cart: Cart = cartReducer(EMPTY_CART, addBurger());
    const key = first(cart).key;
    cart = cartReducer(cart, { type: 'REMOVE', key });
    expect(cart.lines).toHaveLength(0);
    cart = cartReducer(cartReducer(EMPTY_CART, addBurger()), { type: 'CLEAR' });
    expect(cart).toEqual(EMPTY_CART);
  });

  it('computes a local estimated total and order items', () => {
    let cart: Cart = cartReducer(EMPTY_CART, addBurger());
    cart = cartReducer(cart, { type: 'SET_QTY', key: first(cart).key, quantity: 3 });
    expect(estimatedTotalMinor(cart)).toBe(9000);
    expect(toOrderItems(cart)).toEqual([{ productId: 'p1', quantity: 3, addonIds: [] }]);
  });

  it('lineKey is order-independent for addons', () => {
    expect(lineKey('p1', ['a2', 'a1'])).toBe(lineKey('p1', ['a1', 'a2']));
  });
});

describe('cartFromOrder (reorder)', () => {
  const line = (over: Partial<Parameters<typeof cartFromOrder>[0]['items'][number]> = {}) => ({
    productId: 'p1',
    productName: 'Shawarma',
    quantity: 2,
    unitPriceMinor: 1500,
    ...over,
  });

  it('rebuilds a cart from a past order', () => {
    const { cart, unavailable } = cartFromOrder({ branchId: 'b1', items: [line()] });

    expect(unavailable).toEqual([]);
    expect(cart.branchId).toBe('b1');
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ productId: 'p1', quantity: 2, unitPriceMinor: 1500 });
  });

  it('carries add-ons over and keys the line by them', () => {
    const { cart } = cartFromOrder({
      branchId: 'b1',
      items: [
        line({ modifiers: [{ addonId: 'a1', addonName: 'Extra garlic' }] }),
      ],
    });

    expect(cart.lines[0]?.addonIds).toEqual(['a1']);
    expect(cart.lines[0]?.addonNames).toEqual(['Extra garlic']);
    expect(cart.lines[0]?.key).toBe(lineKey('p1', ['a1']));
  });

  it('drops a line whose product has been deleted, and names it', () => {
    const { cart, unavailable } = cartFromOrder({
      branchId: 'b1',
      items: [line(), line({ productId: null, productName: 'Discontinued Dish' })],
    });

    expect(cart.lines).toHaveLength(1);
    expect(unavailable).toEqual(['Discontinued Dish']);
  });

  it('drops a line whose add-on has been deleted rather than reordering it wrong', () => {
    const { cart, unavailable } = cartFromOrder({
      branchId: 'b1',
      items: [line({ modifiers: [{ addonId: null, addonName: 'Gone' }] })],
    });

    // Reordering without the add-on would change what the customer asked for.
    expect(cart.lines).toHaveLength(0);
    expect(unavailable).toEqual(['Shawarma']);
  });

  it('returns an empty cart when nothing on the order can be bought', () => {
    const { cart, unavailable } = cartFromOrder({
      branchId: 'b1',
      items: [line({ productId: null, productName: 'Gone' })],
    });

    expect(cart).toEqual(EMPTY_CART);
    expect(unavailable).toEqual(['Gone']);
  });

  it('stacks two identical lines instead of duplicating them', () => {
    const { cart } = cartFromOrder({ branchId: 'b1', items: [line(), line({ quantity: 3 })] });

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(5);
  });
});

describe('REPLACE', () => {
  it('swaps the whole cart in one step', () => {
    const start = cartReducer(EMPTY_CART, {
      type: 'ADD',
      branchId: 'b1',
      line: { productId: 'p1', productName: 'A', unitPriceMinor: 100, addonIds: [], addonNames: [] },
    });
    const replacement = cartFromOrder({
      branchId: 'b2',
      items: [{ productId: 'p9', productName: 'B', quantity: 1, unitPriceMinor: 900 }],
    }).cart;

    const next = cartReducer(start, { type: 'REPLACE', cart: replacement });

    expect(next.branchId).toBe('b2');
    expect(next.lines.map((l) => l.productId)).toEqual(['p9']);
  });

  it('never leaves a cart pointing at a branch with no lines', () => {
    const next = cartReducer(EMPTY_CART, { type: 'REPLACE', cart: { branchId: 'b1', lines: [] } });
    expect(next).toEqual(EMPTY_CART);
  });
});
