import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { Card, Screen } from '../components/ui';
import { offerCondition, offerHeadline } from '../features/offers/offer';
import { filterMenu, isNoMatch } from '../features/menu/menu-search';
import { useAsync } from '../hooks/useAsync';
import { CartBadge, EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';
import type { MenuProduct, Offer } from '../api/types';

/** A branch menu: search, jump to a section, see offers, and add to cart. */
export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, count, dispatch } = useCart();
  const { branchId, branchName } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.menu(branchId), [branchId]);
  // Offers are a nicety on top of the menu: a failure here must never block
  // ordering, so it is loaded separately and simply absent when it fails.
  const offersState = useAsync(() => api.customerConfig(), []);
  const offers = offersState.data?.offers ?? [];

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const categories = useMemo(() => filterMenu(data?.categories ?? [], query), [data, query]);
  const noMatch = isNoMatch(categories, query);

  const add = (product: MenuProduct): void => {
    if (!product.isAvailable) {
      return;
    }
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

  const applyOffer = (offer: Offer): void => {
    dispatch({ type: 'APPLY_COUPON', code: offer.code });
    setToast(`Code ${offer.code} applied — see it at checkout`);
  };

  const jumpTo = (categoryId: string): void => {
    const y = offsets.current[categoryId];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
  };

  const cartButton = (
    <PressableScale accessibilityRole="button" accessibilityLabel="View cart" onPress={() => navigation.navigate('Cart')}>
      <View>
        <Text style={{ fontSize: 24 }}>🛒</Text>
        <View style={{ position: 'absolute', top: -6, right: -10 }}>
          <CartBadge count={count} />
        </View>
      </View>
    </PressableScale>
  );

  return (
    <Screen title={branchName} onBack={() => navigation.goBack()} right={cartButton}>
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={theme.radius.md} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load the menu" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : !data || data.categories.length === 0 ? (
        <EmptyState title="Menu is empty" message="This branch has nothing available right now." />
      ) : (
        <>
          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>🔍</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search the menu"
                placeholderTextColor={theme.colors.textMuted}
                accessibilityLabel="Search the menu"
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 16, color: theme.colors.text }}
              />
              {query.length > 0 ? (
                <PressableScale accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={{ padding: 4 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>✕</Text>
                </PressableScale>
              ) : null}
            </View>
          </View>

          {/* Category chips — jump to a section. Hidden while searching. */}
          {query.length === 0 && data.categories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}
            >
              {data.categories.map((category) => (
                <PressableScale
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${category.name}`}
                  onPress={() => jumpTo(category.id)}
                  style={{
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.pill,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>{category.name}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          ) : null}

          {noMatch ? (
            <EmptyState title="No matches" message={`Nothing on the menu matches “${query.trim()}”.`} glyph="🔍" />
          ) : (
            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: count > 0 ? 96 : 24 }}>
              {/* Offers strip — only on the full menu, not mid-search. */}
              {query.length === 0 && offers.length > 0 ? (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Offers</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {offers.map((offer) => {
                      const condition = offerCondition(offer);
                      const applied = cart.couponCode === offer.code;
                      return (
                        <PressableScale
                          key={offer.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Apply offer ${offer.name}, ${offerHeadline(offer)}`}
                          onPress={() => applyOffer(offer)}
                          style={{
                            width: 220,
                            backgroundColor: theme.colors.surface,
                            borderWidth: 1,
                            borderColor: applied ? theme.colors.primary : theme.colors.border,
                            borderRadius: theme.radius.lg,
                            padding: 14,
                          }}
                        >
                          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 16 }}>{offerHeadline(offer)}</Text>
                          <Text style={{ color: theme.colors.text, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
                            {offer.name}
                          </Text>
                          {condition ? (
                            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                              {condition}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                            <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm, paddingVertical: 4, paddingHorizontal: 8 }}>
                              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{offer.code}</Text>
                            </View>
                            <Text style={{ color: applied ? theme.colors.success : theme.colors.accent, fontWeight: '700', fontSize: 12 }}>
                              {applied ? '✓ Applied' : 'Tap to apply'}
                            </Text>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {categories.map((category) => (
                <View
                  key={category.id}
                  style={{ marginBottom: 20 }}
                  onLayout={(e) => {
                    offsets.current[category.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
                    {category.name}
                  </Text>
                  <View style={{ gap: 10 }}>
                    {category.products.map((product) => {
                      const soldOut = !product.isAvailable;
                      return (
                        <Card key={product.id} style={soldOut ? { opacity: 0.6 } : undefined}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{product.name}</Text>
                                {soldOut ? (
                                  <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm, paddingVertical: 2, paddingHorizontal: 8 }}>
                                    <Text style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '800' }}>Sold out</Text>
                                  </View>
                                ) : null}
                              </View>
                              {product.description ? (
                                <Text style={{ color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                                  {product.description}
                                </Text>
                              ) : null}
                              <Text style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 6 }}>
                                {formatSar(product.priceMinor)}
                              </Text>
                            </View>
                            <PressableScale
                              accessibilityRole="button"
                              accessibilityLabel={soldOut ? `${product.name} is sold out` : `Add ${product.name}`}
                              accessibilityState={{ disabled: soldOut }}
                              disabled={soldOut}
                              onPress={() => add(product)}
                              style={{
                                backgroundColor: soldOut ? theme.colors.border : theme.colors.primary,
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.colors.onPrimary, fontSize: 24, fontWeight: '700' }}>+</Text>
                            </PressableScale>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {count > 0 && cart.branchId === branchId ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20 }}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => navigation.navigate('Cart')}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>View cart</Text>
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>{count} item{count === 1 ? '' : 's'}</Text>
          </PressableScale>
        </View>
      ) : null}
    </Screen>
  );
}
