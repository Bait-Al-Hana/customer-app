import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useCart } from '../cart/CartProvider';
import { estimatedTotalMinor } from '../cart/cart';
import { useMotion, PressableScale } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';
import { AppText } from './AppText';
import { CartIcon } from './icons';

/**
 * A floating "view cart" bar that hovers above the tab bar whenever the cart has
 * items.
 *
 * Purpose: keep the cart one tap away from anywhere in the main app, and confirm
 * — the instant something is added — that the order is building. It springs up
 * when the first item lands and drops away when the cart empties; under reduced
 * motion it simply appears/disappears. It shows the live count and the local
 * estimated total (the server quote remains authoritative at checkout).
 */
export function FloatingCart({ bottomOffset = 0 }: { bottomOffset?: number }): React.JSX.Element | null {
  const theme = useTheme();
  const { spring, reduceMotion } = useMotion();
  const { cart, count } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const shown = count > 0;
  const progress = useSharedValue(shown ? 1 : 0);
  // A little bump each time the count grows — the moment the flying mark lands.
  const bump = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    progress.value = reduceMotion ? (shown ? 1 : 0) : withSpring(shown ? 1 : 0, spring('standard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useEffect(() => {
    if (!reduceMotion && count > prevCount.current) {
      bump.value = withSequence(withSpring(1.06, spring('emphasized')), withSpring(1, spring('soft')));
    }
    prevCount.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : withTiming(progress.value, { duration: 120 }),
    transform: [{ translateY: (1 - progress.value) * 80 }, { scale: bump.value }],
  }));

  if (count === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 16, right: 16, bottom: bottomOffset + 12 },
        style,
      ]}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${count} item${count === 1 ? '' : 's'}, estimated ${formatSar(estimatedTotalMinor(cart))}`}
        onPress={() => navigation.navigate('Cart')}
        style={[
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          },
          theme.shadow(2),
        ]}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="caption" weight="800" style={{ color: '#fff' }}>
            {count}
          </AppText>
        </View>
        <AppText variant="button" style={{ color: '#fff', flex: 1 }}>
          View cart
        </AppText>
        <AppText variant="button" style={{ color: '#fff' }}>
          {formatSar(estimatedTotalMinor(cart))}
        </AppText>
        <CartIcon color="#fff" size={20} />
      </PressableScale>
    </Animated.View>
  );
}
