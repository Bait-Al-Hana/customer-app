import { DarkTheme, DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAuth } from '../auth/AuthProvider';
import { withErrorBoundary } from '../components/ErrorBoundary';
import { useReducedMotion } from '../motion';
import { AuthStackParamList, RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { AddAddressScreen } from '../screens/AddAddressScreen';
import { AddressesScreen } from '../screens/AddressesScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { LoyaltyScreen } from '../screens/LoyaltyScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { PaymentProcessingScreen } from '../screens/PaymentProcessingScreen';
import { PhoneScreen } from '../screens/PhoneScreen';
import { ProductScreen } from '../screens/ProductScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme/theme';

/**
 * Every screen gets its own error boundary.
 *
 * React unmounts the entire tree on an uncaught render error, which on a
 * release build is a blank view the customer can only escape by force-quitting
 * — mid-order. Memoised per screen so the wrapper identity is stable and
 * navigation does not remount the screen on every render of this component.
 */
const guarded = new Map<string, React.ComponentType<never>>();
function guard<C>(name: string, Screen: C): C {
  const existing = guarded.get(name);
  if (existing) {
    return existing as C;
  }
  const wrapped = withErrorBoundary(name, Screen as never);
  guarded.set(name, wrapped as React.ComponentType<never>);
  return wrapped as C;
}

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

/** Maps the app theme onto React Navigation's container theme (avoids colour flashes). */
function navTheme(background: string, card: string, text: string, primary: string, border: string, dark: boolean): NavTheme {
  const base = dark ? DarkTheme : DefaultTheme;
  return { ...base, colors: { ...base.colors, background, card, text, primary, border } };
}

/**
 * The app's navigation.
 *
 * Two graphs, switched by auth state: the OTP flow when signed out, and the
 * signed-in root — a bottom-tab home (`Tabs`) plus the task flows that push
 * above the tabs (menu -> product -> cart -> checkout -> payment -> success ->
 * tracking). Screen transitions collapse to none under reduced motion.
 */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();

  const slide = reduceMotion ? 'none' : 'slide_from_right';
  const slideUp = reduceMotion ? 'none' : 'slide_from_bottom';
  const fade = reduceMotion ? 'none' : 'fade';

  return (
    <NavigationContainer
      theme={navTheme(
        theme.colors.background,
        theme.colors.surface,
        theme.colors.text,
        theme.colors.primary,
        theme.colors.border,
        theme.scheme === 'dark',
      )}
    >
      {!isAuthenticated ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: slide, contentStyle: { backgroundColor: theme.colors.background } }}>
          <AuthStack.Screen name="Phone" component={guard('Phone', PhoneScreen)} />
          <AuthStack.Screen name="Otp" component={guard('Otp', OtpScreen)} />
        </AuthStack.Navigator>
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false, animation: slide, contentStyle: { backgroundColor: theme.colors.background } }}>
          <RootStack.Screen name="Tabs" component={guard('Tabs', MainTabs)} />
          <RootStack.Screen name="Menu" component={guard('Menu', MenuScreen)} />
          <RootStack.Screen name="Product" component={guard('Product', ProductScreen)} options={{ animation: slideUp }} />
          <RootStack.Screen name="Cart" component={guard('Cart', CartScreen)} options={{ animation: slideUp }} />
          <RootStack.Screen name="Checkout" component={guard('Checkout', CheckoutScreen)} />
          <RootStack.Screen name="AddAddress" component={guard('AddAddress', AddAddressScreen)} options={{ animation: slideUp }} />
          <RootStack.Screen name="Addresses" component={guard('Addresses', AddressesScreen)} />
          <RootStack.Screen name="Favorites" component={guard('Favorites', FavoritesScreen)} />
          <RootStack.Screen name="Loyalty" component={guard('Loyalty', LoyaltyScreen)} />
          <RootStack.Screen name="OrderSuccess" component={guard('OrderSuccess', OrderSuccessScreen)} options={{ animation: slideUp, gestureEnabled: false }} />
          <RootStack.Screen name="PaymentProcessing" component={guard('PaymentProcessing', PaymentProcessingScreen)} options={{ animation: fade, gestureEnabled: false }} />
          <RootStack.Screen name="OrderTracking" component={guard('OrderTracking', OrderTrackingScreen)} />
          <RootStack.Screen name="Notifications" component={guard('Notifications', NotificationsScreen)} />
          <RootStack.Screen name="Profile" component={guard('Profile', ProfileScreen)} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
