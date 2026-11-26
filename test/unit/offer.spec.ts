import { offerCondition, offerHeadline } from '../../src/features/offers/offer';
import { Offer } from '../../src/api/types';

const base: Offer = {
  id: 'o1',
  code: 'SAVE20',
  name: 'Twenty off',
  discountType: 'PERCENTAGE',
  discountValue: 20,
  validUntil: '2030-01-01T00:00:00.000Z',
};

describe('offerHeadline', () => {
  it('describes a percentage offer', () => {
    expect(offerHeadline({ ...base, discountType: 'PERCENTAGE', discountValue: 20 })).toBe('20% off');
  });

  it('describes a fixed-amount offer from minor units', () => {
    expect(offerHeadline({ ...base, discountType: 'FIXED_AMOUNT', discountValue: 1500 })).toBe('SAR 15.00 off');
  });

  it('describes a free-delivery offer', () => {
    expect(offerHeadline({ ...base, discountType: 'FREE_DELIVERY' })).toBe('Free delivery');
  });
});

describe('offerCondition', () => {
  it('states a minimum spend when one is set', () => {
    expect(offerCondition({ ...base, minSpendMinor: 5000 })).toBe('on orders over SAR 50.00');
  });

  it('is null when there is no minimum', () => {
    expect(offerCondition(base)).toBeNull();
    expect(offerCondition({ ...base, minSpendMinor: 0 })).toBeNull();
  });
});
