import { supportsApplePay } from '../../src/util/applePay';

const canPay = { canMakePayments: () => true };
const cannotPay = { canMakePayments: () => false };

describe('supportsApplePay', () => {
  it('offers it on a native iOS build', () => {
    expect(supportsApplePay({ os: 'ios' })).toBe(true);
  });

  it('offers it in Safari on the web build', () => {
    // The bug this exists for: this app ships as a web build too, and
    // `Platform.OS` there is 'web' — on an iPhone, in Safari, with Apple Pay
    // working. A platform check hid it from exactly the devices that have it.
    expect(supportsApplePay({ os: 'web', applePaySession: canPay })).toBe(true);
  });

  it('hides it in a browser that has no Apple Pay', () => {
    // Chrome on iOS is iOS and still cannot pay, so the platform was never the
    // right question in either direction.
    expect(supportsApplePay({ os: 'web', applePaySession: undefined })).toBe(false);
    expect(supportsApplePay({ os: 'web', applePaySession: cannotPay })).toBe(false);
  });

  it('hides it on Android', () => {
    expect(supportsApplePay({ os: 'android' })).toBe(false);
    expect(supportsApplePay({ os: 'android', applePaySession: canPay })).toBe(false);
  });

  it('hides it rather than crashing when the browser refuses to answer', () => {
    // `canMakePayments` throws in an insecure context and in some embedded web
    // views. A missing option beats one that dead-ends at the last press.
    const throws = {
      canMakePayments: () => {
        throw new Error('SecurityError');
      },
    };
    expect(supportsApplePay({ os: 'web', applePaySession: throws })).toBe(false);
  });
});
