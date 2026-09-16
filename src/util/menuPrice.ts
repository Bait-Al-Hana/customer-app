/**
 * Which price the menu shows.
 *
 * ## Delivery, always
 *
 * The owner's decision (2026-09-04): the app shows **delivery prices only**.
 * Pickup is priced lower — the branch's delivery uplift is not applied to it —
 * but showing two prices per dish makes a menu into a table, and a customer
 * choosing what to eat is not yet choosing how to collect it.
 *
 * The consequence is deliberate and worth knowing: a customer who switches to
 * pickup at checkout sees the total go **down**. That direction is the safe
 * one. The reverse — browsing at pickup prices and being charged delivery
 * prices — is the one that gets disputed at the door, and it is the reason
 * this function does not try to be clever about order type.
 *
 * `deliveryPriceMinor` is absent on a backend that predates the uplift, so the
 * pickup price stands in. With the uplift at 0% the two are equal anyway,
 * which is what makes this safe to ship before the owner sets one.
 */
export interface PricedLikeAMenuItem {
  priceMinor: number;
  deliveryPriceMinor?: number | null;
}

export function menuPriceMinor(item: PricedLikeAMenuItem): number {
  const delivery = item.deliveryPriceMinor;

  return typeof delivery === 'number' && Number.isFinite(delivery) && delivery > 0
    ? delivery
    : item.priceMinor;
}

/**
 * The price of the variant a customer lands on by default, or the item's own
 * price when it has no variants.
 *
 * Kept next to `menuPriceMinor` so a variant and a plain product cannot end up
 * being priced by two different rules — the bug that shows one price on the
 * list and another on the item.
 */
export function defaultVariantPriceMinor(item: {
  priceMinor: number;
  deliveryPriceMinor?: number | null;
  variants?: readonly (PricedLikeAMenuItem & { isDefault: boolean })[];
}): number {
  const variants = item.variants ?? [];
  const chosen = variants.find((v) => v.isDefault) ?? variants[0];

  return chosen ? menuPriceMinor(chosen) : menuPriceMinor(item);
}
