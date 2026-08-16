import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MotionProvider } from './src/motion';
import { LaunchScreen } from './src/launch/LaunchScreen';
import { MotionDemoScreen } from './src/demo/MotionDemoScreen';

/**
 * App root.
 *
 * Wires the providers every screen depends on, in the order they must nest:
 *   - GestureHandlerRootView — required at the very top for gesture-driven
 *     animations (bottom sheets, swipes) to work on a real device.
 *   - SafeAreaProvider — notch/inset-aware layout.
 *   - MotionProvider — resolves reduce-motion once and exposes the motion tokens.
 *
 * The launch screen brands the first moment and then hands off to the app. The
 * single content screen is the motion demo for now; product screens (auth,
 * menu, cart, checkout, tracking) slot in under a navigator in the next phase.
 */
export default function App(): React.JSX.Element {
  const [launched, setLaunched] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MotionProvider>
          <StatusBar style="auto" />
          <MotionDemoScreen />
          {!launched ? <LaunchScreen onFinish={() => setLaunched(true)} /> : null}
        </MotionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
