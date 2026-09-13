import { couponLabel, discountLabel } from '../../src/util/coupon';

describe('couponLabel', () => {
  it('names the offer and keeps the code beside it', () => {
    expect(couponLabel({ code: 'SAVE20', name: 'Twenty off' })).toBe('Twenty off · SAVE20');
  });

  it('falls back to the code on a backend that sends no name', () => {
    expect(couponLabel({ code: 'SAVE20' })).toBe('SAVE20');
    expect(couponLabel({ code: 'SAVE20', name: '   ' })).toBe('SAVE20');
  });

  it('does not say the same thing twice', () => {
    expect(couponLabel({ code: 'SAVE20', name: 'save20' })).toBe('save20');
  });

  it('says nothing when no coupon applied', () => {
    expect(couponLabel(null)).toBeNull();
    expect(couponLabel(undefined)).toBeNull();
  });
});

describe('discountLabel', () => {
  it('prefers the coupon the customer typed', () => {
    expect(
      discountLabel({
        coupon: { code: 'HANA20', name: 'Twenty off' },
        promotion: { name: 'Weekend deal' },
      }),
    ).toBe('Twenty off · HANA20');
  });

  /**
   * The case this function exists for. Nobody typed anything, so without the
   * promotion's name there is nothing on the bill to explain why the total is
   * lower than the menu suggested — and an unexplained saving is queried as
   * often as an unexplained charge.
   */
  it('names the automatic promotion when no coupon applied', () => {
    expect(discountLabel({ coupon: null, promotion: { name: 'Weekend deal' } })).toBe(
      'Weekend deal',
    );
  });

  it('is null when nothing discounted the order', () => {
    expect(discountLabel({ coupon: null, promotion: null })).toBeNull();
    expect(discountLabel(null)).toBeNull();
    // A backend that predates promotions sends neither field.
    expect(discountLabel({})).toBeNull();
  });
});
