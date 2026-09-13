/**
 * Deterministic pseudo-ratings — a FRONTEND-ONLY placeholder.
 *
 * The backend does not expose product ratings to the customer app yet. Rather
 * than show an empty gap (which reads as unfinished) or a random value (which
 * flickers between renders), we derive a stable rating from the product id: the
 * same product always shows the same stars. When the backend adds real ratings,
 * replace the single call site — the components already accept a `rating` prop.
 *
 * Pure and framework-free, so it is trivially testable and shareable.
 */

/** A small stable hash of a string → non-negative integer. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable rating in [4.0, 4.9] for a product id. */
export function ratingFor(id: string): number {
  const r = hash(id) % 10; // 0..9
  return Math.round((4.0 + r / 10) * 10) / 10;
}

/** A stable review count in [24, 512] for a product id. */
export function ratingCountFor(id: string): number {
  return 24 + (hash(id + '#c') % 489);
}
