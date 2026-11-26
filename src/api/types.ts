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
  /** Delivery price (the pickup price plus the branch/product uplift). */
  deliveryPriceMinor: number;
  taxClass: string;
  /**
   * Whether this branch currently sells the product. The backend only rejects
   * an unavailable item at *placement*, so a client that ignores this flag lets
   * a customer build a cart that fails at checkout with them standing there.
   * Every cart-building path must honour it.
   */
  isAvailable: boolean;
  /** When a timed stock-out ends (ISO-8601 UTC), or null — on sale, or off with no time promised. */
  unavailableUntil: string | null;
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
  /** Null when the add-on has since been deleted from the catalog. */
  addonId: string | null;
  addonName: string;
}

export interface OrderItem {
  id: string;
  /** Null when the product has since been deleted from the catalog. */
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
  orderNumber: string;
  branchId: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  vatMinor: number;
  totalMinor: number;
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

/**
 * A published offer — an owner's public coupon, from `GET /customer/config`.
 * The card the customer taps carries the very `code` the checkout honours, so
 * there is no second discount path to keep in step with the pricing engine.
 */
export interface Offer {
  id: string;
  code: string;
  name: string;
  description?: string;
  imageUrl?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  /** Percentage points for PERCENTAGE; minor units for FIXED_AMOUNT; unused for FREE_DELIVERY. */
  discountValue: number;
  maxDiscountMinor?: number;
  /** Minimum basket (minor units) the offer needs, when the coupon sets one. */
  minSpendMinor?: number;
  validUntil: string;
}

/** The slice of `GET /customer/config` this app reads. */
export interface CustomerConfig {
  offers: Offer[];
}

/**
 * The authenticated cart quote (`POST /customer/orders/quote`).
 *
 * Unlike the public `/pricing/quote`, this evaluates a coupon for *this*
 * customer and returns the real delivery fee for a chosen address. The price
 * breakdown is nested under `quote`; a bad code never takes the totals down
 * with it — it comes back as `couponError` with the base price intact.
 */
export interface CustomerQuote {
  quote: PriceQuote;
  coupon: { code: string; couponId: string; name: string; discountMinor: number } | null;
  couponError: string | null;
  promotion: { promotionId: string; name: string; discountMinor: number } | null;
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
