import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, Chip, FoodListItem, Screen, SearchBar, SectionHeader } from '../components';
import { POPULAR_SEARCHES } from '../data/content';
import { flattenProducts, toFoodCard } from '../data/menu';
import { useFavorites } from '../favorites/FavoritesProvider';
import { useLanguage } from '../i18n';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import type { Branch, MenuProduct } from '../api/types';
import { useTheme } from '../theme/theme';

const RECENTS_LIMIT = 6;

/** Search: fast client-side filtering over the current branch menu. */
export function SearchScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dispatch } = useCart();
  const favorites = useFavorites();
  const { t, tn } = useLanguage();

  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  const branchesReq = useAsync<Branch[]>(() => api.listBranches(), []);
  const branch = useMemo(() => {
    const list = branchesReq.data ?? [];
    return list.find((b) => b.isAcceptingOrders) ?? list[0] ?? null;
  }, [branchesReq.data]);
  const menuReq = useAsync(() => (branch ? api.menu(branch.id) : Promise.resolve(null)), [branch?.id]);

  const all = useMemo(() => flattenProducts(menuReq.data), [menuReq.data]);
  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (trimmed.length === 0) {
      return [];
    }
    return all.filter(
      (f) =>
        f.product.name.toLowerCase().includes(trimmed) ||
        (f.product.nameAr ?? '').toLowerCase().includes(trimmed) ||
        (f.product.description ?? '').toLowerCase().includes(trimmed) ||
        f.categoryName.toLowerCase().includes(trimmed),
    );
  }, [all, trimmed]);

  const remember = (term: string): void => {
    const t = term.trim();
    if (t.length === 0) {
      return;
    }
    setRecents((prev) => [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENTS_LIMIT));
  };

  const runSearch = (term: string): void => {
    setQuery(term);
    remember(term);
  };

  const addToCart = (product: MenuProduct): void => {
    if (!branch) {
      return;
    }
    dispatch({
      type: 'ADD',
      branchId: branch.id,
      line: { productId: product.id, productName: product.name, unitPriceMinor: product.priceMinor, addonIds: [], addonNames: [] },
    });
  };
  const openProduct = (product: MenuProduct): void => {
    if (branch) {
      remember(query);
      nav.navigate('Product', { branchId: branch.id, product });
    }
  };

  const categories = menuReq.data?.categories ?? [];

  return (
    <Screen title={t('tab.search')}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <SearchBar value={query} onChangeText={setQuery} autoFocus onClear={() => setQuery('')} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 140 }}>
        {trimmed.length === 0 ? (
          <>
            {recents.length > 0 ? (
              <View style={{ marginBottom: 24 }}>
                <SectionHeader title="Recent searches" actionLabel="Clear" onAction={() => setRecents([])} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {recents.map((r) => (
                    <Chip key={r} label={r} onPress={() => runSearch(r)} />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Popular searches" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR_SEARCHES.map((p) => (
                  <Chip key={p} label={p} onPress={() => runSearch(p)} />
                ))}
              </View>
            </View>

            {categories.length > 0 ? (
              <View>
                <SectionHeader title="Browse categories" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((c) => {
                    const label = tn(c.name, c.nameAr);
                    return <Chip key={c.id} label={label} onPress={() => runSearch(label)} />;
                  })}
                </View>
              </View>
            ) : null}
          </>
        ) : menuReq.loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={116} radius={theme.radius.lg} />
            ))}
          </View>
        ) : results.length === 0 ? (
          <EmptyState
            glyph="🔍"
            title={`No results for “${query.trim()}”`}
            message="Try a different dish, category or spelling."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <AppText variant="caption" color="textMuted" style={{ marginBottom: 2 }}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </AppText>
            {results.map((f) => {
              const card = toFoodCard(f.product, undefined, tn);
              return (
                <FoodListItem
                  key={f.product.id}
                  data={card}
                  onPress={() => openProduct(f.product)}
                  onAdd={() => addToCart(f.product)}
                  favorite={favorites.isFavorite(f.product.id)}
                  onToggleFavorite={() => favorites.toggle(card)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
