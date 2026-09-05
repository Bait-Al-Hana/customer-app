/**
 * Whether this device can actually offer Apple Pay.
 *
 * ## Why this is not `Platform.OS === 'ios'`
 *
 * That was the first attempt and it was wrong in the one place it mattered.
 * This app ships as a **web build** as well as a native one, and on the web
 * `Platform.OS` is `'web'` — on an iPhone, in Safari, with Apple Pay set up and
 * working. So the check hid Apple Pay from precisely the devices that support
 * it, and showed it on none.
 *
 * The honest question is not "what OS is this" but "can this browser or device
 * present an Apple Pay sheet":
 *
 * - **Native iOS** — yes, the platform is the answer.
 * - **Web** — Safari on iOS and macOS exposes `window.ApplePaySession`, and no
 *   other browser does. Chrome on iOS is iOS and cannot pay, so a platform
 *   check would have been wrong there too, in the other direction.
 *
 * Pure, and takes both facts as arguments, so the rule is testable without a
 * device, a browser or a card.
 */
export function supportsApplePay(env: {
  /** `Platform.OS`. */
  os: string;
  /** `window.ApplePaySession`, or undefined off the web / outside Safari. */
  applePaySession?: { canMakePayments?: () => boolean } | undefined;
}): boolean {
  if (env.os === 'ios') {
    return true;
  }
  if (env.os !== 'web' || !env.applePaySession) {
    return false;
  }
  // `canMakePayments` throws in an insecure context and on some embedded web
  // views. A method we cannot ask about is one we do not offer — better a
  // missing option than one that dead-ends at the last press.
  try {
    return env.applePaySession.canMakePayments?.() === true;
  } catch {
    return false;
  }
}

/** Reads the browser global, where there is one. Kept out of the pure rule. */
export function applePaySessionGlobal():
  | { canMakePayments?: () => boolean }
  | undefined {
  return (globalThis as { ApplePaySession?: { canMakePayments?: () => boolean } })
    .ApplePaySession;
}
