import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CartProvider } from './src/cart/CartProvider';
import { FavoritesProvider } from './src/favorites/FavoritesProvider';
import { FulfilmentProvider } from './src/fulfilment/FulfilmentProvider';
import { LanguageProvider } from './src/i18n';
import { CartFlightProvider, MotionProvider } from './src/motion';
import { LaunchScreen } from './src/launch/LaunchScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RealtimeProvider } from './src/realtime/RealtimeProvider';

/**
 * App root.
 *
 * Providers nest in the order they must: gesture handler (top, for
 * gesture-driven animation), safe-area, motion (resolves reduce-motion once),
 * auth (owns the session + API client), cart, fulfilment (delivery vs pickup,
 * and which branch that means). The launch screen brands the
 * first moment, then hands off to the navigator, which shows the OTP flow when
 * signed out and the ordering flow when signed in.
 */
export default function App(): React.JSX.Element {
  const [launched, setLaunched] = useState(false);

  return (
    // Outermost, deliberately outside every provider: the motion, auth and
    // cart providers are among the things that can throw, and a boundary
    // nested inside them goes down with them. React unmounts the whole tree on
    // an uncaught render error, which in a release build is a blank view the
    // customer can only escape by force-quitting.
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {/* Above everything that renders copy: holds the chosen language, so
              one switch re-renders the whole app in Arabic (and flips text
              direction) at once. */}
          <LanguageProvider>
          <MotionProvider>
            {/* Owns the "fly into the cart" overlay; above the navigator so a
                dot launched from a menu card can travel to the cart bar. */}
            <CartFlightProvider>
            <AuthProvider>
              {/* Inside AuthProvider — it needs the session's token — and above
                  the navigator, so one socket serves every screen. */}
              <RealtimeProvider>
              <CartProvider>
                <FulfilmentProvider>
                <FavoritesProvider>
                  {/* Dark glyphs, because the app is pinned to the light
                      theme — "auto" would follow the OS and put white icons on
                      a cream background for anyone whose phone is in dark
                      mode. See src/theme/theme.ts. */}
                  <StatusBar style="dark" />
                  <RootNavigator />
                  {!launched ? <LaunchScreen onFinish={() => setLaunched(true)} /> : null}
                </FavoritesProvider>
                </FulfilmentProvider>
              </CartProvider>
              </RealtimeProvider>
            </AuthProvider>
            </CartFlightProvider>
          </MotionProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
