/**
 * Offer presentation — pure, no React Native.
 *
 * Turns an {@link Offer} (the owner's published coupon) into the two strings a
 * card shows: the headline saving and the condition to earn it. The code the
 * customer taps is the very code the checkout honours, so nothing here computes
 * a discount — it only *describes* the terms the server already set. Being
 * pure, the wording is unit-tested in both the percentage and fixed cases.
 */

import { Offer } from '../../api/types';
import { formatSar } from '../../util/money';

/** The saving, e.g. "20% off", "SAR 15.00 off", "Free delivery". */
export function offerHeadline(offer: Offer): string {
  switch (offer.discountType) {
    case 'PERCENTAGE':
      return `${offer.discountValue}% off`;
    case 'FIXED_AMOUNT':
      return `${formatSar(offer.discountValue)} off`;
    case 'FREE_DELIVERY':
      return 'Free delivery';
    default:
      return offer.name;
  }
}

/**
 * The condition, when there is one, e.g. "on orders over SAR 50.00" — stated on
 * the card so a customer learns it here rather than when the checkout refuses
 * the code. Returns null when the offer sets no minimum.
 */
export function offerCondition(offer: Offer): string | null {
  if (typeof offer.minSpendMinor === 'number' && offer.minSpendMinor > 0) {
    return `on orders over ${formatSar(offer.minSpendMinor)}`;
  }
  return null;
}
