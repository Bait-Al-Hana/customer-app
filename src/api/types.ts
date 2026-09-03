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
