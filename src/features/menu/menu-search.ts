/**
 * Menu search + category listing — pure, no React Native.
 *
 * The menu can be long, so a customer filters it as they type. A query matches
 * a product on its English name, its Arabic name, or its description; and when
 * the query names a *category* (e.g. "drinks"), that whole section stays so a
 * customer can browse it rather than seeing it emptied to nothing.
 *
 * Being pure, the matching is unit-tested — which matters because "why did my
 * search hide everything" is invisible to a typecheck and only shows when a
 * person types into the box.
 */

import { MenuCategory } from '../../api/types';

/** Lower-cased, trimmed, whitespace-collapsed — the one normalisation both sides use. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function haystack(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Whether a category's own name/Arabic name contains the query. */
export function categoryMatches(category: MenuCategory, q: string): boolean {
  return haystack(category.name, category.nameAr).includes(q);
}

/** Whether a product matches: English name, Arabic name, or description. */
export function productMatches(
  product: { name: string; nameAr: string | null; description: string | null },
  q: string,
): boolean {
  return haystack(product.name, product.nameAr, product.description).includes(q);
}

/**
 * Filters the menu to what matches `query`.
 *
 * An empty query returns the menu unchanged. A category whose name matches is
 * kept in full; otherwise only its matching products survive, and a category
 * left with none is dropped. The input is never mutated.
 */
export function filterMenu(categories: readonly MenuCategory[], query: string): MenuCategory[] {
  const q = normalizeQuery(query);
  if (q.length === 0) {
    return [...categories];
  }
  const result: MenuCategory[] = [];
  for (const category of categories) {
    if (categoryMatches(category, q)) {
      result.push(category);
      continue;
    }
    const products = category.products.filter((p) => productMatches(p, q));
    if (products.length > 0) {
      result.push({ ...category, products });
    }
  }
  return result;
}

/** True when a non-empty query produced no categories at all. */
export function isNoMatch(filtered: readonly MenuCategory[], query: string): boolean {
  return normalizeQuery(query).length > 0 && filtered.length === 0;
}
