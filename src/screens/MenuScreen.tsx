import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { CartBadge, EmptyState, ErrorState, FloatAway, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { hapticLight } from '../util/haptics';
import { useTheme } from '../theme/theme';
import type { MenuProduct } from '../api/types';

/** True if a product matches the search query (name, Arabic name or description). */
function productMatches(product: MenuProduct, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [product.name, product.nameAr, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

/** A branch menu: browse categories/products, search, and add to cart. */
export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, count, dispatch } = useCart();
  const { branchId, branchName } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.menu(branchId), [branchId]);

  const [search, setSearch] = useState('');
  // Per-product burst counters drive the "+1" float on add-to-cart.
  const [bursts, setBursts] = useState<Record<string, number>>({});

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
    setBursts((b) => ({ ...b, [product.id]: (b[product.id] ?? 0) + 1 }));
    hapticLight();
  };

  // The menu title: the name we were handed, else the one the menu returns
  // (so "Order again" can navigate with only a branch id), else a safe default.
  const title = branchName ?? data?.branch.name ?? 'Menu';

  const query = search.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!data) {
      return [];
    }
    if (!query) {
      return data.categories;
    }
    return data.categories
      .map((category) => ({
        ...category,
        products: category.products.filter((p) => productMatches(p, query)),
      }))
      .filter((category) => category.products.length > 0);
  }, [data, query]);

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

  const searchBox = (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search the menu"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Search the menu"
        clearButtonMode="while-editing"
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 15,
          color: theme.colors.text,
        }}
      />
    </View>
  );

  return (
    <Screen title={title} onBack={() => navigation.goBack()} right={cartButton}>
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
          {searchBox}
          {filteredCategories.length === 0 ? (
            <EmptyState
              title="No matches"
              message={`Nothing on the menu matches “${search.trim()}”.`}
            />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: count > 0 ? 96 : 24 }}
            >
              {filteredCategories.map((category) => (
                <View key={category.id} style={{ marginBottom: 20 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
                    {category.name}
                  </Text>
                  <View style={{ gap: 10 }}>
                    {category.products.map((product) => (
                      <Card key={product.id}>
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
                          <View style={{ position: 'relative' }}>
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
                            <FloatAway trigger={bursts[product.id] ?? 0} style={{ top: -12, left: 0, right: 0 }} />
                          </View>
                        </View>
                      </Card>
                    ))}
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
