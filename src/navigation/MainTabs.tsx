import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingCart } from '../components/FloatingCart';
import { AccountScreen } from '../screens/AccountScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { MainTabParamList } from './types';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Approx. tab-bar content height (excludes the bottom safe-area inset). */
const TAB_CONTENT_HEIGHT = 58;

/**
 * The signed-in home: a five-tab bar (Home / Search / Orders / Offers / Account)
 * with the floating cart hovering just above it. Task flows (menu, product,
 * cart, checkout, tracking) push above this from the root stack, so they cover
 * the tab bar as focused full-screen steps.
 */
export function MainTabs(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen name="Offers" component={OffersScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
      <FloatingCart bottomOffset={TAB_CONTENT_HEIGHT + insets.bottom} />
    </View>
  );
}
