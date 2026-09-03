/**
 * API response shapes, mirrored from the backend. Kept in one place and in sync
 * with the backend controllers the app calls.
 */

import { OrderStatus, OrderType, PaymentStatus } from '../types/backend';

export interface Branch {
  id: string;
  name: string;
  nameAr: string | null;
  addressLine: string;
  district: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  isAcceptingOrders: boolean;
  acceptsCashOnDelivery: boolean;
  deliveryFeeMinor: number;
  minOrderMinor: number;
  prepTimeMinutes: number | null;
}

export interface MenuAddon {
  id: string;
  name: string;
  nameAr: string | null;
  priceMinor: number;
}

export interface MenuModifierGroup {
  id: string;
  name: string;
  nameAr: string | null;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  addons: MenuAddon[];
}

export interface MenuProduct {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  imageUrl: string | null;
  priceMinor: number;
  taxClass: string;
  /**
   * Whether this branch is currently selling the product.
   *
   * The menu deliberately lists the whole catalogue and flags what the branch
   * cannot make right now — a dish that vanishes entirely reads as
   * discontinued. The flag must be honoured before an item is added to the
   * cart: the backend rejects an unavailable item at *placement*, so ignoring
   * it means the customer builds a whole order and is refused at checkout.
   */
  isAvailable: boolean;
  variants: { id: string; name: string; priceMinor: number; isDefault: boolean }[];
  modifierGroups: MenuModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  nameAr: string | null;
  imageUrl: string | null;
  products: MenuProduct[];
}

export interface Menu {
  branch: { id: string; name: string; nameAr: string | null };
  deliveryFeeMinor: number;
  minOrderMinor: number;
  categories: MenuCategory[];
}

export interface PriceQuote {
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  taxableBaseMinor: number;
  vatMinor: number;
  totalMinor: number;
  vatRate: string;
}

export interface OrderItemModifier {
  id: string;
  /** Null once the add-on has been deleted from the catalogue. */
  addonId: string | null;
  addonName: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  /**
   * Null once the product has been deleted from the catalogue. The snapshot
   * fields are the record of what was sold, so a catalogue change never
   * rewrites an order — which means reordering has to cope with a line whose
   * product no longer exists.
   */
  productId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  modifiers?: OrderItemModifier[];
}

export interface Order {
  id: string;
  /**
   * The branch's own running order number — its first order is "1000000",
   * its next "1000001". It is unique only within that branch, so it is what
   * the customer and the counter say out loud, never what identifies the
   * order to support.
   */
  orderNumber: string;
  /**
   * Globally unique 12-digit reference. This is the handle to quote when
   * asking about an order: unlike `orderNumber` it identifies exactly one
   * order across every branch.
   */
  referenceId: string;
  branchId: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  chargesMinor?: number;
  vatMinor: number;
  totalMinor: number;
  /** VAT rate the backend actually applied, e.g. "0.1500". Snapshotted. */
  vatRate?: string;
  items: OrderItem[];
  placedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  method: string | null;
  amountMinor: number;
  gatewayName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Address {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  district: string | null;
  city: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  isDefault: boolean;
}

export interface DeliveryTracking {
  id: string;
  orderId: string;
  status: string;
  addressSnapshot: {
    line1?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  driver: {
    id: string;
    vehicleType: string;
    currentLatitude: number | null;
    currentLongitude: number | null;
    lastLocationAt: string | null;
    user: { fullName: string };
  } | null;
}

// --- Customer config (public bootstrap) ------------------------------------

export type BannerAction =
  | 'NONE'
  | 'PRODUCT'
  | 'CATEGORY'
  | 'BRANCH'
  | 'EXTERNAL_URL'
  | 'OFFERS';

export interface Banner {
  id: string;
  name: string;
  imageUrl: string;
  imageUrlAr?: string | null;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  buttonText?: string | null;
  action: BannerAction;
  targetId?: string | null;
  targetUrl?: string | null;
  priority: number;
}

export type HomepageSectionKind = string;

export interface HomepageSection {
  id: string;
  kind: HomepageSectionKind;
  title: string | null;
  titleAr: string | null;
  position: number;
  enabled: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * One public call that carries everything the home screen needs — banners, the
 * owner's homepage section order, live promotions and the feature flags. The
 * owner configures all of it in the admin app, so anything not rendered here
 * is configuration with no effect.
 */
export interface CustomerConfig {
  version: number;
  features: Record<string, boolean>;
  banners: Banner[];
  promotions: Promotion[];
  homepageSections: HomepageSection[];
}

// --- Coupon-aware quote -----------------------------------------------------

export interface AppliedCoupon {
  couponId: string;
  code: string;
  discountMinor: number;
}

/**
 * The authenticated quote. An unusable code does **not** fail the request: the
 * base price comes back with `couponError` set, so the totals never disappear
 * while someone is fixing a typo.
 */
export interface CouponQuote {
  quote: PriceQuote;
  coupon: AppliedCoupon | null;
  couponError: string | null;
}
