import { Api } from '../../src/api/endpoints';
import type { ApiClient } from '../../src/api/http';

/**
 * The endpoint contract: which path each call uses, and whether it carries the
 * bearer token.
 *
 * These two facts are invisible to every other kind of test. The screens
 * render, the types compile, the backend route exists and the backend's own
 * `client-contracts.e2e-spec.ts` asserts the *correct* contract — and the app
 * can still call the wrong path, because nothing checked that the app agreed
 * with any of it. Two calls had drifted and both broke the app outright:
 *
 *   - `listBranches` called `/branches`, the staff resource (`branches:read`),
 *     which answers 401 to a customer. The first screen of the app could never
 *     load.
 *   - `quote` passed `public: true`, which *strips* the bearer token. Pricing
 *     is authenticated, so checkout could never show a total — signed in or
 *     not.
 *
 * So assert the path and the auth flag directly, against a recording double.
 * `public: true` means "send no token": correct for browsing, wrong for
 * anything the backend gates.
 */

interface Call {
  path: string;
  method: string;
  isPublic: boolean;
  headers: Record<string, string>;
}

function recorder(): { api: Api; calls: Call[] } {
  const calls: Call[] = [];
  const http = {
    request: (
      path: string,
      options?: { method?: string; public?: boolean; headers?: Record<string, string> },
    ) => {
      calls.push({
        path,
        method: options?.method ?? 'GET',
        isPublic: options?.public === true,
        headers: options?.headers ?? {},
      });
      return Promise.resolve(undefined as never);
    },
  } as unknown as ApiClient;

  return { api: new Api(http), calls };
}

async function record(invoke: (api: Api) => Promise<unknown>): Promise<Call> {
  const { api, calls } = recorder();
  await invoke(api);

  const [call] = calls;
  if (!call) {
    throw new Error('The endpoint made no HTTP call.');
  }
  expect(calls).toHaveLength(1);

  return call;
}

describe('customer endpoint contract', () => {
  describe('public browsing — no token, and no staff-only route', () => {
    it('lists branches from the customer resource, not the staff one', async () => {
      const call = await record((api) => api.listBranches());

      expect(call.path).toBe('/customer/branches');
      // The regression guard. `/branches` is staff-only and 401s a customer.
      expect(call.path).not.toBe('/branches');
      expect(call.isPublic).toBe(true);
    });

    it('loads a branch menu publicly', async () => {
      const call = await record((api) => api.menu('branch-1'));

      expect(call.path).toBe('/branches/branch-1/menu');
      expect(call.isPublic).toBe(true);
    });
  });

  describe('authenticated calls must carry the token', () => {
    it('prices the cart with the token attached', async () => {
      const call = await record((api) =>
        api.quote({ branchId: 'b1', type: 'PICKUP', items: [{ productId: 'p1', quantity: 1 }] }),
      );

      expect(call.path).toBe('/pricing/quote');
      expect(call.method).toBe('POST');
      // The regression guard: `public: true` here silently strips the token
      // and checkout can never price.
      expect(call.isPublic).toBe(false);
    });

    it.each([
      ['places an order', (api: Api) => api.placeOrder({ branchId: 'b1', type: 'PICKUP', paymentMethod: 'CARD', items: [] })],
      ['lists orders', (api: Api) => api.myOrders()],
      ['gets one order', (api: Api) => api.order('o1')],
      ['cancels an order', (api: Api) => api.cancelOrder('o1', 'changed my mind')],
      ['lists addresses', (api: Api) => api.listAddresses()],
      ['creates an address', (api: Api) => api.createAddress({ line1: '1 St', city: 'Riyadh' })],
      ['deletes an address', (api: Api) => api.deleteAddress('a1')],
      ['tracks a delivery', (api: Api) => api.trackDelivery('o1')],
      ['starts a payment', (api: Api) => api.initiatePayment('o1', 'CARD')],
      ['reads a payment', (api: Api) => api.paymentFor('o1')],
      ['reads the loyalty ledger', (api: Api) => api.loyalty()],
      ['reads notifications', (api: Api) => api.notifications()],
      ['reads the profile', (api: Api) => api.getProfile()],
      ['updates the profile', (api: Api) => api.updateProfile({ fullName: 'Sara' })],
    ])('%s with the token attached', async (_name, invoke) => {
      const call = await record(invoke);

      expect(call.isPublic).toBe(false);
    });
  });

  describe('order placement is idempotent', () => {
    it('sends the caller-supplied key as `Idempotency-Key`', async () => {
      const call = await record((api) =>
        api.placeOrder(
          { branchId: 'b1', type: 'PICKUP', paymentMethod: 'CARD', items: [] },
          'key-abc',
        ),
      );

      // Without this header the backend has no way to tell a retry from a
      // second order, and a placement that times out and is retried is cooked
      // twice.
      expect(call.headers['Idempotency-Key']).toBe('key-abc');
    });

    it('omits the header entirely when no key is given', async () => {
      const call = await record((api) =>
        api.placeOrder({ branchId: 'b1', type: 'PICKUP', paymentMethod: 'CARD', items: [] }),
      );

      expect(call.headers['Idempotency-Key']).toBeUndefined();
    });
  });

  describe('auth calls are public by definition', () => {
    it.each([
      ['requests an OTP', (api: Api) => api.requestOtp('+966500000000')],
      ['verifies an OTP', (api: Api) => api.verifyOtp('+966500000000', '123456')],
      ['refreshes tokens', (api: Api) => api.refresh('token')],
      // Public by design: it carries the refresh token in the body and reveals
      // nothing about whether that token existed.
      ['signs out', (api: Api) => api.logout('token')],
      // The storefront must load before anyone signs in.
      ['loads the storefront config', (api: Api) => api.customerConfig()],
    ])('%s without a token', async (_name, invoke) => {
      const call = await record(invoke);

      expect(call.isPublic).toBe(true);
    });
  });
});
