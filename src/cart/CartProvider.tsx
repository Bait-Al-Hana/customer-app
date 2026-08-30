import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';

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
}

const CartContext = createContext<CartContextValue | null>(null);

/** Holds the cart via the pure reducer, so all cart maths stays testable. */
export function CartProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const count = cartCount(cart);

  // When the cart empties (cleared after an order, or last item removed), drop
  // the coupon and notes too — they belong to that cart, not the next one.
  useEffect(() => {
    if (count === 0) {
      setCouponCode(null);
      setNotes('');
    }
  }, [count]);

  const value = useMemo<CartContextValue>(
    () => ({ cart, count, dispatch, couponCode, setCouponCode, notes, setNotes }),
    [cart, count, couponCode, notes],
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
