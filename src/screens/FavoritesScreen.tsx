import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, FoodListItem, Screen } from '../components';
import { useFavorites } from '../favorites/FavoritesProvider';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import type { Branch } from '../api/types';

/** Favorites: the customer's saved items, ready to add to a cart. */
export function FavoritesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Favorites'>): React.JSX.Element {
  const { api } = useAuth();
  const { dispatch } = useCart();
  const favorites = useFavorites();
  const [toast, setToast] = useState<string | null>(null);

  // Favorites can span branches; to add one we need a branch to attach the cart
  // to. Use the first open branch as the target, and tell the customer.
  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);
  const targetBranch = (branchesReq.data ?? []).find((b) => b.isAcceptingOrders) ?? branchesReq.data?.[0] ?? null;

  const add = (id: string): void => {
    const item = favorites.items.find((i) => i.id === id);
    if (!item || !targetBranch) {
      return;
    }
    dispatch({
      type: 'ADD',
      branchId: targetBranch.id,
      line: { productId: item.id, productName: item.name, unitPriceMinor: item.priceMinor, addonIds: [], addonNames: [] },
    });
    setToast(`${item.name} added to cart`);
  };

  return (
    <Screen title="Favorites" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />
      {favorites.items.length === 0 ? (
        <EmptyState
          glyph="❤️"
          title="No favorites yet"
          message="Tap the heart on any dish to save it here for quick reordering."
          actionLabel="Browse menu"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
          {favorites.items.map((item) => (
            <FoodListItem
              key={item.id}
              data={item}
              onPress={() => add(item.id)}
              onAdd={() => add(item.id)}
              favorite
              onToggleFavorite={() => favorites.remove(item.id)}
            />
          ))}
          <AppText variant="caption" color="textMuted" center style={{ marginTop: 4 }}>
            Adding a favorite starts a cart at your nearest open branch.
          </AppText>
        </ScrollView>
      )}
    </Screen>
  );
}
