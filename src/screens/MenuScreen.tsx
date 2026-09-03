import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { CartBadge, EmptyState, ErrorState, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { countProducts, filterMenu } from '../util/menu-search';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';
import type { MenuProduct } from '../api/types';

/** A branch menu: browse categories/products and add to cart. */
export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, count, dispatch } = useCart();
  const { branchId, branchName } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.menu(branchId), [branchId]);
  const [query, setQuery] = useState('');

  // Filtering is a pure function over the loaded menu — no refetch per keystroke.
  const categories = useMemo(() => filterMenu(data?.categories ?? [], query), [data, query]);
  const searching = query.trim().length > 0;

  const add = (product: MenuProduct): void => {
    // The button is hidden for a sold-out item, but the guard is the rule —
    // a disabled control is only an affordance.
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
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: count > 0 ? 96 : 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              paddingHorizontal: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔎</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search the menu"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Search the menu"
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 12, color: theme.colors.text, fontSize: 15 }}
            />
            {searching ? (
              <PressableScale accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 18, paddingHorizontal: 4 }}>✕</Text>
              </PressableScale>
            ) : null}
          </View>

          {searching ? (
            <Text style={{ color: theme.colors.textMuted, marginBottom: 10 }}>
              {countProducts(categories)} result{countProducts(categories) === 1 ? '' : 's'} for “{query.trim()}”
            </Text>
          ) : null}

          {searching && categories.length === 0 ? (
            <EmptyState title="Nothing matched" message={`No dishes match “${query.trim()}”.`} />
          ) : null}

          {categories.map((category) => (
            <View key={category.id} style={{ marginBottom: 20 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
                {category.name}
              </Text>
              <View style={{ gap: 10 }}>
                {category.products.map((product) => (
                  // A sold-out item stays on the menu, dimmed and marked, so the
                  // customer can see the restaurant does make it — it just
                  // cannot be added, rather than being refused at checkout.
                  <Card key={product.id} style={{ opacity: product.isAvailable ? 1 : 0.5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{product.name}</Text>
                        {product.description ? (
                          <Text style={{ color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                            {product.description}
                          </Text>
                        ) : null}
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 6 }}>
                          {formatSar(product.priceMinor)}
                        </Text>
                      </View>
                      {product.isAvailable ? (
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${product.name}`}
                          onPress={() => add(product)}
                          style={{
                            backgroundColor: theme.colors.primary,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: theme.colors.onPrimary, fontSize: 24, fontWeight: '700' }}>+</Text>
                        </PressableScale>
                      ) : (
                        <View
                          accessible
                          accessibilityLabel={`${product.name} is sold out`}
                          style={{
                            backgroundColor: theme.colors.surfaceAlt,
                            borderRadius: theme.radius.pill,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                          }}
                        >
                          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                            Sold out
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
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
