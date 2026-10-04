import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, Chip, FoodListItem, Screen } from '../components';
import { toFoodCard } from '../data/menu';
import { menuPriceMinor } from '../util/menuPrice';
import { useFavorites } from '../favorites/FavoritesProvider';
import { FloatingCart } from '../components/FloatingCart';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Shimmer, Stagger } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import type { MenuProduct } from '../api/types';

/** A branch menu: sticky category chips, grouped food list, tap-through to detail. */
export function MenuScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Menu'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, dispatch } = useCart();
  const favorites = useFavorites();
  const { branchId, branchName, categoryId } = route.params;
  const { data, loading, error, reload, refresh } = useAsync(() => api.menu(branchId), [branchId]);

  // Catch the menu up each time the customer opens or returns to this branch —
  // an owner who just changed a photo, price or availability sees it without
  // closing the app. `refresh` is silent: the current menu stays on screen
  // while it reloads, so returning never flashes skeletons. (Live push onto an
  // already-open screen would need a menu-change socket channel the backend
  // does not emit yet; this covers "without a manual reload".)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(categoryId ?? null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const shown = useMemo(() => {
    if (!activeCategory) {
      return categories;
    }
    return categories.filter((c) => c.id === activeCategory);
  }, [categories, activeCategory]);

  const add = (product: MenuProduct): void => {
    dispatch({
      type: 'ADD',
      branchId,
      line: {
        productId: product.id,
        productName: product.name,
        // The same price the card shows. A quick-add that stored the pickup
        // price would make the cart estimate disagree with the menu the
        // customer just read.
        unitPriceMinor: menuPriceMinor(product),
        addonIds: [],
        addonNames: [],
      },
    });
  };
  const openProduct = (product: MenuProduct): void => navigation.navigate('Product', { branchId, product });

  return (
    <Screen title={branchName} onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Shimmer height={24} width="40%" radius={theme.radius.sm} />
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} height={116} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load the menu" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : !data || categories.length === 0 ? (
        <EmptyState title="Menu is empty" message="This branch has nothing available right now." />
      ) : (
        <>
          {/* Sticky category chips */}
          <View style={{ paddingBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              <Chip label="All" selected={!activeCategory} onPress={() => setActiveCategory(null)} />
              {categories.map((c) => (
                <Chip key={c.id} label={c.name} selected={activeCategory === c.id} onPress={() => setActiveCategory(c.id)} />
              ))}
            </ScrollView>
          </View>

          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 140 }}>
            {shown.map((category) => (
              <View
                key={category.id}
                style={{ marginBottom: 24 }}
                onLayout={(e) => {
                  sectionOffsets.current[category.id] = e.nativeEvent.layout.y;
                }}
              >
                <AppText variant="h2" style={{ marginBottom: 12 }}>
                  {category.name}
                </AppText>
                <Stagger>
                  {category.products.map((product) => {
                    const card = toFoodCard(product);
                    return (
                      <View key={product.id} style={{ marginBottom: 10 }}>
                        <FoodListItem
                          data={card}
                          onPress={() => openProduct(product)}
                          onAdd={() => add(product)}
                          favorite={favorites.isFavorite(product.id)}
                          onToggleFavorite={() => favorites.toggle(card)}
                        />
                      </View>
                    );
                  })}
                </Stagger>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {cart.branchId === branchId ? <FloatingCart /> : null}
    </Screen>
  );
}
