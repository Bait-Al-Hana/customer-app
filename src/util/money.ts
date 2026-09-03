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
 * Formats a snapshotted VAT rate for a receipt line, e.g. "0.1500" → " (15%)".
 *
 * The rate is read off the order rather than from a constant here: a historic
 * order must keep showing the rate it was actually charged, even after the
 * rate changes. Returns an empty string when the order carries no rate, so the
 * line degrades to a plain "VAT" instead of showing a wrong number.
 */
export function vatLabel(vatRate: string | undefined): string {
  if (!vatRate) {
    return '';
  }
  const rate = Number(vatRate);
  if (!Number.isFinite(rate)) {
    return '';
  }
  return ` (${Number((rate * 100).toFixed(2))}%)`;
}
