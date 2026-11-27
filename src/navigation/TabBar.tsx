import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { HomeIcon, IconProps, ReceiptIcon, SearchIcon, TagIcon, UserIcon } from '../components/icons';
import { useLanguage } from '../i18n';
import type { StringKey } from '../i18n';
import { useMotion, PressableScale } from '../motion';
import { useTheme } from '../theme/theme';
import { MainTabParamList } from './types';

const ICONS: Record<keyof MainTabParamList, (p: IconProps) => React.JSX.Element> = {
  Home: HomeIcon,
  Search: SearchIcon,
  Orders: ReceiptIcon,
  Offers: TagIcon,
  Account: UserIcon,
};

const LABEL_KEYS: Record<keyof MainTabParamList, StringKey> = {
  Home: 'tab.home',
  Search: 'tab.search',
  Orders: 'tab.orders',
  Offers: 'tab.offers',
  Account: 'tab.account',
};

/**
 * The app's bottom tab bar.
 *
 * A brand-styled bar with a single indicator pill that springs to the active
 * tab, and icons that fill when focused. Motion is limited to the indicator and
 * a press-scale — no per-tab decoration — and collapses to an instant move under
 * reduced motion (the spring settles in a frame), so focus is always clear
 * without relying on animation. Labels are always shown, and colour is never the
 * only cue (the icon also fills), for accessibility.
 */
export function TabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useLanguage();
  const { spring } = useMotion();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const itemWidth = barWidth / state.routes.length;
  const indicatorX = useSharedValue(0);

  React.useEffect(() => {
    if (itemWidth > 0) {
      indicatorX.value = withSpring(state.index * itemWidth, spring('standard'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, itemWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        theme.shadow(2),
      ]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* The moving indicator pill, centred over the active tab. */}
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, left: 0, width: itemWidth, alignItems: 'center' },
            indicatorStyle,
          ]}
        >
          <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: theme.colors.primary }} />
        </Animated.View>
      ) : null}

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const name = route.name as keyof MainTabParamList;
        const Icon = ICONS[name];
        const label = t(LABEL_KEYS[name]);
        const color = focused ? theme.colors.primary : theme.colors.textMuted;

        const onPress = (): void => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <PressableScale
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 }}
          >
            <Icon color={color} size={24} filled={focused} />
            <AppText variant="caption" weight={focused ? '700' : '500'} style={{ color, fontSize: 11 }}>
              {label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}
