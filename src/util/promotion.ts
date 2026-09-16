import type { Promotion } from '../api/types';

/**
 * Which automatic promotions to show, and how to describe one.
 *
 * Pure so the wording and the filtering are testable without a screen — the
 * same reason `coupon.ts` and `menuPrice.ts` are pure.
 *
 * ## The rule that matters
 *
 * A promotion's `branchIds` is **empty when it runs everywhere**, not when it
 * runs nowhere. Reading that the other way round hides every company-wide offer
 * the owner publishes, which is the failure nobody reports — the screen simply
 * looks like there are no deals on.
 */

/**
 * Promotions worth showing this customer.
 *
 * When the branch is known, one that does not run there is dropped: advertising
 * a deal another branch runs is the same failure as showing a code the checkout
 * refuses — a deal the customer could not have had.
 *
 * When the branch is **not** known — nothing in the basket yet, so no branch has
 * been settled on — every promotion is shown. Hiding branch-scoped ones there
 * would empty the Offers tab for a customer who has not started an order, which
 * is exactly when they are browsing for a reason to.
 */
export function visiblePromotions(
  promotions: readonly Promotion[] | undefined,
  branchId: string | null,
): Promotion[] {
  const list = [...(promotions ?? [])];
  const filtered = branchId
    ? list.filter((p) => p.branchIds.length === 0 || p.branchIds.includes(branchId))
    : list;

  // `priority` is the owner's ordering, lowest first — the same order the admin
  // list and the backend's own queries use.
  return filtered.sort((a, b) => a.priority - b.priority);
}

/**
 * What the promotion gives, in the owner's own terms.
 *
 * Deliberately the *headline* only. This app never computes what a discount is
 * worth on a particular basket — the server prices the order and the bill says
 * what came off. A card that guessed would be a second set of numbers to
 * disagree with the one that is charged.
 */
export function promotionHeadline(
  promotion: Pick<Promotion, 'discountType' | 'discountValue'>,
  formatSar: (minor: number) => string,
): string {
  if (promotion.discountType === 'FREE_DELIVERY') {
    return 'Free delivery';
  }
  if (promotion.discountType === 'PERCENTAGE') {
    const value = Number(promotion.discountValue);
    const shown = Number.isFinite(value) ? String(Number(value.toFixed(2))) : '0';
    return `${shown}% off`;
  }
  return `${formatSar(Number(promotion.discountValue) || 0)} off`;
}

/**
 * What a promotion applies to, said plainly.
 *
 * An empty product list means the **whole basket**, and saying "0 items" or
 * nothing at all would both be wrong in the direction that costs the customer
 * an order they thought was discounted.
 */
export function promotionApplies(promotion: Pick<Promotion, 'products'>): string {
  const names = (promotion.products ?? []).map((p) => p.name).filter(Boolean);
  if (names.length === 0) {
    return 'Your whole order';
  }
  if (names.length <= 2) {
    return names.join(' and ');
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
