import { OrderType, PaymentMethod } from '../types/backend';
import { ApiClient } from './http';
import {
  Address,
  AuthTokens,
  Branch,
  CustomerConfig,
  CustomerProfile,
  DeliveryTracking,
  LoyaltyLedger,
  Menu,
  NotificationItem,
  Order,
  OrderQuote,
  Payment,
  PriceQuote,
  RefundEligibility,
  RefundRequest,
} from './types';

export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  district?: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isDefault?: boolean;
}

/** Cart item as the quote/order endpoints expect it. */
export interface OrderItemInput {
  productId: string;
  /** Chosen size/variant. When set, the variant's price replaces the product's base. */
  productVariantId?: string;
  quantity: number;
  addonIds?: string[];
}

/**
 * Typed backend endpoints the customer app uses. One method per call, so a
 * screen never assembles a URL or body by hand.
 */
export class Api {
  constructor(private readonly http: ApiClient) {}

  // --- Auth (public) --------------------------------------------------------
  requestOtp(phone: string): Promise<{ expiresInSeconds?: number }> {
    return this.http.request('/auth/customer/otp/request', { method: 'POST', body: { phone }, public: true });
  }

  verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    return this.http.request('/auth/customer/otp/verify', { method: 'POST', body: { phone, code }, public: true });
  }

  /**
   * Revokes the session family server-side. Public (it takes the refresh token
   * in the body and reveals nothing about whether it existed) and idempotent.
   *
   * Clearing tokens on the device alone is not signing out: the refresh token
   * stays valid until it expires, so anyone holding a copy — a shared handset,
   * a restored backup — can keep minting access tokens for an account the
   * customer believes they have left.
   */
  logout(refreshToken: string): Promise<void> {
    return this.http.request('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      public: true,
    });
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.http.request('/auth/refresh', { method: 'POST', body: { refreshToken }, public: true });
  }

  // --- Customer config (public) ----------------------------------------------
  customerConfig(): Promise<CustomerConfig> {
    return this.http.request('/customer/config', { public: true });
  }

  // --- Catalog (public) -----------------------------------------------------
  listBranches(): Promise<Branch[]> {
    // `/customer/branches`, not `/branches`. The latter is the *staff*
    // resource — it carries `code` and `status` and requires `branches:read` —
    // and the two used to share a path, with the public one winning
    // registration and leaving the admin app without a branch status. They are
    // separate routes now, so this must use the customer one or get a 403.
    return this.http.request('/customer/branches', { public: true });
  }

  menu(branchId: string): Promise<Menu> {
    return this.http.request(`/branches/${branchId}/menu`, { public: true });
  }

  /**
   * Prices the cart. **Authenticated** — pricing is not a public endpoint, and
   * sending this without the token returns 401, which surfaces as "couldn't
   * price your order" and blocks checkout entirely. The whole shopping flow is
   * behind sign-in, so the token is always available here.
   */
  quote(input: { branchId: string; type: OrderType; items: OrderItemInput[] }): Promise<PriceQuote> {
    return this.http.request('/pricing/quote', { method: 'POST', body: input });
  }

  /**
   * Prices the cart **with a coupon**, for checkout.
   *
   * Separate from `quote()` on purpose. `/pricing/quote` has no `couponCode`
   * field at all and the backend runs `forbidNonWhitelisted`, so sending one
   * there is a 400, not a discount. This route evaluates the code against this
   * customer and returns the base price plus a `couponError` when it does not
   * apply — read-only, no usage is recorded; the claim happens atomically at
   * placement.
   */
  quoteOrder(input: {
    branchId: string;
    type: OrderType;
    items: OrderItemInput[];
    couponCode?: string;
    /**
     * The address this would be delivered to. **Send it whenever one is
     * chosen**: the delivery fee is priced from its distance to the branch, so
     * a quote without it comes back at the base fee only and the customer
     * discovers the real fee when the order is placed — the exact "price
     * changed at the last second" failure the coupon-aware quote exists to
     * prevent.
     */
    customerAddressId?: string;
  }): Promise<OrderQuote> {
    return this.http.request('/customer/orders/quote', { method: 'POST', body: input });
  }

  // --- Customer orders (authenticated) --------------------------------------
  placeOrder(input: {
    branchId: string;
    type: OrderType;
    paymentMethod: PaymentMethod;
    customerAddressId?: string;
    items: OrderItemInput[];
    couponCode?: string;
    customerNotes?: string;
  }, idempotencyKey?: string): Promise<Order> {
    return this.http.request('/customer/orders', {
      method: 'POST',
      body: input,
      // The backend places the order once per key and replays the stored
      // result afterwards, so a request that times out mid-flight can be
      // retried without the kitchen cooking the same order twice. The key is
      // owned by the cart (see `CartProvider`), never generated here — one
      // minted per call would make every retry a new order.
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }

  myOrders(): Promise<{ data: Order[] }> {
    return this.http.request('/customer/orders');
  }

  order(id: string): Promise<Order> {
    return this.http.request(`/customer/orders/${id}`);
  }

  cancelOrder(id: string, reason?: string): Promise<Order> {
    return this.http.request(`/customer/orders/${id}/cancel`, { method: 'POST', body: { reason } });
  }

  /**
   * Whether this order can be cancelled outright, or a refund asked for.
   *
   * A separate call rather than a field on the order, because the answer moves
   * on its own: the order crosses out of cancellable, a refund starts, a window
   * shuts. The rule lives on the server — this app renders the sentence it
   * sends and keeps no second copy of it.
   */
  refundEligibility(orderId: string): Promise<RefundEligibility> {
    return this.http.request(`/customer/orders/${orderId}/refund-eligibility`);
  }

  requestRefund(orderId: string, reason: string): Promise<RefundRequest> {
    return this.http.request(`/customer/orders/${orderId}/refund-request`, {
      method: 'POST',
      body: { reason },
    });
  }

  /** This order's requests, newest first — including ones already decided. */
  refundRequestsFor(orderId: string): Promise<{ data: RefundRequest[] }> {
    return this.http.request(`/customer/refund-requests?orderId=${orderId}`);
  }

  withdrawRefundRequest(id: string): Promise<RefundRequest> {
    return this.http.request(`/customer/refund-requests/${id}/withdraw`, { method: 'POST' });
  }

  // --- Addresses (authenticated) --------------------------------------------
  listAddresses(): Promise<Address[]> {
    return this.http.request('/customer/addresses');
  }

  createAddress(input: AddressInput): Promise<Address> {
    return this.http.request('/customer/addresses', { method: 'POST', body: input });
  }

  deleteAddress(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.http.request(`/customer/addresses/${id}`, { method: 'DELETE' });
  }

  // --- Delivery tracking (authenticated) ------------------------------------
  trackDelivery(orderId: string): Promise<DeliveryTracking> {
    return this.http.request(`/customer/orders/${orderId}/delivery`);
  }

  // --- Payment (authenticated) ----------------------------------------------
  initiatePayment(orderId: string, method: PaymentMethod): Promise<{ payment: Payment }> {
    return this.http.request(`/customer/orders/${orderId}/pay`, { method: 'POST', body: { method } });
  }

  paymentFor(orderId: string): Promise<Payment> {
    return this.http.request(`/customer/orders/${orderId}/payment`);
  }

  // --- Loyalty (authenticated) ----------------------------------------------
  loyalty(): Promise<LoyaltyLedger> {
    return this.http.request('/customer/loyalty');
  }

  // --- Notifications (authenticated) ----------------------------------------
  notifications(): Promise<{ data: NotificationItem[] }> {
    return this.http.request('/customer/notifications');
  }

  // --- Profile (authenticated) ----------------------------------------------
  getProfile(): Promise<CustomerProfile> {
    return this.http.request('/customer/me');
  }

  updateProfile(input: { fullName: string }): Promise<CustomerProfile> {
    return this.http.request('/customer/me', { method: 'PATCH', body: input });
  }

  /**
   * Deletes the signed-in customer's account.
   *
   * The server anonymises rather than removing the row — past orders are the
   * restaurant's sales and VAT records and stay — and revokes every session, so
   * the tokens this app is holding are dead the moment this resolves. Whatever
   * calls this must clear the device afterwards; there is nothing left to
   * authenticate with.
   */
  deleteAccount(): Promise<{ deleted: boolean }> {
    return this.http.request('/customer/me', { method: 'DELETE' });
  }
}
