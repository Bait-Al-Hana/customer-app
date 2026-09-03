/**
 * Menu filtering — pure, no React Native, so it is unit-tested.
 *
 * Matches the query against a product's English *and* Arabic name and its
 * description, so a customer searching "شاورما" finds the same dish as one
 * searching "shawarma". Categories left with no matching product are dropped
 * rather than rendered as empty headings.
 */

interface SearchableProduct {
  name: string;
  nameAr?: string | null;
  description?: string | null;
}

interface SearchableCategory<P extends SearchableProduct> {
  name: string;
  nameAr?: string | null;
  products: P[];
}

/** True when the product matches an already-normalised query. */
function matches(product: SearchableProduct, needle: string): boolean {
  return [product.name, product.nameAr ?? '', product.description ?? ''].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

/**
 * Filters a menu by a free-text query.
 *
 * An empty or whitespace-only query returns the menu untouched — searching for
 * nothing shows everything, rather than nothing. A category whose own name
 * matches keeps all of its products, so searching a category name browses it.
 */
export function filterMenu<P extends SearchableProduct, C extends SearchableCategory<P>>(
  categories: C[],
  query: string,
): C[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return categories;
  }

  return categories
    .map((category) => {
      const categoryMatches = [category.name, category.nameAr ?? ''].some((field) =>
        field.toLowerCase().includes(needle),
      );
      if (categoryMatches) {
        return category;
      }
      return { ...category, products: category.products.filter((p) => matches(p, needle)) };
    })
    .filter((category) => category.products.length > 0);
}

/** How many products a filtered menu is showing — for the "N results" line. */
export function countProducts<P, C extends { products: P[] }>(categories: C[]): number {
  return categories.reduce((total, category) => total + category.products.length, 0);
}
