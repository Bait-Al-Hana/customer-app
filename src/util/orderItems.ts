/**
 * Reading an order's line items safely.
 *
 * `Order.items` is typed optional for a reason worth restating: the array comes
 * from the server, and an app already installed on a phone cannot be updated to
 * match a server two deploys ahead. `.length` on an absent field throws inside
 * render, React unmounts the whole tree, and the customer meets the error
 * boundary — reproduced in Chromium against the real `expo export --platform
 * web` bundle, which is how this app ships to Vercel. It is the same failure
 * `driver.user` caused on the tracking screen.
 *
 * Pure, so the wording is checked without mounting anything.
 */
export function itemCount(items: readonly unknown[] | null | undefined): number {
  return Array.isArray(items) ? items.length : 0;
}

/** "1 item" / "3 items". An order we cannot count reads as "0 items", not as a crash. */
export function itemCountLabel(items: readonly unknown[] | null | undefined): string {
  const n = itemCount(items);
  return `${n} item${n === 1 ? '' : 's'}`;
}
