import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';

import { newIdempotencyKey } from '../util/idempotency';
import { Cart, CartAction, cartCount, cartReducer, EMPTY_CART } from './cart';

interface CartContextValue {
  cart: Cart;
  count: number;
  dispatch: React.Dispatch<CartAction>;
  /**
   * A coupon the customer has applied in the UI. This is a display convenience
   * only — it is passed to the backend at order placement, which is the sole
   * authority on whether the coupon is valid and what it is worth. The app never
   * computes the discount itself.
   */
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  /** Free-text notes for the kitchen/driver, forwarded to the backend at placement. */
  notes: string;
  setNotes: (notes: string) => void;
  /**
   * The `Idempotency-Key` for placing *this* cart. Deliberately one key per
   * cart, not one per request: a placement that times out and is retried must
   * carry the same key so the backend replays the order it already made
   * instead of cooking a second one. A fresh key per attempt would defeat the
   * mechanism entirely. It resets when the cart empties, so the next order is
   * a genuinely new one.
   */
  idempotencyKey: string;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Holds the cart via the pure reducer, so all cart maths stays testable. */
export function CartProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const count = cartCount(cart);

  // When the cart empties (cleared after an order, or last item removed), drop
  // the coupon and notes too — they belong to that cart, not the next one.
  useEffect(() => {
    if (count === 0) {
      setCouponCode(null);
      setNotes('');
      setIdempotencyKey(newIdempotencyKey());
    }
  }, [count]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count,
      dispatch,
      couponCode,
      setCouponCode,
      notes,
      setNotes,
      idempotencyKey,
    }),
    [cart, count, couponCode, notes, idempotencyKey],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
