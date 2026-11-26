import { categoryMatches, filterMenu, isNoMatch, normalizeQuery, productMatches } from '../../src/features/menu/menu-search';
import { MenuCategory, MenuProduct } from '../../src/api/types';

function product(over: Partial<MenuProduct>): MenuProduct {
  return {
    id: 'p',
    name: 'Item',
    nameAr: null,
    description: null,
    imageUrl: null,
    priceMinor: 1000,
    deliveryPriceMinor: 1000,
    taxClass: 'STANDARD',
    isAvailable: true,
    unavailableUntil: null,
    variants: [],
    modifierGroups: [],
    ...over,
  };
}

function category(over: Partial<MenuCategory>): MenuCategory {
  return { id: 'c', name: 'Category', nameAr: null, imageUrl: null, products: [], ...over };
}

const menu: MenuCategory[] = [
  category({
    id: 'c-drinks',
    name: 'Drinks',
    products: [product({ id: 'cola', name: 'Cola' }), product({ id: 'water', name: 'Water' })],
  }),
  category({
    id: 'c-mains',
    name: 'Main Dishes',
    products: [
      product({ id: 'burger', name: 'Beef Burger', description: 'With cheddar' }),
      product({ id: 'shawarma', name: 'Shawarma', nameAr: 'شاورما' }),
    ],
  }),
];

describe('normalizeQuery', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeQuery('  Beef   Burger ')).toBe('beef burger');
  });
});

describe('productMatches', () => {
  it('matches on name, Arabic name and description', () => {
    expect(productMatches({ name: 'Beef Burger', nameAr: null, description: 'cheddar' }, 'cheddar')).toBe(true);
    expect(productMatches({ name: 'Shawarma', nameAr: 'شاورما', description: null }, 'شاورما')).toBe(true);
    expect(productMatches({ name: 'Cola', nameAr: null, description: null }, 'water')).toBe(false);
  });
});

describe('filterMenu', () => {
  it('returns everything for an empty query', () => {
    expect(filterMenu(menu, '   ')).toHaveLength(2);
  });

  it('keeps a whole category when the category name matches', () => {
    const r = filterMenu(menu, 'drinks');
    expect(r).toHaveLength(1);
    expect(r[0]?.products).toHaveLength(2);
    expect(categoryMatches(menu[0] as MenuCategory, 'drinks')).toBe(true);
  });

  it('keeps only matching products when the category name does not match', () => {
    const r = filterMenu(menu, 'burger');
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe('c-mains');
    expect(r[0]?.products.map((p) => p.id)).toEqual(['burger']);
  });

  it('drops categories left with no products and never mutates the input', () => {
    const snapshot = JSON.stringify(menu);
    const r = filterMenu(menu, 'cola');
    expect(r.map((c) => c.id)).toEqual(['c-drinks']);
    expect(r[0]?.products).toHaveLength(1);
    expect(JSON.stringify(menu)).toBe(snapshot);
  });

  it('isNoMatch only for a non-empty query with no results', () => {
    expect(isNoMatch(filterMenu(menu, 'zzz'), 'zzz')).toBe(true);
    expect(isNoMatch(filterMenu(menu, ''), '')).toBe(false);
    expect(isNoMatch(filterMenu(menu, 'cola'), 'cola')).toBe(false);
  });
});
