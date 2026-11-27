import {
  isRtlLang,
  localizedName,
  resolveLang,
  translate,
} from '../../src/i18n/strings';

describe('resolveLang', () => {
  it('maps only an exact "ar" to Arabic; everything else is English', () => {
    expect(resolveLang('ar')).toBe('ar');
    expect(resolveLang('en')).toBe('en');
    expect(resolveLang(null)).toBe('en');
    expect(resolveLang(undefined)).toBe('en');
    expect(resolveLang('AR')).toBe('en'); // not exact — safe LTR default
    expect(resolveLang('fr')).toBe('en');
  });
});

describe('isRtlLang', () => {
  it('is true only for Arabic', () => {
    expect(isRtlLang('ar')).toBe(true);
    expect(isRtlLang('en')).toBe(false);
  });
});

describe('translate', () => {
  it('returns the copy for the chosen language', () => {
    expect(translate('en', 'tab.home')).toBe('Home');
    expect(translate('ar', 'tab.home')).toBe('الرئيسية');
  });

  it('interpolates {token} variables', () => {
    expect(translate('en', 'account.cartItems', { count: 3 })).toBe('You have 3 item(s) in your cart');
    expect(translate('ar', 'product.addToCart', { price: 'SAR 25.00' })).toContain('SAR 25.00');
  });

  it('leaves an unprovided token untouched rather than printing "undefined"', () => {
    // No vars passed for a template that has one.
    expect(translate('en', 'account.cartItems')).toBe('You have {count} item(s) in your cart');
  });

  it('falls back to the key itself for an unknown key (never blank, never a crash)', () => {
    // Cast: deliberately exercising the runtime fallback for a key not in the map.
    expect(translate('en', 'does.not.exist' as never)).toBe('does.not.exist');
  });
});

describe('localizedName', () => {
  it('prefers the Arabic name in Arabic, the English name in English', () => {
    expect(localizedName('ar', 'Chicken', 'دجاج')).toBe('دجاج');
    expect(localizedName('en', 'Chicken', 'دجاج')).toBe('Chicken');
  });

  it('falls back to the other name rather than rendering empty', () => {
    // Arabic chosen but the backend has no Arabic name for this row.
    expect(localizedName('ar', 'Chicken', null)).toBe('Chicken');
    // English chosen but only an Arabic name exists.
    expect(localizedName('en', null, 'دجاج')).toBe('دجاج');
  });

  it('returns an empty string when there is no name at all', () => {
    expect(localizedName('ar', null, null)).toBe('');
    expect(localizedName('en', undefined, undefined)).toBe('');
  });
});
