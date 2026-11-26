/**
 * Reorder — rebuild a cart from a past order, priced against *today's* menu.
 *
 * Pure, no React Native. A past order is a snapshot of what things cost then;
 * reordering must not trust that snapshot — prices change and items get removed
 * or sold out. So this re-resolves every line against the current branch menu:
 *
 *  - a product no longer on the menu, or marked unavailable, is **skipped** and
 *    named back to the customer (it would fail at checkout otherwise);
 *  - surviving lines take the *current* price and the *current* add-on prices,
 *    dropping any add-on the catalog no longer has;
 *  - the server re-checks price and availability again at placement — this is a
 *    convenience, never the authority.
 *
 * The result is a ready-to-dispatch cart plus the list of skipped item names.
 */

import { Menu, Order } from '../../api/types';
import { Cart, CartLine, lineKey } from '../../cart/cart';

export interface ReorderResult {
  cart: Cart;
  /** Names of items that could not be re-added (removed from the menu or sold out). */
  skipped: string[];
}

interface MenuProductLite {
  id: string;
  name: string;
  priceMinor: number;
  isAvailable: boolean;
  addons: Map<string, { name: string; priceMinor: number }>;
}

function indexMenu(menu: Menu): Map<string, MenuProductLite> {
  const index = new Map<string, MenuProductLite>();
  for (const category of menu.categories) {
    for (const product of category.products) {
      const addons = new Map<string, { name: string; priceMinor: number }>();
      for (const group of product.modifierGroups) {
        for (const addon of group.addons) {
          addons.set(addon.id, { name: addon.name, priceMinor: addon.priceMinor });
        }
      }
      index.set(product.id, {
        id: product.id,
        name: product.name,
        priceMinor: product.priceMinor,
        isAvailable: product.isAvailable,
        addons,
      });
    }
  }
  return index;
}

/** Rebuild `order`'s items into a cart against `menu`. Never mutates either. */
export function rebuildOrderIntoCart(order: Order, menu: Menu): ReorderResult {
  const index = indexMenu(menu);
  const skipped: string[] = [];
  const byKey = new Map<string, CartLine>();

  for (const item of order.items) {
    const product = item.productId ? index.get(item.productId) : undefined;
    if (!product || !product.isAvailable) {
      skipped.push(item.productName);
      continue;
    }

    // Keep only add-ons the catalog still has; price them at today's price.
    const addonIds: string[] = [];
    const addonNames: string[] = [];
    let addonsMinor = 0;
    for (const modifier of item.modifiers ?? []) {
      const addon = modifier.addonId ? product.addons.get(modifier.addonId) : undefined;
      if (!addon) {
        continue;
      }
      addonIds.push(modifier.addonId as string);
      addonNames.push(addon.name);
      addonsMinor += addon.priceMinor;
    }

    const key = lineKey(product.id, addonIds);
    const quantity = Math.max(1, item.quantity);
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }
    byKey.set(key, {
      key,
      productId: product.id,
      productName: product.name,
      unitPriceMinor: product.priceMinor + addonsMinor,
      quantity,
      addonIds,
      addonNames,
    });
  }

  const lines = [...byKey.values()];
  return {
    cart: { branchId: lines.length > 0 ? order.branchId : null, lines, couponCode: null },
    skipped,
  };
}

/** A one-line, customer-facing summary of what was skipped, or null if nothing was. */
export function skippedMessage(skipped: readonly string[]): string | null {
  if (skipped.length === 0) {
    return null;
  }
  if (skipped.length === 1) {
    return `${skipped[0]} is no longer available and was left out.`;
  }
  return `${skipped.length} items are no longer available and were left out.`;
}
