import { useCallback } from 'react';

import type { Order } from '../api/types';
import { cartFromOrder } from './cart';
import { useCart } from './CartProvider';

export interface ReorderOutcome {
  /** False when nothing on the order can be bought any more. */
  ok: boolean;
  /** Product names dropped because they are no longer on the catalogue. */
  unavailable: string[];
}

/**
 * Rebuilds the cart from a past order.
 *
 * The arithmetic lives in the pure `cartFromOrder`; this only wires it to the
 * cart and reports what the caller needs to tell the customer. Two cases are
 * deliberately surfaced rather than hidden:
 *
 * - **Some lines are gone.** An order snapshots what was sold and its
 *   `productId` is nulled when the product is deleted, so a line can have
 *   nothing to reorder. Those are named, not silently dropped.
 * - **All lines are gone.** The cart is left untouched, so a customer does not
 *   lose what is already in it in exchange for an empty reorder.
 *
 * The cart it produces holds snapshot prices for display only — the checkout
 * prices everything server-side, so a stale price can never be charged.
 */
export function useReorder(): (order: Order) => ReorderOutcome {
  const { dispatch } = useCart();

  return useCallback(
    (order: Order): ReorderOutcome => {
      const { cart, unavailable } = cartFromOrder({
        branchId: order.branchId,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          modifiers: item.modifiers?.map((m) => ({ addonId: m.addonId, addonName: m.addonName })),
        })),
      });

      if (cart.lines.length === 0) {
        return { ok: false, unavailable };
      }

      dispatch({ type: 'REPLACE', cart });
      return { ok: true, unavailable };
    },
    [dispatch],
  );
}
