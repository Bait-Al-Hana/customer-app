import { defaultVariantPriceMinor, menuPriceMinor } from '../../src/util/menuPrice';

describe('menuPriceMinor', () => {
  it('shows the delivery price when the backend sends one', () => {
    expect(menuPriceMinor({ priceMinor: 3250, deliveryPriceMinor: 3510 })).toBe(3510);
  });

  it('falls back to the pickup price on a backend that predates the uplift', () => {
    // With the uplift at 0% the two are equal anyway, which is what makes
    // shipping this before the owner sets a percentage safe.
    expect(menuPriceMinor({ priceMinor: 3250 })).toBe(3250);
    expect(menuPriceMinor({ priceMinor: 3250, deliveryPriceMinor: null })).toBe(3250);
  });

  it('ignores a delivery price that is not a price', () => {
    expect(menuPriceMinor({ priceMinor: 3250, deliveryPriceMinor: NaN })).toBe(3250);
    expect(menuPriceMinor({ priceMinor: 3250, deliveryPriceMinor: 0 })).toBe(3250);
  });
});

describe('defaultVariantPriceMinor', () => {
  it('uses the default variant’s delivery price', () => {
    expect(
      defaultVariantPriceMinor({
        priceMinor: 1000,
        variants: [
          { priceMinor: 2000, deliveryPriceMinor: 2160, isDefault: false },
          { priceMinor: 3000, deliveryPriceMinor: 3240, isDefault: true },
        ],
      }),
    ).toBe(3240);
  });

  it('falls back to the first variant when none is marked default', () => {
    expect(
      defaultVariantPriceMinor({
        priceMinor: 1000,
        variants: [{ priceMinor: 2000, deliveryPriceMinor: 2160, isDefault: false }],
      }),
    ).toBe(2160);
  });

  it('uses the product’s own price when it has no variants', () => {
    expect(defaultVariantPriceMinor({ priceMinor: 3250, deliveryPriceMinor: 3510 })).toBe(3510);
    expect(defaultVariantPriceMinor({ priceMinor: 3250, variants: [] })).toBe(3250);
  });

  it('prices a variant by the same rule as a plain product', () => {
    // The bug this guards: one price on the list, another on the item, because
    // two code paths each decided which field to read.
    const noDeliveryPrice = { priceMinor: 2000, isDefault: true };

    expect(defaultVariantPriceMinor({ priceMinor: 1000, variants: [noDeliveryPrice] })).toBe(
      menuPriceMinor(noDeliveryPrice),
    );
  });
});
