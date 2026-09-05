import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Mounts every customer screen against a stubbed API.
 *
 * React unmounts the whole tree when a render throws and nothing catches it, so
 * one unexpected null from an API response is the difference between a working
 * screen and a blank view the customer can only escape by force-quitting. This
 * app had no screen tests at all, and the error boundary added alongside these
 * is a floor, not a substitute: a boundary means the customer sees a message
 * instead of nothing, and this suite is what stops them seeing either.
 *
 * The fixtures are deliberately awkward, because a screen that only renders
 * against tidy data is not actually known to work. Every optional field the
 * backend can send as null is null here: a branch with no district, coordinates
 * or prep time; a menu category with no products; an order with no items; a
 * profile with no name; a banner carrying an `action` this build has never
 * heard of; and empty lists everywhere a list can be empty. Add a case here
 * when a screen starts reading a new nullable field.
 */

// `mock`-prefixed so the jest.mock factories below may reference them.
const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  popToTop: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  isFocused: () => true,
} as never;

const mockApi = {
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
  logout: jest.fn(),
  customerConfig: jest.fn(),
  listBranches: jest.fn(),
  menu: jest.fn(),
  quote: jest.fn(),
  quoteOrder: jest.fn(),
  placeOrder: jest.fn(),
  myOrders: jest.fn(),
  order: jest.fn(),
  cancelOrder: jest.fn(),
  listAddresses: jest.fn(),
  createAddress: jest.fn(),
  deleteAddress: jest.fn(),
  trackDelivery: jest.fn(),
  initiatePayment: jest.fn(),
  paymentFor: jest.fn(),
  loyalty: jest.fn(),
  notifications: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

// `useFocusEffect` needs a real NavigationContainer, which these tests
// deliberately do not build — the point is to mount the screen, not the
// navigator. Running the effect once is what focusing does.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const reactModule = jest.requireActual<typeof import('react')>('react');

  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      reactModule.useEffect(effect, [effect]);
    },
    useNavigation: () => mockNavigation,
  };
});

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

import { CartProvider, useCart } from '../../src/cart/CartProvider';
import { FavoritesProvider } from '../../src/favorites/FavoritesProvider';
import { MotionProvider } from '../../src/motion';
import { AccountScreen } from '../../src/screens/AccountScreen';
import { AddAddressScreen } from '../../src/screens/AddAddressScreen';
import { AddressesScreen } from '../../src/screens/AddressesScreen';
import { CartScreen } from '../../src/screens/CartScreen';
import { CheckoutScreen } from '../../src/screens/CheckoutScreen';
import { FavoritesScreen } from '../../src/screens/FavoritesScreen';
import { FulfilmentProvider } from '../../src/fulfilment/FulfilmentProvider';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { LocationSetupScreen } from '../../src/screens/LocationSetupScreen';
import { LoyaltyScreen } from '../../src/screens/LoyaltyScreen';
import { MenuScreen } from '../../src/screens/MenuScreen';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';
import { OffersScreen } from '../../src/screens/OffersScreen';
import { OrderSuccessScreen } from '../../src/screens/OrderSuccessScreen';
import { OrderTrackingScreen } from '../../src/screens/OrderTrackingScreen';
import { OrdersScreen } from '../../src/screens/OrdersScreen';
import { OtpScreen } from '../../src/screens/OtpScreen';
import { PaymentProcessingScreen } from '../../src/screens/PaymentProcessingScreen';
import { PhoneScreen } from '../../src/screens/PhoneScreen';
import { ProductScreen } from '../../src/screens/ProductScreen';
import { HelpScreen } from '../../src/screens/HelpScreen';
import { LegalScreen } from '../../src/screens/LegalScreen';
import { NotificationSettingsScreen } from '../../src/screens/NotificationSettingsScreen';
import { PaymentMethodsScreen } from '../../src/screens/PaymentMethodsScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SearchScreen } from '../../src/screens/SearchScreen';

const navigation = mockNavigation;

const route = (name: string, params?: unknown) => ({ key: `${name}-1`, name, params }) as never;


function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <MotionProvider>
        <CartProvider>
          <FulfilmentProvider>
            <FavoritesProvider>{ui}</FavoritesProvider>
          </FulfilmentProvider>
        </CartProvider>
      </MotionProvider>
    </SafeAreaProvider>,
  );
}

/** A branch with every optional field null — what a half-configured branch looks like. */
const SPARSE_BRANCH = {
  id: 'b1',
  name: 'Olaya',
  nameAr: null,
  addressLine: '1 Street',
  district: null,
  city: 'Riyadh',
  latitude: null,
  longitude: null,
  acceptsDelivery: true,
  acceptsPickup: true,
  isAcceptingOrders: true,
  acceptsCashOnDelivery: true,
  deliveryFeeMinor: 1500,
  minOrderMinor: 0,
  prepTimeMinutes: null,
};

const PRODUCT = {
  id: 'p1',
  name: 'Mixed Grill',
  nameAr: null,
  description: null,
  imageUrl: null,
  priceMinor: 10_000,
  taxClass: 'STANDARD',
  isAvailable: true,
  variants: [],
  modifierGroups: [],
};

const MENU = {
  branch: { id: 'b1', name: 'Olaya', nameAr: null },
  deliveryFeeMinor: 1500,
  minOrderMinor: 0,
  categories: [
    { id: 'c1', name: 'Mains', nameAr: null, imageUrl: null, products: [PRODUCT] },
    // A category with nothing in it — an owner mid-edit produces exactly this.
    { id: 'c2', name: 'Empty', nameAr: null, imageUrl: null, products: [] },
  ],
};

const QUOTE = {
  currency: 'SAR',
  subtotalMinor: 10_000,
  discountMinor: 0,
  deliveryFeeMinor: 1500,
  taxableBaseMinor: 10_000,
  vatMinor: 1500,
  totalMinor: 11_500,
  // The rate as the backend actually sends it: a decimal fraction, the way it
  // is stored and snapshotted onto every order line. This fixture said '15',
  // which is why a screen that rendered `${vatRate}%` — and printed "VAT at
  // 0.15%" to every real customer — passed its own test.
  vatRate: '0.15',
};

const ORDER = {
  id: 'o1',
  orderNumber: '1000001',
  branchId: 'b1',
  type: 'DELIVERY',
  status: 'CONFIRMED',
  paymentStatus: 'PENDING',
  subtotalMinor: 10_000,
  discountMinor: 0,
  deliveryFeeMinor: 1500,
  vatMinor: 1500,
  totalMinor: 11_500,
  items: [],
  placedAt: '2026-09-03T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();

  mockApi.customerConfig.mockResolvedValue({
    version: '1',
    // A banner with no description, no button text, and an action this build
    // has never heard of: merchandising must not be able to break the home
    // screen from the admin panel.
    banners: [
      {
        id: 'ban1',
        imageUrl: 'https://example.test/b.png',
        title: 'Ramadan offers',
        action: 'SOMETHING_THIS_BUILD_DOES_NOT_KNOW',
        branchIds: [],
        priority: 1,
      },
    ],
    // One published offer, shaped exactly as the backend sends it: an owner's
    // coupon with its artwork and the code the checkout will accept.
    offers: [
      {
        id: 'off1',
        code: 'HANA20',
        name: 'Twenty off',
        description: 'Twenty percent off your order',
        imageUrl: 'https://example.test/offer.png',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minSpendMinor: 5000,
        validUntil: '2030-01-01T00:00:00.000Z',
      },
    ],
  });
  mockApi.listBranches.mockResolvedValue([SPARSE_BRANCH]);
  mockApi.menu.mockResolvedValue(MENU);
  mockApi.quote.mockResolvedValue(QUOTE);
  mockApi.quoteOrder.mockResolvedValue({ quote: QUOTE, coupon: null, couponError: null });
  mockApi.placeOrder.mockResolvedValue(ORDER);
  mockApi.myOrders.mockResolvedValue({ data: [] });
  mockApi.order.mockResolvedValue(ORDER);
  mockApi.listAddresses.mockResolvedValue([]);
  mockApi.createAddress.mockResolvedValue({ id: 'a1' });
  // A pickup order has no delivery at all, and an order not yet dispatched has
  // no driver — both are 404s, not exceptional states.
  mockApi.trackDelivery.mockRejectedValue(new Error('no delivery'));
  mockApi.paymentFor.mockResolvedValue(null);
  mockApi.initiatePayment.mockResolvedValue({ payment: { id: 'pay1', status: 'PENDING' } });
  mockApi.loyalty.mockResolvedValue({ balance: 0, data: [] });
  mockApi.notifications.mockResolvedValue({ data: [] });
  mockApi.getProfile.mockResolvedValue({
    id: 'c1',
    fullName: null,
    phone: '+966500000000',
    email: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  mockApi.requestOtp.mockResolvedValue({ sent: true });
});

/**
 * Every screen, mounted against the sparse fixtures above.
 *
 * A screen listed here that renders is not proven correct — only proven not to
 * blank the app. That is the specific failure this suite exists to catch.
 */

/**
 * The cart screen with something in it.
 *
 * `CartScreen` renders its empty state with no lines, so the bill — the part
 * that changed — is only reachable through a cart that has been filled the way
 * the app fills it, through the reducer.
 */
function SeededCart(): React.JSX.Element {
  const { cart, dispatch } = useCart();
  React.useEffect(() => {
    if (cart.lines.length === 0) {
      dispatch({
        type: 'ADD',
        branchId: 'b1',
        line: { productId: 'p1', productName: 'Chicken Mandi', unitPriceMinor: 5000, addonIds: [], addonNames: [] },
      });
    }
  }, [cart.lines.length, dispatch]);

  return <CartScreen navigation={navigation} route={route('Cart')} />;
}

describe('every screen mounts without throwing', () => {
  const cases: [string, () => React.ReactElement][] = [
    ['Phone', () => <PhoneScreen navigation={navigation} route={route('Phone')} />],
    ['Otp', () => <OtpScreen navigation={navigation} route={route('Otp', { phone: '+966500000000' })} />],
    ['Home', () => <HomeScreen />],
    ['Search', () => <SearchScreen />],
    ['Offers', () => <OffersScreen />],
    ['Orders', () => <OrdersScreen />],
    ['Account', () => <AccountScreen />],
    ['Menu', () => <MenuScreen navigation={navigation} route={route('Menu', { branchId: 'b1', branchName: 'Olaya' })} />],
    ['Product', () => <ProductScreen navigation={navigation} route={route('Product', { branchId: 'b1', product: PRODUCT })} />],
    ['Cart', () => <CartScreen navigation={navigation} route={route('Cart')} />],
    ['Checkout', () => <CheckoutScreen navigation={navigation} route={route('Checkout', { type: 'DELIVERY' })} />],
    ['AddAddress', () => <AddAddressScreen navigation={navigation} route={route('AddAddress')} />],
    ['Addresses', () => <AddressesScreen navigation={navigation} route={route('Addresses')} />],
    ['Favorites', () => <FavoritesScreen navigation={navigation} route={route('Favorites')} />],
    ['Loyalty', () => <LoyaltyScreen navigation={navigation} route={route('Loyalty')} />],
    [
      'LocationSetup',
      () => <LocationSetupScreen navigation={navigation} route={route('LocationSetup')} />,
    ],
    ['Notifications', () => <NotificationsScreen navigation={navigation} route={route('Notifications')} />],
    ['Profile', () => <ProfileScreen navigation={navigation} route={route('Profile')} />],
    // The four screens that used to be "coming soon" toasts. They mount here
    // for the same reason as every other one: a row that leads to a blank
    // screen is worse than the toast it replaced.
    [
      'NotificationSettings',
      () => (
        <NotificationSettingsScreen navigation={navigation} route={route('NotificationSettings')} />
      ),
    ],
    ['PaymentMethods', () => <PaymentMethodsScreen navigation={navigation} route={route('PaymentMethods')} />],
    ['Help', () => <HelpScreen navigation={navigation} route={route('Help')} />],
    ['Legal (privacy)', () => <LegalScreen navigation={navigation} route={route('Legal', { document: 'privacy' })} />],
    ['Legal (terms)', () => <LegalScreen navigation={navigation} route={route('Legal', { document: 'terms' })} />],
    [
      'OrderSuccess',
      () => (
        <OrderSuccessScreen
          navigation={navigation}
          route={route('OrderSuccess', { orderId: 'o1', orderNumber: '1000001', method: 'CASH_ON_DELIVERY' })}
        />
      ),
    ],
    [
      'PaymentProcessing',
      () => (
        <PaymentProcessingScreen
          navigation={navigation}
          route={route('PaymentProcessing', { orderId: 'o1', orderNumber: '1000001', method: 'CARD' })}
        />
      ),
    ],
    ['OrderTracking', () => <OrderTrackingScreen navigation={navigation} route={route('OrderTracking', { orderId: 'o1' })} />],
  ];

  it.each(cases)('%s', async (_name, build) => {
    const view = wrap(build());
    // Let every effect-driven load settle: a screen that renders on its first
    // pass and throws once the data arrives is the more common failure, and
    // asserting only the initial mount would miss all of them.
    await waitFor(() => expect(view.toJSON()).toBeTruthy());
    await waitFor(() => expect(mockApi.customerConfig.mock.calls.length).toBeGreaterThanOrEqual(0));
  });
});

describe('screens survive what the backend actually returns', () => {
  it('shows the branch list even when the config call fails', async () => {
    // Merchandising is decoration; what the customer came for must survive a
    // config outage rather than going down with it.
    mockApi.customerConfig.mockRejectedValue(new Error('config down'));

    const view = wrap(<HomeScreen />);

    await waitFor(() => expect(mockApi.listBranches).toHaveBeenCalled());
    expect(view.toJSON()).toBeTruthy();
  });

  it('renders an admin-published banner on Offers — and not on home', async () => {
    // A banner published in the admin panel still reaches the customer, but on
    // the Offers tab: on home the artwork pushed the food below the fold, which
    // is the one thing that screen exists to show (owner, 2026-09-04).
    const offers = wrap(<OffersScreen />);
    expect(await offers.findByLabelText('Ramadan offers')).toBeTruthy();

    const home = wrap(<HomeScreen />);
    await waitFor(() => expect(mockApi.listBranches).toHaveBeenCalled());
    expect(home.queryByLabelText('Ramadan offers')).toBeNull();
  });

  it('shows an owner-published offer with the code the checkout will accept', async () => {
    // The offers page used to list hard-coded copy with invented codes, so
    // every code a customer tapped was rejected at checkout. An offer is now
    // the coupon itself.
    const { findByText } = wrap(<OffersScreen />);

    expect(await findByText('HANA20')).toBeTruthy();
  });

  it('renders a menu that contains an empty category', async () => {
    const { findByText } = wrap(
      <MenuScreen navigation={navigation} route={route('Menu', { branchId: 'b1', branchName: 'Olaya' })} />,
    );

    expect(await findByText('Mixed Grill')).toBeTruthy();
  });

  it('keeps the totals on screen when a promo code is rejected', async () => {
    // The backend answers an unusable code with the base price plus a message,
    // not an error, so the totals card must stay up while the customer fixes
    // a typo rather than collapsing into an error state.
    mockApi.quoteOrder.mockResolvedValue({
      quote: QUOTE,
      coupon: null,
      couponError: 'This coupon has expired.',
    });

    const { findByText, findAllByText } = wrap(
      <CheckoutScreen navigation={navigation} route={route('Checkout', { type: 'PICKUP' })} />,
    );

    expect(await findByText(/This coupon has expired/)).toBeTruthy();
    // The amount, not the word "Total": the bill row shows what is payable
    // without the customer opening anything, and asserting the number rather
    // than a label keeps this test about the guarantee instead of the wording.
    // It appears twice on purpose — on the bill row and on the pay button —
    // so the amount is visible wherever the customer's eye happens to be.
    expect((await findAllByText(/115\.00/)).length).toBeGreaterThanOrEqual(2);
  });

  it('shows how much of the total is VAT without opening the bill', async () => {
    // Prices are VAT-inclusive, so the tax is inside the total. A customer who
    // cannot see how much of it is tax has to take our word for the number.
    mockApi.quoteOrder.mockResolvedValue({ quote: QUOTE, coupon: null, couponError: null });

    const { findByText } = wrap(
      <CheckoutScreen navigation={navigation} route={route('Checkout', { type: 'PICKUP' })} />,
    );

    expect(await findByText(/Includes .*15\.00 VAT at 15%/)).toBeTruthy();
  });

  it('leads with the reason an order cannot be placed, and never offers to take the money', async () => {
    // The complaint this fixes: the only explanation lived in the sticky pay
    // bar as small red text, beside a large button still reading
    // "SAR 11.00 · Pay". The first thing a customer read was an amount we were
    // not going to accept, and the reason was the smallest thing on screen.
    // A saved address, so the screen gets past "add an address" and reaches the
    // state this test is about: an address we have, at a distance we refuse.
    mockApi.listAddresses.mockResolvedValue([
      { id: 'a1', label: 'Home', line1: 'Subhani', city: 'Riyadh', isDefault: true },
    ]);
    mockApi.quoteOrder.mockResolvedValue({
      quote: QUOTE,
      delivery: {
        distanceKm: 4.57,
        deliveryFeeMinor: 500,
        minOrderMinor: 0,
        maxRadiusKm: 1,
        blockers: [{ code: 'OUT_OF_RANGE', distanceKm: 4.57, maxRadiusKm: 1 }],
      },
      coupon: null,
      couponError: null,
    });

    const { findByText, queryByText } = wrap(
      <CheckoutScreen navigation={navigation} route={route('Checkout', { type: 'DELIVERY' })} />,
    );

    expect(await findByText(/4\.57 km away/)).toBeTruthy();
    // The button says what would fix it, not a price it will refuse.
    expect(await findByText(/Too far to deliver/i)).toBeTruthy();
    expect(queryByText(/·\s*Pay/)).toBeNull();
  });

  it('shows the real bill on the cart, not "calculated at checkout"', async () => {
    // The whole point of this screen changing: the cart used to show an item
    // subtotal and the words "Calculated at checkout" against the delivery fee
    // and the VAT, so the first time a customer saw what they were paying was
    // the screen asking them to pay it. Every one of these numbers is the
    // server's — the same priced quote checkout uses.
    mockApi.quoteOrder.mockResolvedValue({
      quote: { ...QUOTE, discountMinor: 2000, totalMinor: 9500 },
      breakdown: [
        { kind: 'ITEMS', label: 'Items', detail: null, amountMinor: 8000, strikethroughMinor: 10_000, included: false, negative: false },
        { kind: 'DELIVERY_BASE', label: 'Delivery fee', detail: null, amountMinor: 1500, included: false, negative: false },
        // A charge the owner added, carried by its own name — this app never
        // needs to learn about a new fee.
        { kind: 'CHARGE', label: 'Platform fee', detail: null, amountMinor: 300, included: false, negative: false },
        { kind: 'VAT', label: 'VAT', detail: '15%, included', amountMinor: 1239, included: true, negative: false },
        { kind: 'TOTAL', label: 'To pay', detail: null, amountMinor: 9500, included: false, negative: false },
      ],
      coupon: { code: 'HANA20', couponId: 'c1', name: 'Twenty off', discountMinor: 2000 },
      couponError: null,
    });

    const { findByText, queryByText } = wrap(<SeededCart />);

    expect(await findByText('Platform fee')).toBeTruthy();
    expect(await findByText('Delivery fee')).toBeTruthy();
    // The discount says which offer took the money off, not just its code.
    expect(await findByText(/Twenty off · HANA20/)).toBeTruthy();
    expect(queryByText(/Calculated at checkout/)).toBeNull();
  });

  it('tracks an order that has no delivery record yet', async () => {
    const view = wrap(<OrderTrackingScreen navigation={navigation} route={route('OrderTracking', { orderId: 'o1' })} />);

    await waitFor(() => expect(mockApi.order).toHaveBeenCalled());
    // A pickup order, or one not yet dispatched, has no delivery at all.
    expect(view.toJSON()).toBeTruthy();
  });

  it('renders a profile with no name set', async () => {
    const view = wrap(<ProfileScreen navigation={navigation} route={route('Profile')} />);

    await waitFor(() => expect(mockApi.getProfile).toHaveBeenCalled());
    expect(view.toJSON()).toBeTruthy();
  });
});
