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

/**
 * What to write beside the discounted row on the bill.
 *
 * Two things can take money off, and only one of them is something the customer
 * did: a coupon they typed, or a standing promotion that applied on its own.
 * The second is the one that has to be named, because there is nothing else on
 * the screen to explain why the total moved — an unexplained saving is queried
 * as often as an unexplained charge.
 *
 * They never both apply; the server charges whichever is worth more. The coupon
 * is checked first anyway, so a backend that predates promotions behaves
 * exactly as it did.
 */
export function discountLabel(
  quote:
    | {
        coupon?: { code: string; name?: string | null } | null;
        promotion?: { name: string } | null;
      }
    | null
    | undefined,
): string | null {
  const fromCoupon = couponLabel(quote?.coupon ?? null);
  if (fromCoupon) {
    return fromCoupon;
  }
  const promotion = quote?.promotion?.name?.trim();
  return promotion ? promotion : null;
}
