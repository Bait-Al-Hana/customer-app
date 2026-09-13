/**
 * Money formatting — pure, no React Native.
 *
 * All money in the platform is integer minor units (halalas) with SAR currency,
 * matching the backend. The app never computes a payable amount; it only
 * *formats* amounts the server already decided. These helpers are the one place
 * that turns minor units into display text, so the format is consistent
 * everywhere and testable.
 */

/** Formats minor units as a decimal string, e.g. 3250 → "32.50". No currency word. */
export function formatMinor(amountMinor: number): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(Math.trunc(amountMinor));
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const body = `${major}.${minor.toString().padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}

/** Formats minor units with the SAR currency label, e.g. 3250 → "SAR 32.50". */
export function formatSar(amountMinor: number): string {
  return `SAR ${formatMinor(amountMinor)}`;
}

/**
 * Formats a VAT rate for display, e.g. "0.15" → "15%".
 *
 * The backend sends the rate as a **decimal fraction** ("0.15"), the way it is
 * stored and snapshotted onto every order line. Checkout rendered it straight
 * into `${rate}%`, so the one screen that tells a customer how much of their
 * money is tax said **"Includes SAR 6.52 VAT at 0.15%"** — a figure that is
 * both wrong and, to anyone who checks it, evidence the total cannot be
 * trusted either.
 *
 * Trailing zeros go: 0.15 → "15%", not "15.00%". A rate we cannot parse
 * returns null, so the caller drops the clause rather than printing "NaN%".
 */
export function formatVatRate(rate: string | number | null | undefined): string | null {
  if (rate === null || rate === undefined || rate === '') {
    return null;
  }
  const fraction = typeof rate === 'number' ? rate : Number(rate);
  // A fraction, always: the backend stores and sends the rate the way it
  // snapshots it onto every order line. Anything above 1 is not a rate we know
  // how to read — "1500%" would be worse than saying nothing — so the caller
  // drops the clause instead of guessing that it meant percent.
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    return null;
  }
  // Two decimal places is enough for any rate a tax authority sets, and
  // `parseFloat` drops the zeros a fixed format would leave behind.
  return `${parseFloat((fraction * 100).toFixed(2))}%`;
}
