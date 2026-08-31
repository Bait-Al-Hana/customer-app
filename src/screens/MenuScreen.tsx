import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { useAsync } from '../hooks/useAsync';
import {
  CartBadge,
  EmptyState,
  ErrorState,
  FloatingBar,
  MotiCard,
  PressableScale,
  Ripple,
  ScrollFadeHeader,
  SectionTitle,
  Shimmer,
  SlideIn,
  Stagger,
} from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';
import type { MenuProduct } from '../api/types';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, count, dispatch } = useCart();
  const { branchId, branchName } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.menu(branchId), [branchId]);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const add = (product: MenuProduct): void => {
    dispatch({
      type: 'ADD',
      branchId,
      line: {
        productId: product.id,
        productName: product.name,
        unitPriceMinor: product.priceMinor,
        addonIds: [],
        addonNames: [],
      },
    });
  };

  const cartButton = (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="View cart"
      onPress={() => navigation.navigate('Cart')}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 20 }}>🛒</Text>
      <View style={{ position: 'absolute', top: -4, right: -6 }}>
        <CartBadge count={count} />
      </View>
    </PressableScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollFadeHeader
        title={branchName}
        subtitle="Browse the menu"
        scrollY={scrollY}
        onBack={() => navigation.goBack()}
        right={cartButton}
      />

      {loading ? (
        <View style={{ padding: 20, gap: 14 }}>
          <Shimmer height={24} width="40%" radius={theme.radius.sm} />
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} height={88} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load the menu" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : !data || data.categories.length === 0 ? (
        <EmptyState title="Menu is empty" message="This branch has nothing available right now." />
      ) : (
        <AnimatedScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: count > 0 ? 110 : 32,
          }}
        >
          {data.categories.map((category, ci) => (
            <View key={category.id} style={{ marginBottom: 28 }}>
              <SectionTitle title={category.name} delay={ci * 60} />

              <Stagger step={50}>
                {category.products.map((product, pi) => (
                  <View key={product.id} style={{ marginBottom: 10 }}>
                    <MotiCard delay={ci * 60 + pi * 40} from="left">
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: theme.radius.md,
                            backgroundColor: theme.colors.surfaceAlt,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 14,
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>🍽️</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                            {product.name}
                          </Text>
                          {product.description ? (
                            <Text
                              style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 }}
                              numberOfLines={2}
                            >
                              {product.description}
                            </Text>
                          ) : null}
                          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 15, marginTop: 6 }}>
                            {formatSar(product.priceMinor)}
                          </Text>
                        </View>

                        <Ripple
                          onPress={() => add(product)}
                          style={{
                            backgroundColor: theme.colors.primary,
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: theme.colors.primary,
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 3,
                          }}
                        >
                          <Text style={{ color: theme.colors.onPrimary, fontSize: 26, fontWeight: '700', marginTop: -2 }}>+</Text>
                        </Ripple>
                      </View>
                    </MotiCard>
                  </View>
                ))}
              </Stagger>
            </View>
          ))}
        </AnimatedScrollView>
      )}

      <FloatingBar visible={count > 0 && cart.branchId === branchId}>
        <SlideIn direction="up" distance={30}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => navigation.navigate('Cart')}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.pill,
                paddingVertical: 16,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: theme.colors.primary,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 14 }}>{count}</Text>
                </View>
                <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>View cart</Text>
              </View>
              <Text style={{ color: theme.colors.onPrimary, fontSize: 18 }}>→</Text>
            </PressableScale>
          </View>
        </SlideIn>
      </FloatingBar>
    </View>
  );
}
