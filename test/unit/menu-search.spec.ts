import { countProducts, filterMenu } from '../../src/util/menu-search';

const menu = [
  {
    name: 'Grills',
    nameAr: 'مشاوي',
    products: [
      { name: 'Shawarma', nameAr: 'شاورما', description: 'Chicken, garlic sauce' },
      { name: 'Mixed Grill', nameAr: 'مشكل مشاوي', description: null },
    ],
  },
  {
    name: 'Sides',
    nameAr: 'مقبلات',
    products: [{ name: 'Fries', nameAr: 'بطاطس', description: 'Crispy' }],
  },
];

describe('filterMenu', () => {
  it('returns the whole menu for an empty or whitespace query', () => {
    expect(filterMenu(menu, '')).toEqual(menu);
    expect(filterMenu(menu, '   ')).toEqual(menu);
  });

  it('matches a product name, case-insensitively', () => {
    const result = filterMenu(menu, 'SHAWARMA');
    expect(result).toHaveLength(1);
    expect(result[0]?.products.map((p) => p.name)).toEqual(['Shawarma']);
  });

  it('matches the Arabic name, so both languages find the same dish', () => {
    const result = filterMenu(menu, 'شاورما');
    expect(result[0]?.products.map((p) => p.name)).toEqual(['Shawarma']);
  });

  it('matches the description', () => {
    expect(filterMenu(menu, 'garlic')[0]?.products.map((p) => p.name)).toEqual(['Shawarma']);
  });

  it('keeps a whole category when the category name matches', () => {
    const result = filterMenu(menu, 'grills');
    expect(result).toHaveLength(1);
    expect(result[0]?.products).toHaveLength(2);
  });

  it('drops categories left with nothing, rather than showing empty headings', () => {
    const result = filterMenu(menu, 'fries');
    expect(result.map((c) => c.name)).toEqual(['Sides']);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterMenu(menu, 'sushi')).toEqual([]);
  });

  it('does not mutate the menu it was given', () => {
    const before = JSON.stringify(menu);
    filterMenu(menu, 'fries');
    expect(JSON.stringify(menu)).toBe(before);
  });
});

describe('countProducts', () => {
  it('counts across categories', () => {
    expect(countProducts(menu)).toBe(3);
    expect(countProducts(filterMenu(menu, 'shawarma'))).toBe(1);
    expect(countProducts([])).toBe(0);
  });
});
