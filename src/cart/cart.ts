/**
 * Cart state — a pure reducer, no React Native.
 *
 * The cart holds only what the customer wants to buy: product ids, quantities
 * and chosen add-ons, plus a *display* price copied from the menu. It never
 * decides the payable total — that is the backend's job (`/pricing/quote` and
 * order placement). The `estimatedTotalMinor` here is a local preview only, and
 * the checkout always shows the server quote before payment.
 *
 * Being pure, every transition is unit-tested, which is what keeps cart maths
 * from silently drifting.
 */

export interface CartLine {
  /** Stable key for the line: product + sorted addon ids. */
  key: string;
  productId: string;
  productName: string;
  /** Per-unit display price in minor units, from the menu (product + addons). */
  unitPriceMinor: number;
  quantity: number;
  addonIds: string[];
  addonNames: string[];
}

export interface Cart {
  branchId: string | null;
  lines: CartLine[];
}

export const EMPTY_CART: Cart = { branchId: null, lines: [] };

export type CartAction =
  | { type: 'ADD'; branchId: string; line: Omit<CartLine, 'key' | 'quantity'>; quantity?: number }
  | { type: 'SET_QTY'; key: string; quantity: number }
  | { type: 'REMOVE'; key: string }
  /** Replaces the whole cart in one step — used by reorder. */
  | { type: 'REPLACE'; cart: Cart }
  | { type: 'CLEAR' };

/** A stable line key so the same product+addons stacks instead of duplicating. */
export function lineKey(productId: string, addonIds: readonly string[]): string {
  return [productId, ...[...addonIds].sort()].join('|');
}

export function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD': {
      // Adding from a different branch replaces the cart — an order is always
      // for one branch, and mixing would be meaningless.
      const base = state.branchId === action.branchId ? state : { branchId: action.branchId, lines: [] };
      const key = lineKey(action.line.productId, action.line.addonIds);
      const qty = Math.max(1, action.quantity ?? 1);
      const existing = base.lines.find((l) => l.key === key);
      const lines = existing
        ? base.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + qty } : l))
        : [...base.lines, { ...action.line, key, quantity: qty }];
      return { branchId: action.branchId, lines };
    }
    case 'SET_QTY': {
      if (action.quantity <= 0) {
        return removeLine(state, action.key);
      }
      return {
        ...state,
        lines: state.lines.map((l) => (l.key === action.key ? { ...l, quantity: action.quantity } : l)),
      };
    }
    case 'REMOVE':
      return removeLine(state, action.key);
    case 'REPLACE':
      // One step rather than CLEAR + N ADDs: reordering must not leave a
      // half-filled cart on screen if anything interrupts it.
      return action.cart.lines.length > 0 ? action.cart : EMPTY_CART;
    case 'CLEAR':
      return EMPTY_CART;
    default:
      return state;
  }
}

function removeLine(state: Cart, key: string): Cart {
  const lines = state.lines.filter((l) => l.key !== key);
  return { branchId: lines.length > 0 ? state.branchId : null, lines };
}

/** Total item count across all lines — what the cart badge shows. */
export function cartCount(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Local price preview only. The server quote is authoritative at checkout. */
export function estimatedTotalMinor(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);
}

/** The cart as the order/quote API expects it: product ids, quantities, addons. */
export function toOrderItems(cart: Cart): { productId: string; quantity: number; addonIds: string[] }[] {
  return cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, addonIds: l.addonIds }));
}

// --- Reorder ----------------------------------------------------------------

/** The shape of a past order this module needs, kept free of the API types. */
export interface ReorderSource {
  branchId: string;
  items: {
    productId: string | null;
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    modifiers?: { addonId: string | null; addonName: string }[];
  }[];
}

export interface ReorderResult {
  cart: Cart;
  /**
   * Names of lines that could not be carried over because the product (or one
   * of its add-ons) has since been removed from the catalogue. The customer is
   * told which, rather than being handed a quietly smaller cart.
   */
  unavailable: string[];
}

/**
 * Rebuilds a cart from a past order.
 *
 * An order snapshots what was sold and its `productId` is deliberately nulled
 * when the product is deleted — a catalogue change must never rewrite history.
 * So a line can genuinely have nothing to reorder, and the same is true of an
 * add-on. Those lines are dropped and named, never silently substituted, and
 * never guessed at by matching on the snapshotted name.
 *
 * Prices come from the snapshot only as a display estimate; the checkout still
 * prices the cart server-side, so a stale price here can never be charged.
 */
export function cartFromOrder(order: ReorderSource): ReorderResult {
  const lines: CartLine[] = [];
  const unavailable: string[] = [];

  for (const item of order.items) {
    const modifiers = item.modifiers ?? [];
    const lostAddon = modifiers.some((m) => m.addonId === null);

    if (item.productId === null || lostAddon) {
      unavailable.push(item.productName);
      continue;
    }

    const addonIds = modifiers
      .map((m) => m.addonId)
      .filter((id): id is string => id !== null);
    const key = lineKey(item.productId, addonIds);
    const existing = lines.find((l) => l.key === key);

    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }

    lines.push({
      key,
      productId: item.productId,
      productName: item.productName,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      addonIds,
      addonNames: modifiers.map((m) => m.addonName),
    });
  }

  return {
    cart: lines.length > 0 ? { branchId: order.branchId, lines } : EMPTY_CART,
    unavailable,
  };
}
