import { DarkTheme, DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAuth } from '../auth/AuthProvider';
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
          <AuthStack.Screen name="Phone" component={PhoneScreen} />
          <AuthStack.Screen name="Otp" component={OtpScreen} />
        </AuthStack.Navigator>
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false, animation: slide, contentStyle: { backgroundColor: theme.colors.background } }}>
          <RootStack.Screen name="Tabs" component={MainTabs} />
          <RootStack.Screen name="Menu" component={MenuScreen} />
          <RootStack.Screen name="Product" component={ProductScreen} options={{ animation: slideUp }} />
          <RootStack.Screen name="Cart" component={CartScreen} options={{ animation: slideUp }} />
          <RootStack.Screen name="Checkout" component={CheckoutScreen} />
          <RootStack.Screen name="AddAddress" component={AddAddressScreen} options={{ animation: slideUp }} />
          <RootStack.Screen name="Addresses" component={AddressesScreen} />
          <RootStack.Screen name="Favorites" component={FavoritesScreen} />
          <RootStack.Screen name="Loyalty" component={LoyaltyScreen} />
          <RootStack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ animation: slideUp, gestureEnabled: false }} />
          <RootStack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} options={{ animation: fade, gestureEnabled: false }} />
          <RootStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          <RootStack.Screen name="Profile" component={ProfileScreen} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
