import {
  promotionApplies,
  promotionHeadline,
  visiblePromotions,
} from '../../src/util/promotion';
import type { Promotion } from '../../src/api/types';

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'p1',
    name: 'Ten off',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    branchIds: [],
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2030-01-01T00:00:00.000Z',
    priority: 0,
    products: [],
    ...overrides,
  };
}

describe('visiblePromotions', () => {
  /**
   * The reading that empties the screen. `branchIds: []` means every branch —
   * treating it as "no branches" hides every company-wide offer, and nobody
   * reports it because the tab just looks quiet.
   */
  it('shows a promotion with no branches at every branch', () => {
    expect(visiblePromotions([promotion()], 'branch-1')).toHaveLength(1);
  });

  it('drops a promotion another branch runs', () => {
    const mine = promotion({ id: 'mine', branchIds: ['branch-1'] });
    const theirs = promotion({ id: 'theirs', branchIds: ['branch-2'] });

    expect(visiblePromotions([mine, theirs], 'branch-1').map((p) => p.id)).toEqual(['mine']);
  });

  it('shows everything when no branch has been chosen yet', () => {
    // An empty Offers tab for a customer who has not started an order is
    // exactly the moment they were browsing for a reason to.
    const list = [promotion({ id: 'a', branchIds: ['branch-2'] }), promotion({ id: 'b' })];
    expect(visiblePromotions(list, null)).toHaveLength(2);
  });

  it('orders by the owner’s priority, lowest first', () => {
    const list = [promotion({ id: 'late', priority: 9 }), promotion({ id: 'first', priority: 1 })];
    expect(visiblePromotions(list, null).map((p) => p.id)).toEqual(['first', 'late']);
  });

  it('survives a backend that sends no promotions at all', () => {
    expect(visiblePromotions(undefined, 'branch-1')).toEqual([]);
  });
});

describe('promotionHeadline', () => {
  const sar = (minor: number): string => `SAR ${(minor / 100).toFixed(2)}`;

  it('names each discount type the way the owner set it up', () => {
    expect(promotionHeadline(promotion(), sar)).toBe('10% off');
    expect(
      promotionHeadline(promotion({ discountType: 'FREE_DELIVERY', discountValue: 0 }), sar),
    ).toBe('Free delivery');
    expect(
      promotionHeadline(promotion({ discountType: 'FIXED_AMOUNT', discountValue: 1500 }), sar),
    ).toBe('SAR 15.00 off');
  });

  it('does not print trailing zeroes the owner never typed', () => {
    expect(promotionHeadline(promotion({ discountValue: 12.5 }), sar)).toBe('12.5% off');
    expect(promotionHeadline(promotion({ discountValue: 20.0 }), sar)).toBe('20% off');
  });
});

describe('promotionApplies', () => {
  it('says the whole order when no products are listed', () => {
    // "0 items", or nothing, would both read as "this applies to nothing".
    expect(promotionApplies(promotion())).toBe('Your whole order');
  });

  it('names the products, and stops naming them before it becomes a list', () => {
    const two = promotion({
      products: [
        { id: '1', name: 'Shawarma' },
        { id: '2', name: 'Falafel' },
      ],
    });
    expect(promotionApplies(two)).toBe('Shawarma and Falafel');

    const many = promotion({
      products: [
        { id: '1', name: 'Shawarma' },
        { id: '2', name: 'Falafel' },
        { id: '3', name: 'Hummus' },
        { id: '4', name: 'Fattoush' },
      ],
    });
    expect(promotionApplies(many)).toBe('Shawarma, Falafel and 2 more');
  });
});
