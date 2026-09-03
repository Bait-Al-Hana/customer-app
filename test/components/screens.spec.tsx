import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider } from '../../src/cart/CartProvider';
import { MotionProvider } from '../../src/motion';

/**
 * Mounts every customer screen against a stubbed API.
 *
 * The pure tests cover the arithmetic and the contract suites cover the
 * requests; what neither covers is a screen *rendering* — and that is where a
 * blank page comes from. React unmounts the whole tree on an uncaught render
 * error, so one `order.customer.phone` on a null customer takes the app down.
 *
 * So the data here is deliberately awkward rather than tidy: nulls where the
 * API allows them, empty lists, a sold-out product, an order with no delivery,
 * a rejected coupon. A screen that only renders against perfect data is not
 * actually known to work.
 */

// `useAuth` builds a real HTTP client, so the screens are given a stub instead.
// Mocking the module leaves the app code untouched.
// `mock`-prefixed so the jest.mock factory below may reference it.
const mockApi = {
  listBranches: jest.fn(),
  customerConfig: jest.fn(),
  menu: jest.fn(),
  quote: jest.fn(),
  quoteWithCoupon: jest.fn(),
  myOrders: jest.fn(),
  order: jest.fn(),
  trackDelivery: jest.fn(),
  listAddresses: jest.fn(),
  orderPayment: jest.fn(),
  placeOrder: jest.fn(),
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
};

jest.mock('../../src/auth/AuthProvider', () => ({
  useAuth: () => ({
    api: mockApi,
    ready: true,
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// The real useFocusEffect runs its callback in an *effect*. Calling it during
// render instead makes any screen that reloads on focus re-render forever.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => void) => {
      react.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

import { BranchesScreen } from '../../src/screens/BranchesScreen';
import { CartScreen } from '../../src/screens/CartScreen';
import { CheckoutScreen } from '../../src/screens/CheckoutScreen';
import { MenuScreen } from '../../src/screens/MenuScreen';
import { OrderTrackingScreen } from '../../src/screens/OrderTrackingScreen';
import { OrdersScreen } from '../../src/screens/OrdersScreen';

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as never;

/**
 * The same provider stack the app mounts, minus auth (stubbed above). The
 * safe-area frame is supplied explicitly because there is no device to measure.
 */
const wrap = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <MotionProvider>
        <CartProvider>{ui}</CartProvider>
      </MotionProvider>
    </SafeAreaProvider>,
  );

const BRANCH = {
  id: 'b1',
  name: 'Olaya',
  nameAr: null,
  district: null, // nullable in the API, and the card joins it into a string
  city: 'Riyadh',
  isAcceptingOrders: true,
  deliveryFeeMinor: 1150,
  minOrderMinor: 2500,
};

const MENU = {
  branch: { id: 'b1', name: 'Olaya', nameAr: null },
  deliveryFeeMinor: 1150,
  minOrderMinor: 2500,
  categories: [
    {
      id: 'c1',
      name: 'Grills',
      nameAr: 'مشاوي',
      imageUrl: null,
      products: [
        {
          id: 'p1',
          name: 'Shawarma',
          nameAr: 'شاورما',
          description: null,
          imageUrl: null,
          priceMinor: 11_500,
          taxClass: 'STANDARD',
          isAvailable: true,
          variants: [],
          modifierGroups: [],
        },
        {
          // Sold out: must render, must not be addable.
          id: 'p2',
          name: 'Mixed Grill',
          nameAr: null,
          description: null,
          imageUrl: null,
          priceMinor: 22_000,
          taxClass: 'STANDARD',
          isAvailable: false,
          variants: [],
          modifierGroups: [],
        },
      ],
    },
  ],
};

const QUOTE = {
  currency: 'SAR',
  subtotalMinor: 11_500,
  discountMinor: 0,
  deliveryFeeMinor: 0,
  taxableBaseMinor: 10_000,
  vatMinor: 1_500,
  totalMinor: 11_500,
  vatRate: '0.1500',
};

const ORDER = {
  id: 'o1',
  orderNumber: '1000000',
  referenceId: '482913066571',
  branchId: 'b1',
  type: 'PICKUP',
  status: 'CONFIRMED',
  paymentStatus: 'PENDING',
  subtotalMinor: 11_500,
  discountMinor: 0,
  deliveryFeeMinor: 0,
  vatMinor: 1_500,
  totalMinor: 11_500,
  vatRate: '0.1500',
  placedAt: '2026-09-01T10:00:00.000Z',
  items: [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'Shawarma',
      variantName: null,
      quantity: 2,
      unitPriceMinor: 11_500,
      lineTotalMinor: 23_000,
      modifiers: [],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.listBranches.mockResolvedValue([BRANCH]);
  mockApi.customerConfig.mockResolvedValue({
    version: 1,
    features: {},
    banners: [],
    promotions: [],
    homepageSections: [],
  });
  mockApi.menu.mockResolvedValue(MENU);
  mockApi.quote.mockResolvedValue(QUOTE);
  mockApi.quoteWithCoupon.mockResolvedValue({ quote: QUOTE, coupon: null, couponError: null });
  mockApi.myOrders.mockResolvedValue({ data: [ORDER], meta: { total: 1, page: 1, limit: 20, pageCount: 1 } });
  mockApi.order.mockResolvedValue(ORDER);
  mockApi.trackDelivery.mockResolvedValue(null);
  mockApi.listAddresses.mockResolvedValue([]);
});

describe('BranchesScreen', () => {
  it('lists branches, and survives a null district', async () => {
    const { getByText } = wrap(<BranchesScreen navigation={navigation} route={{ key: 'k', name: 'Branches' } as never} />);
    await waitFor(() => expect(getByText('Olaya')).toBeTruthy());
  });

  it('renders the owner’s banners when there are any', async () => {
    mockApi.customerConfig.mockResolvedValue({
      version: 1,
      features: {},
      banners: [
        {
          id: 'ban1',
          name: 'Promo',
          imageUrl: 'https://example.test/b.png',
          title: 'Two for one',
          description: 'This week only',
          action: 'NONE',
          priority: 1,
        },
      ],
      promotions: [],
      homepageSections: [
        { id: 's1', kind: 'BANNERS', title: 'This week', titleAr: null, position: 0, enabled: true },
      ],
    });

    const { getByText } = wrap(<BranchesScreen navigation={navigation} route={{ key: 'k', name: 'Branches' } as never} />);
    await waitFor(() => expect(getByText('Two for one')).toBeTruthy());
    expect(getByText('This week')).toBeTruthy();
  });

  it('still shows the branches when the config call fails', async () => {
    // A failed banner fetch must never stop someone ordering.
    mockApi.customerConfig.mockRejectedValue(new Error('offline'));

    const { getByText } = wrap(<BranchesScreen navigation={navigation} route={{ key: 'k', name: 'Branches' } as never} />);
    await waitFor(() => expect(getByText('Olaya')).toBeTruthy());
  });
});

describe('MenuScreen', () => {
  const route = { key: 'k', name: 'Menu', params: { branchId: 'b1', branchName: 'Olaya' } } as never;

  it('renders the menu and marks a sold-out dish', async () => {
    const { getByText } = wrap(<MenuScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('Shawarma')).toBeTruthy());
    expect(getByText('Mixed Grill')).toBeTruthy();
    expect(getByText('Sold out')).toBeTruthy();
  });

  it('has a search box', async () => {
    const { getByLabelText } = wrap(<MenuScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByLabelText('Search the menu')).toBeTruthy());
  });

  it('renders an empty menu without throwing', async () => {
    mockApi.menu.mockResolvedValue({ ...MENU, categories: [] });
    const { getByText } = wrap(<MenuScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('Menu is empty')).toBeTruthy());
  });
});

describe('CartScreen', () => {
  it('renders an empty cart', () => {
    expect(() =>
      wrap(<CartScreen navigation={navigation} route={{ key: 'k', name: 'Cart' } as never} />).unmount(),
    ).not.toThrow();
  });
});

describe('CheckoutScreen', () => {
  const route = { key: 'k', name: 'Checkout', params: { type: 'PICKUP' } } as never;

  it('shows the promo-code field and the server totals', async () => {
    const { getByText, getByLabelText } = wrap(<CheckoutScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('Promo code')).toBeTruthy());
    expect(getByLabelText('Promo code')).toBeTruthy();
    expect(getByText('Order total')).toBeTruthy();
  });

  it('shows an applied coupon and what it saves', async () => {
    mockApi.quoteWithCoupon.mockResolvedValue({
      quote: { ...QUOTE, discountMinor: 1_300, totalMinor: 10_200 },
      coupon: { couponId: 'c1', code: 'WELCOME10', discountMinor: 1_300 },
      couponError: null,
    });

    const { getByText } = wrap(<CheckoutScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('WELCOME10 applied')).toBeTruthy());
    expect(getByText('You save SAR 13.00')).toBeTruthy();
  });

  it('keeps the totals visible when a code is rejected', async () => {
    // The whole point of the coupon-aware quote: a bad code must not blank the
    // price while someone fixes a typo.
    mockApi.quoteWithCoupon.mockResolvedValue({
      quote: QUOTE,
      coupon: null,
      couponError: 'That coupon code is not valid.',
    });

    const { getByText } = wrap(<CheckoutScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('That coupon code is not valid.')).toBeTruthy());
    expect(getByText('Order total')).toBeTruthy();
  });
});

describe('OrdersScreen', () => {
  const route = { key: 'k', name: 'Orders' } as never;

  it('lists orders with their number, reference and a reorder action', async () => {
    const { getByText, getByLabelText } = wrap(<OrdersScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
    expect(getByText('Ref 482913066571')).toBeTruthy();
    expect(getByLabelText('Order 1000000 again')).toBeTruthy();
  });

  it('renders an empty history', async () => {
    mockApi.myOrders.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, pageCount: 0 } });
    const { getByText } = wrap(<OrdersScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('No orders yet')).toBeTruthy());
  });
});

describe('OrderTrackingScreen', () => {
  const route = { key: 'k', name: 'OrderTracking', params: { orderId: 'o1' } } as never;

  it('shows the order number, the reference and the priced breakdown', async () => {
    const { getByText } = wrap(<OrderTrackingScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
    expect(getByText('482913066571')).toBeTruthy();
    expect(getByText('VAT (15%)')).toBeTruthy();
  });

  it('renders an order with no delivery, which is a pickup’s normal state', async () => {
    mockApi.trackDelivery.mockRejectedValue(new Error('Not found'));
    const { getByText } = wrap(<OrderTrackingScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
  });

  it('renders an order the API returned without a reference', async () => {
    // referenceId is backfilled, but a screen must not blank out if one is
    // missing — the rest of the order is still worth showing.
    mockApi.order.mockResolvedValue({ ...ORDER, referenceId: undefined });
    const { getByText } = wrap(<OrderTrackingScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
  });
});
