import { ORDER_TYPE, OrderType } from '../types/backend';

/**
 * What a branch will actually accept, and what the customer should be looking
 * at as a result.
 *
 * ## Off means gone, not greyed out
 *
 * An owner who switches pickup off for a branch has decided that branch does
 * not do pickup. A disabled tab still tells the customer the option exists and
 * looks like something broken; a customer who cannot press it has no way to
 * know whether that is the branch's decision or the app failing. So the option
 * is not offered at all, and the screen says which service the branch runs.
 *
 * ## And the chosen type has to follow
 *
 * Hiding the control is not enough on its own: a customer can arrive already on
 * the pickup tab — from a deep link, or because the branch changed after the
 * menu loaded — and would then be left on a choice that placement will refuse.
 * `correctedType` is what moves them.
 *
 * Pure because this is a rule, not a layout: it decides what a branch sells,
 * and it should be checkable without mounting a screen or filling a cart.
 */
export interface BranchFulfilment {
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
}

export interface FulfilmentOptions {
  offersPickup: boolean;
  offersDelivery: boolean;
  /** True when there is a real choice to present. */
  showsChoice: boolean;
  /** True when the branch will take no order at all. */
  closed: boolean;
}

/**
 * `null` means the branch has not loaded yet. Both options are assumed so the
 * tabs do not flicker in and out on a slow connection — the server refuses an
 * unsupported type at placement regardless, so assuming is safe.
 */
export function fulfilmentOptions(branch: BranchFulfilment | null | undefined): FulfilmentOptions {
  const offersPickup = branch ? branch.acceptsPickup : true;
  const offersDelivery = branch ? branch.acceptsDelivery : true;

  return {
    offersPickup,
    offersDelivery,
    showsChoice: offersPickup && offersDelivery,
    closed: !offersPickup && !offersDelivery,
  };
}

/**
 * The order type the customer should be on, or null when the one they are on
 * is fine.
 *
 * Returns null for a branch that has not loaded and for a closed branch: there
 * is nothing better to move them to, and switching them to a type that is also
 * refused would just be a different dead end.
 */
export function correctedType(
  branch: BranchFulfilment | null | undefined,
  current: OrderType,
): OrderType | null {
  if (!branch) {
    return null;
  }

  if (current === ORDER_TYPE.PICKUP && !branch.acceptsPickup && branch.acceptsDelivery) {
    return ORDER_TYPE.DELIVERY;
  }

  if (current === ORDER_TYPE.DELIVERY && !branch.acceptsDelivery && branch.acceptsPickup) {
    return ORDER_TYPE.PICKUP;
  }

  return null;
}
