/**
 * How an applied offer is named on the bill.
 *
 * The backend returns both the code the customer typed and the coupon's own
 * name. A bill that can only quote the code back — "SAVE20 applied" — makes
 * the customer remember which deal that was, on the one screen where they are
 * checking the money. The name is what they chose on the Offers page.
 *
 * The code is still shown beside it, because that is what they will quote if
 * they ring the branch about the discount.
 *
 * Pure so the wording is testable without a screen.
 */
export function couponLabel(
  coupon: { code: string; name?: string | null } | null | undefined,
): string | null {
  if (!coupon) {
    return null;
  }
  const name = coupon.name?.trim();
  const code = coupon.code.trim();
  if (!name) {
    return code || null;
  }
  // A coupon whose name *is* its code says it once, not twice.
  if (!code || name.toUpperCase() === code.toUpperCase()) {
    return name;
  }
  return `${name} · ${code}`;
}
