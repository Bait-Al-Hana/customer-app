/**
 * API response shapes, mirrored from the backend. Kept in one place and in sync
 * with the backend controllers the app calls.
 */

import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  RefundRequestBlocker,
  RefundRequestStatus,
  RefundRequestType,
} from '../types/backend';

export interface Branch {
  id: string;
  name: string;
  nameAr: string | null;
  /** The branch's published number, for "call the branch about my order". */
  phone: string | null;
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
  /**
   * Whether the branch is inside its opening hours **right now**, in its own
   * timezone. Distinct from `isAcceptingOrders`, which is a switch staff flip.
   *
   * Optional because a backend older than the schedule does not send it, and
   * an absent value means *no opinion* rather than closed — read it through
   * `util/branchOpen.ts`, never directly.
   */
  isOpenNow?: boolean;
  /** `"17:00"` — when it opens again today, if it does. */
  opensAt?: string | null;
  /** `"23:00"` — when the current window ends. */
  closesAt?: string | null;
  /** `"Eid holiday"` — why today differs, from a date override. */
  closedNote?: string | null;
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
  /** The pickup price — the catalogue price with no delivery uplift. */
  priceMinor: number;
  /**
   * The delivery price: the same item with the branch's delivery uplift folded
   * in. **This is the price the app shows.** Absent on an older backend, in
   * which case the pickup price stands in — see `menuPriceMinor`.
   */
  deliveryPriceMinor?: number;
  taxClass: string;
  isAvailable: boolean;
  /** When a timed stock-out ends, or null. Null also means "no time promised". */
  unavailableUntil?: string | null;
  variants: {
    id: string;
    name: string;
    priceMinor: number;
    deliveryPriceMinor?: number;
    isDefault: boolean;
  }[];
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
  kind: 'ITEMS' | 'DELIVERY_BASE' | 'DELIVERY_DISTANCE' | 'CHARGE' | 'VAT' | 'TOTAL';
  label: string;
  detail: string | null;
  amountMinor: number;
  /**
   * What this row would have cost without a discount, rendered struck through
   * beside the amount. Absent when nothing was discounted.
   */
  strikethroughMinor?: number;
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
  /**
   * Whether the branch is open, on the quote rather than at the final press.
   *
   * Same discipline as `delivery.blockers`: the moment a customer most needs to
   * know they cannot order is *before* they have chosen what to eat. The quote
   * still prices the basket — the totals must not vanish while they decide
   * whether to wait or pick another branch.
   *
   * Absent on a backend that predates opening hours, and an absent value means
   * **no opinion**, never closed.
   */
  branchOpen?: {
    isOpen: boolean;
    closedReason: 'outside_hours' | 'day_closed' | 'override_closed' | null;
    note: string | null;
    opensAt: string | null;
    closesAt: string | null;
    /** The whole sentence, already written by the server. */
    message: string | null;
  };
  /** Present from the delivery-pricing release; absent on an older backend. */
  delivery?: DeliveryQuote | null;
  /** Present from the delivery-pricing release; absent on an older backend. */
  breakdown?: BreakdownRow[];
  coupon: {
    code: string;
    couponId: string;
    /**
     * The offer's own name — "Twenty off your first order".
     *
     * Absent on a backend that predates it, so every caller falls back to the
     * code. It is what the bill says took the money off: a customer who tapped
     * an offer card recognises its name, not the code behind it.
     */
    name?: string;
    discountMinor: number;
  } | null;
  couponError: string | null;
  /**
   * The automatic promotion the server applied, if any. Absent on a backend
   * that predates them.
   *
   * The bill has to be able to name it. A discount the customer never asked for
   * and cannot see the reason for gets queried exactly as often as an
   * unexplained charge.
   */
  promotion?: {
    promotionId: string;
    name: string;
    discountMinor: number;
  } | null;
  /**
   * Set when a code the customer typed was valid but lost to a bigger
   * automatic promotion. **Not an error** — the code still works, and it was
   * not spent.
   */
  couponSuperseded?: string | null;
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
  /**
   * Optional, because the array is what the server sends and not what this app
   * guarantees. `.map` or `.length` on an absent field throws inside render and
   * unmounts the tree — the same class of failure as `driver.user` on the
   * tracking payload, and it was reproduced the same way: in a browser, against
   * the real web bundle. Read it as `order.items ?? []`.
   */
  items?: OrderItem[];
  placedAt: string;
  zatcaQrData?: string | null;
  zatcaInvoiceNumber?: string | null;
  zatcaStatus?: string | null;
  zatcaSubmittedAt?: string | null;
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

/**
 * An offer the owner published: a real coupon, with its artwork and its code.
 *
 * The card the customer taps carries the very code the checkout accepts, so
 * there is no second discount path in this app that could drift from what the
 * server actually applies. The app never computes what an offer is worth — it
 * shows the code, and the backend prices the order.
 */
export interface Offer {
  id: string;
  code: string;
  name: string;
  description?: string;
  /** Artwork the owner uploaded for this offer. */
  imageUrl?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountValue: number;
  maxDiscountMinor?: number;
  /** Minimum basket the coupon needs, when it carries that rule. */
  minSpendMinor?: number;
  validUntil: string;
}

/**
 * An automatic discount the owner is running. **No code, nothing to tap.**
 *
 * That is the whole difference from an `Offer`, and it is why this is a
 * separate type rather than an offer with an optional code: an offer is a
 * coupon the customer claims, a promotion is a price already being charged. A
 * card for one must therefore carry no button — a control that does not control
 * anything is worse than the row it replaced.
 */
export interface Promotion {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountValue: number;
  maxDiscountMinor?: number;
  /**
   * Branches it runs at. **Empty means every branch**, not none.
   *
   * `/customer/config` is branch-agnostic, so the filtering happens in this
   * app. Showing a promotion that only another branch runs is the same failure
   * as a code the checkout refuses: a deal the customer could not have had.
   */
  branchIds: string[];
  startsAt: string;
  endsAt: string;
  priority: number;
  products: { id: string; name: string; nameAr?: string; imageUrl?: string }[];
}

export interface CustomerConfig {
  version: string;
  banners: Banner[];
  /** Absent on a backend that predates published offers. */
  offers?: Offer[];
  /** Absent on a backend that predates automatic promotions. */
  promotions?: Promotion[];
}

export interface DeliveryTracking {
  id: string;
  orderId: string;
  status: string;
  addressSnapshot: {
    line1?: string;
    city?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  /**
   * The assigned driver, or null while the delivery is still awaiting one.
   *
   * **Every field here is optional on purpose, `user` included.** The screen
   * read `driver.user.fullName` with no guard because this type promised a
   * `user` — and a type is a promise about a *local* value, not about what a
   * server two deploys ahead actually sends. When that read met a null it threw
   * inside render, React unmounted the tree, and the customer got the error
   * boundary on the one screen that tells them where their food is. It is the
   * same failure `statusMeta` exists for (see `order-status.model.ts`), on a
   * different field.
   */
  driver: {
    id: string;
    vehicleType?: string | null;
    /**
     * `string` is not a mistake here either. These are `Decimal` columns, and
     * `Prisma.Decimal` serialises to a JSON string — so an older backend sends
     * `"24.72"`. Typing them `number` is what let a string reach
     * `.toFixed()` and crash this screen. Read them through `pointOf`
     * (`util/branchChoice.ts`), never directly.
     */
    currentLatitude?: number | string | null;
    currentLongitude?: number | string | null;
    lastLocationAt?: string | null;
    user?: { fullName?: string | null } | null;
  } | null;
}

// --- Refund and cancellation requests ---------------------------------------

/** `GET /customer/orders/:id/refund-eligibility`. */
export interface RefundEligibility {
  /** True when raising a request would be accepted. */
  canRequest: boolean;
  /** What such a request would be, or null when none can be raised. */
  type: RefundRequestType | null;
  /** True when the order can still be cancelled outright, with no request. */
  canSelfCancel: boolean;
  blocker: RefundRequestBlocker | null;
  /** A sentence written for the customer. Always present — render this. */
  message: string;
  /** When the request window shuts, or null when there is no deadline. */
  windowClosesAt: string | null;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  type: RefundRequestType;
  status: RefundRequestStatus;
  reason: string;
  /** What the branch said when they decided. Shown verbatim. */
  resolutionNote: string | null;
  reviewedAt: string | null;
  refundId: string | null;
  /**
   * When the refund was actually sent. **Null on an approved request means the
   * money has not gone yet** — the branch agreed and the owner issues it in the
   * payment gateway's dashboard afterwards. Telling a customer their refund is
   * on its way before this is set is the one thing this screen must not do.
   */
  refundIssuedAt: string | null;
  orderCancelled: boolean;
  createdAt: string;
  order?: { orderNumber: string; referenceId: string; totalMinor: number; currency: string } | null;
  refund?: { id: string; amountMinor: number; status: string; currency: string } | null;
}
