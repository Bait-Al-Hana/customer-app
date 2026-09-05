import { formatMinor, formatSar, formatVatRate } from '../../src/util/money';

describe('money', () => {
  it('formats minor units as two-decimal major', () => {
    expect(formatMinor(3250)).toBe('32.50');
    expect(formatMinor(5)).toBe('0.05');
    expect(formatMinor(100)).toBe('1.00');
    expect(formatMinor(0)).toBe('0.00');
    expect(formatMinor(199999)).toBe('1999.99');
  });

  it('handles negative amounts (e.g. discounts)', () => {
    expect(formatMinor(-250)).toBe('-2.50');
  });

  it('prefixes SAR', () => {
    expect(formatSar(3250)).toBe('SAR 32.50');
  });
});

describe('formatVatRate', () => {
  it('turns the backend decimal fraction into a percentage', () => {
    // The bug this exists for: checkout printed `${quote.vatRate}%`, so the
    // line that tells a customer how much of their money is tax read
    // "VAT at 0.15%".
    expect(formatVatRate('0.15')).toBe('15%');
    expect(formatVatRate(0.15)).toBe('15%');
  });

  it('keeps a fractional rate and drops trailing zeros', () => {
    expect(formatVatRate('0.055')).toBe('5.5%');
    expect(formatVatRate('0.05')).toBe('5%');
    expect(formatVatRate('0')).toBe('0%');
  });

  it('says nothing rather than NaN when there is no usable rate', () => {
    // An older backend, or a field that did not come back: the caller drops
    // the clause. "VAT at NaN%" is worse than not mentioning the rate.
    expect(formatVatRate(undefined)).toBeNull();
    expect(formatVatRate(null)).toBeNull();
    expect(formatVatRate('')).toBeNull();
    expect(formatVatRate('fifteen')).toBeNull();
    // Not a fraction, so not a rate we know how to read. "1500%" on the line
    // that tells a customer how much of their money is tax is worse than no
    // rate at all.
    expect(formatVatRate('15')).toBeNull();
  });
});
