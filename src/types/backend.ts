/**
 * Backend enums, mirrored.
 *
 * The app cannot import the backend's Prisma types, so the string values here
 * MUST stay identical to `prisma/schema.prisma` in the backend repo. They are
 * the contract the API returns. A drift here is a silent bug, so these are kept
 * as a single, reviewed source and referenced everywhere rather than
 * re-typed inline.
 *
 * Source of truth: backend `OrderStatus`, `PaymentStatus`, `OrderType`.
 */

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  /**
   * The branch has the order and has not accepted it yet.
   *
   * Only produced by a branch with `autoAcceptOrders = false`, which is why it
   * was missing here for so long: an auto-accept branch never emits it, so the
   * app ran fine against every branch anyone tested with. On a manual-accept
   * branch it is the status a customer sits in **immediately after paying**, so
   * every screen that maps a status has to handle it.
   */
  AWAITING_ACCEPTANCE: 'AWAITING_ACCEPTANCE',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ORDER_TYPE = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;

export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

export const PAYMENT_METHOD = {
  CARD: 'CARD',
  MADA: 'MADA',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// --- Refund and cancellation requests ---------------------------------------

export const REFUND_REQUEST_TYPE = {
  CANCELLATION: 'CANCELLATION',
  REFUND: 'REFUND',
} as const;

export type RefundRequestType = (typeof REFUND_REQUEST_TYPE)[keyof typeof REFUND_REQUEST_TYPE];

export const REFUND_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type RefundRequestStatus =
  (typeof REFUND_REQUEST_STATUS)[keyof typeof REFUND_REQUEST_STATUS];

/**
 * Why a request cannot be raised right now.
 *
 * The server decides this and sends a sentence with it — the app renders that
 * sentence rather than keeping a second copy of the rule, which is how the two
 * end up disagreeing about what a customer is allowed to do.
 */
export type RefundRequestBlocker =
  | 'SELF_SERVICE_CANCEL'
  | 'ALREADY_OPEN'
  | 'REFUND_IN_PROGRESS'
  | 'NOTHING_TO_REFUND'
  | 'WINDOW_CLOSED';
