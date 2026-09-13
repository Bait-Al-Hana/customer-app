/**
 * Frontend-only presentation content.
 *
 * What is left here is copy with no owner behind it: search suggestions and the
 * category chips shown before a menu has loaded.
 *
 * **The promo banners and the offers that used to live here are gone.** They
 * were invented marketing with invented coupon codes, so every code a customer
 * tapped was refused at checkout — worse than having no offers at all. Banners
 * now come from the admin panel (`/customer/config`) and offers are the owner's
 * own published coupons, code and artwork included. Nothing in this file is a
 * business rule or a price.
 */

/** Popular search terms shown on an empty search screen. */
export const POPULAR_SEARCHES: string[] = [
  'Shawarma',
  'Burger',
  'Broasted chicken',
  'Fries',
  'Family combo',
  'Fresh juice',
  'Kabsa',
  'Desserts',
];

/** Fallback category chips shown before a branch menu is loaded. */
export const FALLBACK_CATEGORIES: { id: string; name: string; glyph: string }[] = [
  { id: 'c-burgers', name: 'Burgers', glyph: '🍔' },
  { id: 'c-chicken', name: 'Chicken', glyph: '🍗' },
  { id: 'c-shawarma', name: 'Shawarma', glyph: '🌯' },
  { id: 'c-fries', name: 'Fries', glyph: '🍟' },
  { id: 'c-seafood', name: 'Seafood', glyph: '🦐' },
  { id: 'c-drinks', name: 'Drinks', glyph: '🥤' },
  { id: 'c-desserts', name: 'Desserts', glyph: '🍰' },
];
