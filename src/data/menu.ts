/**
 * Menu-shaping helpers.
 *
 * These turn the real backend `Menu` into the shapes the home rails and cards
 * want (a flat product list, "popular" and "recommended" selections, and the
 * `FoodCardData` a card renders). The selections are deterministic — derived
 * from the menu itself and a stable hash — so the home screen is stable between
 * renders without inventing a backend "popular products" endpoint. Pure and
 * framework-free.
 */

import { FoodCardData } from '../components/cards';
import { defaultVariantPriceMinor, menuPriceMinor } from '../util/menuPrice';
import { Menu, MenuProduct } from '../api/types';
import { ratingCountFor, ratingFor } from './ratings';

export interface FlatProduct {
  product: MenuProduct;
  categoryId: string;
  categoryName: string;
}

/** Every product across every category, tagged with its category. */
export function flattenProducts(menu: Menu | null | undefined): FlatProduct[] {
  if (!menu) {
    return [];
  }
  const out: FlatProduct[] = [];
  for (const c of menu.categories) {
    for (const p of c.products) {
      out.push({ product: p, categoryId: c.id, categoryName: c.name });
    }
  }
  return out;
}

/** Maps a product to the card shape, attaching a stable placeholder rating. */
export function toFoodCard(p: MenuProduct, tag?: string): FoodCardData {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    // Delivery price. The app shows delivery prices only (owner, 2026-09-04)
    // and this is the single place that decision is applied to a card.
    priceMinor: menuPriceMinor(p),
    imageUrl: p.imageUrl,
    rating: ratingFor(p.id),
    ratingCount: ratingCountFor(p.id),
    tag,
    isAvailable: p.isAvailable,
  };
}

/** Small stable hash for ordering. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * "Popular" — one product from each category first (for variety), then filled
 * from the rest, capped at `n`. Deterministic given the menu.
 */
export function popularProducts(menu: Menu | null | undefined, n = 8): FlatProduct[] {
  if (!menu) {
    return [];
  }
  const firsts: FlatProduct[] = [];
  const rest: FlatProduct[] = [];
  for (const c of menu.categories) {
    c.products.forEach((p, i) => {
      const entry = { product: p, categoryId: c.id, categoryName: c.name };
      (i === 0 ? firsts : rest).push(entry);
    });
  }
  return [...firsts, ...rest].slice(0, n);
}

/** "Recommended" — a stable hash-ordered slice, distinct feel from popular. */
export function recommendedProducts(menu: Menu | null | undefined, n = 8): FlatProduct[] {
  const all = flattenProducts(menu);
  return [...all].sort((a, b) => hash(b.product.id) - hash(a.product.id)).slice(0, n);
}

/** The default variant's price, or the base price when there are no variants. */
export function basePriceMinor(p: MenuProduct): number {
  return defaultVariantPriceMinor(p);
}
