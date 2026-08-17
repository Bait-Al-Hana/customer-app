/**
 * Marketing/content mock data — a FRONTEND-ONLY placeholder.
 *
 * Promo banners, offers, popular searches and reward tiers are marketing content
 * the backend does not serve to the customer app yet. They live here as typed,
 * self-contained data so the screens are fully designed and demoable now, and so
 * a future `GET /content/*` (or a CMS) can replace this module wholesale without
 * any screen changing. Nothing here is a business rule or a price the app
 * computes — it is copy and presentation only.
 */

import { PromoBannerData } from '../components/cards';

// Brand colour pairs for gradient surfaces, sampled from the logo palette.
const MAGENTA_PAIR: [string, string] = ['#E5178B', '#B01271'];
const ORANGE_PAIR: [string, string] = ['#F79A3C', '#F4701F'];
const BLUE_PAIR: [string, string] = ['#3D78C0', '#2E63A6'];
const PLUM_PAIR: [string, string] = ['#7A2E8C', '#B01271'];

export const PROMO_BANNERS: PromoBannerData[] = [
  {
    id: 'promo-welcome',
    badge: 'New here?',
    title: '20% off your first order',
    subtitle: 'Use code HANA20 at checkout',
    colors: MAGENTA_PAIR,
    glyph: '🌯',
  },
  {
    id: 'promo-delivery',
    badge: 'This week',
    title: 'Free delivery over SAR 50',
    subtitle: 'On every branch, all day',
    colors: ORANGE_PAIR,
    glyph: '🛵',
  },
  {
    id: 'promo-combo',
    badge: 'Family time',
    title: 'Family combo deals',
    subtitle: 'Feed four from SAR 89',
    colors: BLUE_PAIR,
    glyph: '🍗',
  },
];

export type OfferKind = 'percentage' | 'free_delivery' | 'bogo' | 'combo';

export interface Offer {
  id: string;
  kind: OfferKind;
  title: string;
  description: string;
  code: string;
  /** ISO date the offer expires. */
  expires: string;
  colors: [string, string];
  glyph: string;
}

export const OFFERS: Offer[] = [
  {
    id: 'offer-hana20',
    kind: 'percentage',
    title: '20% OFF',
    description: 'Get 20% off your first order, up to SAR 30.',
    code: 'HANA20',
    expires: '2026-12-31',
    colors: MAGENTA_PAIR,
    glyph: '🎉',
  },
  {
    id: 'offer-freedel',
    kind: 'free_delivery',
    title: 'FREE DELIVERY',
    description: 'No delivery fee on orders over SAR 50.',
    code: 'FREESHIP',
    expires: '2026-09-30',
    colors: ORANGE_PAIR,
    glyph: '🛵',
  },
  {
    id: 'offer-bogo',
    kind: 'bogo',
    title: 'BUY 1 GET 1',
    description: 'Buy any shawarma wrap, get one free.',
    code: 'WRAP2',
    expires: '2026-08-31',
    colors: PLUM_PAIR,
    glyph: '🌯',
  },
  {
    id: 'offer-combo',
    kind: 'combo',
    title: 'SPECIAL COMBO',
    description: 'Burger + fries + drink for SAR 29.',
    code: 'COMBO29',
    expires: '2026-10-15',
    colors: BLUE_PAIR,
    glyph: '🍔',
  },
];

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

/** Human date label like "Expires 31 Dec". */
export function expiryLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Expires ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}
