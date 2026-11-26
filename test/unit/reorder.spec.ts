import { rebuildOrderIntoCart, skippedMessage } from '../../src/features/reorder/reorder';
import { Menu, MenuProduct, Order, OrderItem } from '../../src/api/types';

function product(over: Partial<MenuProduct>): MenuProduct {
  return {
    id: 'p',
    name: 'Item',
    nameAr: null,
    description: null,
    imageUrl: null,
    priceMinor: 1000,
    deliveryPriceMinor: 1000,
    taxClass: 'STANDARD',
    isAvailable: true,
    unavailableUntil: null,
    variants: [],
    modifierGroups: [],
    ...over,
  };
}

const menu: Menu = {
  branch: { id: 'b1', name: 'Downtown', nameAr: null },
  deliveryFeeMinor: 500,
  minOrderMinor: 0,
  categories: [
    {
      id: 'c1',
      name: 'Mains',
      nameAr: null,
      imageUrl: null,
      products: [
        product({ id: 'burger', name: 'Burger', priceMinor: 3200 }),
        product({
          id: 'fries',
          name: 'Fries',
          priceMinor: 1200,
          modifierGroups: [
            {
              id: 'g1',
              name: 'Sauce',
              nameAr: null,
              minSelections: 0,
              maxSelections: 2,
              isRequired: false,
              addons: [
                { id: 'ketchup', name: 'Ketchup', nameAr: null, priceMinor: 0 },
                { id: 'cheese', name: 'Cheese sauce', nameAr: null, priceMinor: 300 },
              ],
            },
          ],
        }),
        product({ id: 'soldout', name: 'Shawarma', priceMinor: 2500, isAvailable: false }),
      ],
    },
  ],
};

function item(over: Partial<OrderItem>): OrderItem {
  return {
    id: 'i',
    productId: 'burger',
    productName: 'Burger',
    variantName: null,
    quantity: 1,
    unitPriceMinor: 3000,
    lineTotalMinor: 3000,
    ...over,
  };
}

function order(items: OrderItem[]): Order {
  return {
    id: 'o1',
    orderNumber: '1000001',
    branchId: 'b1',
    type: 'PICKUP',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    subtotalMinor: 0,
    discountMinor: 0,
    deliveryFeeMinor: 0,
    vatMinor: 0,
    totalMinor: 0,
    items,
    placedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('rebuildOrderIntoCart', () => {
  it('rebuilds lines at today’s price, not the order snapshot', () => {
    const { cart, skipped } = rebuildOrderIntoCart(order([item({ productId: 'burger', quantity: 2, unitPriceMinor: 3000 })]), menu);
    expect(skipped).toEqual([]);
    expect(cart.branchId).toBe('b1');
    expect(cart.lines).toHaveLength(1);
    // Current menu price (3200), not the snapshotted 3000.
    expect(cart.lines[0]?.unitPriceMinor).toBe(3200);
    expect(cart.lines[0]?.quantity).toBe(2);
    expect(cart.couponCode).toBeNull();
  });

  it('re-prices surviving add-ons and drops ones the catalog lost', () => {
    const withAddons = item({
      id: 'i2',
      productId: 'fries',
      productName: 'Fries',
      modifiers: [
        { id: 'm1', addonId: 'cheese', addonName: 'Cheese sauce' },
        { id: 'm2', addonId: 'gone', addonName: 'Discontinued' },
      ],
    });
    const { cart } = rebuildOrderIntoCart(order([withAddons]), menu);
    expect(cart.lines[0]?.addonIds).toEqual(['cheese']);
    expect(cart.lines[0]?.unitPriceMinor).toBe(1200 + 300);
  });

  it('skips removed and sold-out products, naming them', () => {
    const { cart, skipped } = rebuildOrderIntoCart(
      order([
        item({ id: 'a', productId: 'burger', productName: 'Burger' }),
        item({ id: 'b', productId: 'soldout', productName: 'Shawarma' }),
        item({ id: 'c', productId: null, productName: 'Deleted dish' }),
      ]),
      menu,
    );
    expect(cart.lines.map((l) => l.productId)).toEqual(['burger']);
    expect(skipped).toEqual(['Shawarma', 'Deleted dish']);
  });

  it('yields an empty, null-branch cart when nothing survives', () => {
    const { cart } = rebuildOrderIntoCart(order([item({ productId: 'soldout', productName: 'Shawarma' })]), menu);
    expect(cart.lines).toHaveLength(0);
    expect(cart.branchId).toBeNull();
  });

  it('stacks identical rebuilt lines', () => {
    const { cart } = rebuildOrderIntoCart(
      order([item({ id: 'a', productId: 'burger' }), item({ id: 'b', productId: 'burger' })]),
      menu,
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(2);
  });
});

describe('skippedMessage', () => {
  it('is null when nothing skipped', () => {
    expect(skippedMessage([])).toBeNull();
  });
  it('names a single item', () => {
    expect(skippedMessage(['Shawarma'])).toBe('Shawarma is no longer available and was left out.');
  });
  it('counts several', () => {
    expect(skippedMessage(['A', 'B'])).toBe('2 items are no longer available and were left out.');
  });
});
