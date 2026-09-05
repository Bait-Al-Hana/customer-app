import { couponLabel } from '../../src/util/coupon';

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
