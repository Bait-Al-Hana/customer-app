import { MenuProduct } from '../api/types';
import { OrderType, PaymentMethod } from '../types/backend';

/**
 * The app's navigation contract — one source of truth for navigation typing.
 *
 * Two graphs, switched by auth state:
 *  - `AuthStackParamList` while signed out (phone → OTP).
 *  - `RootStackParamList` while signed in: a bottom-tab home (`Tabs`) plus the
 *    task flows that push *above* the tab bar (menu, product, cart, checkout,
 *    payment, tracking) so each is a focused full-screen step.
 */

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string };
};

/** The five primary destinations in the bottom tab bar. */
export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Orders: undefined;
  Offers: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: { screen?: keyof MainTabParamList } | undefined;
  Menu: { branchId: string; branchName: string; categoryId?: string };
  Product: { branchId: string; product: MenuProduct };
  Cart: undefined;
  Checkout: { type: OrderType };
  /**
   * Asked once after sign-in. Optional coordinates carry a pin whose written
   * address could not be read, so the customer supplies only the words.
   */
  LocationSetup: undefined;
  AddAddress: { latitude?: number; longitude?: number } | undefined;
  Addresses: undefined;
  Favorites: undefined;
  Loyalty: undefined;
  OrderSuccess: { orderId: string; orderNumber: string; method: PaymentMethod };
  PaymentProcessing: { orderId: string; orderNumber: string; method: PaymentMethod };
  OrderTracking: { orderId: string };
  Notifications: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  /** Account deletion — required in-app by Apple Guideline 5.1.1(v). */
  DeleteAccount: undefined;
  PaymentMethods: undefined;
  Help: undefined;
  /** The privacy notice or the terms — same screen, different document. */
  Legal: { document: 'privacy' | 'terms' };
};
