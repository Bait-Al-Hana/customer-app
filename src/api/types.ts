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

/**
 * The coupon-aware quote from `POST /customer/orders/quote`.
 *
 * A code that does not apply is **not** an error response: the backend returns
 * the base price plus `couponError`, so the totals stay on screen while
 * someone fixes a typo. `coupon` is non-null only for a code that actually
 * priced — which is the only kind that should reach placement.
 */
/** One line of the order total, exactly as the backend built it. */
export interface BreakdownRow {
  kind:
    | 'ITEMS'
    | 'DISCOUNT'
    | 'DELIVERY_BASE'
    | 'DELIVERY_DISTANCE'
    | 'CHARGE'
    | 'VAT'
    | 'TOTAL';
  label: string;
  detail: string | null;
  amountMinor: number;
  /**
   * True when this row is **already inside** the total and must not be added
   * to it — the VAT line, because prices are VAT-inclusive. A summary that
   * summed every row would overstate every order by 15%.
   */
  included: boolean;
  /** True when the row reduces the total, so it renders with a minus sign. */
  negative: boolean;
}

/** How the delivery fee for this quote was reached. Null on a pickup order. */
export interface DeliveryQuote {
  /** Road-adjusted km, or null when the address has no map pin. */
  distanceKm: number | null;
  baseFeeMinor: number;
  baseFeeCoversKm: number;
  chargeableKm: number;
  perKmFeeMinor: number;
  distanceFeeMinor: number;
  deliveryFeeMinor: number;
  minOrderMinor: number;
  /** How much more the basket needs to reach the minimum. 0 when met. */
  shortfallMinor: number;
  maxRadiusKm: number | null;
  blockers: (
    | { code: 'OUT_OF_RANGE'; distanceKm: number; maxRadiusKm: number }
    | { code: 'BELOW_MINIMUM'; shortfallMinor: number; minOrderMinor: number }
  )[];
}

export interface OrderQuote {
  quote: PriceQuote;
  /** Present from the delivery-pricing release; absent on an older backend. */
  delivery?: DeliveryQuote | null;
  /** Present from the delivery-pricing release; absent on an older backend. */
  breakdown?: BreakdownRow[];
  coupon: { code: string; couponId: string; discountMinor: number } | null;
  couponError: string | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoyaltyEntry {
  id: string;
  type: string;
  points: number;
  orderId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface LoyaltyLedger {
  balance: number;
  data: LoyaltyEntry[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  createdAt: string;
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

export interface Banner {
  id: string;
  imageUrl: string;
  imageUrlAr?: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  buttonText?: string;
  buttonTextAr?: string;
  action: string;
  targetId?: string;
  targetUrl?: string;
  branchIds: string[];
  priority: number;
}

export interface CustomerConfig {
  version: string;
  banners: Banner[];
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
