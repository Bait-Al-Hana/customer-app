import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, Card, CategoryCard, FoodCard, PromoBanner, Screen, SearchBar, SectionHeader } from '../components';
import { BellIcon, ChevronRight, PinIcon } from '../components/icons';
import { PROMO_BANNERS, OFFERS } from '../data/content';
import { glyphFor } from '../components/FoodImage';
import { GradientSurface } from '../components/GradientSurface';
import { popularProducts, recommendedProducts, toFoodCard } from '../data/menu';
import { useFavorites } from '../favorites/FavoritesProvider';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { Address, Branch, MenuProduct } from '../api/types';
import { useTheme } from '../theme/theme';

/** The home screen: find food fast — search, promos, categories and curated rails. */
export function HomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<BottomTabScreenProps<MainTabParamList>['navigation']>();
  const { cart, dispatch } = useCart();

  const branchesReq = useAsync<Branch[]>(() => api.listBranches(), []);
  const addressesReq = useAsync<Address[]>(() => api.listAddresses().catch(() => []), []);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Pick a sensible default branch once branches load: the first open one.
  useEffect(() => {
    if (!branchId && branchesReq.data && branchesReq.data.length > 0) {
      const open = branchesReq.data.find((b) => b.isAcceptingOrders) ?? branchesReq.data[0];
      if (open) {
        setBranchId(open.id);
      }
    }
  }, [branchesReq.data, branchId]);

  const currentBranch = branchesReq.data?.find((b) => b.id === branchId) ?? null;
  const menuReq = useAsync(() => (branchId ? api.menu(branchId) : Promise.resolve(null)), [branchId]);

  const popular = useMemo(() => popularProducts(menuReq.data, 8), [menuReq.data]);
  const recommended = useMemo(() => recommendedProducts(menuReq.data, 8), [menuReq.data]);
  const categories = menuReq.data?.categories ?? [];

  const defaultAddress = addressesReq.data?.find((a) => a.isDefault) ?? addressesReq.data?.[0] ?? null;
  const addressLabel = defaultAddress
    ? [defaultAddress.label, defaultAddress.city].filter(Boolean).join(' · ')
    : 'Add your delivery address';

  const addToCart = (product: MenuProduct): void => {
    if (!branchId) {
      return;
    }
    if (cart.branchId && cart.branchId !== branchId) {
      setToast(`Started a new cart for ${currentBranch?.name ?? 'this branch'}`);
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

  const openMenu = (categoryId?: string): void => {
    if (currentBranch) {
      rootNav.navigate('Menu', { branchId: currentBranch.id, branchName: currentBranch.name, categoryId });
    }
  };
  const openProduct = (product: MenuProduct): void => {
    if (currentBranch) {
      rootNav.navigate('Product', { branchId: currentBranch.id, product });
    }
  };

  const insetsBottomPad = 140; // clear the tab bar + floating cart

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />
      <Screen>
        <HomeHeader
          addressLabel={addressLabel}
          onAddress={() => rootNav.navigate('Addresses')}
          onNotifications={() => setToast('You’re all caught up — no new notifications.')}
          onProfile={() => tabNav.navigate('Account')}
        />

        {branchesReq.loading ? (
          <HomeSkeleton />
        ) : branchesReq.error ? (
          <ErrorState title="Couldn’t load Bait Al Hana" message={branchesReq.error.message} actionLabel="Retry" onAction={branchesReq.reload} />
        ) : !branchesReq.data || branchesReq.data.length === 0 ? (
          <EmptyState title="No branches yet" message="Please check back soon." />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insetsBottomPad }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SearchBar onPress={() => tabNav.navigate('Search')} />
            </View>

            {/* Promo carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 16 }}
              snapToInterval={0}
              decelerationRate="fast"
            >
              {PROMO_BANNERS.map((p) => (
                <PromoBanner key={p.id} data={p} onPress={() => tabNav.navigate('Offers')} style={{ width: 300 }} />
              ))}
            </ScrollView>

            {/* Branch selector */}
            <View style={{ paddingTop: 20 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <SectionHeader title="Order from" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {branchesReq.data.map((b) => {
                  const active = b.id === branchId;
                  return (
                    <PressableScale
                      key={b.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setBranchId(b.id)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: theme.radius.lg,
                        borderWidth: 1.5,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                        minWidth: 150,
                      }}
                    >
                      <AppText variant="h3" style={{ fontSize: 15 }} color={active ? 'primary' : 'text'} numberOfLines={1}>
                        {b.name}
                      </AppText>
                      <AppText variant="caption" color={b.isAcceptingOrders ? 'textMuted' : 'danger'} style={{ marginTop: 2 }}>
                        {b.isAcceptingOrders ? [b.district, b.city].filter(Boolean).join(', ') || 'Open now' : 'Closed now'}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </View>

            {/* Categories */}
            {menuReq.loading ? (
              <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingTop: 20 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                    <Skeleton width={68} height={68} radius={theme.radius.lg} />
                    <Skeleton width={50} height={12} />
                  </View>
                ))}
              </View>
            ) : categories.length > 0 ? (
              <View style={{ paddingTop: 20 }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionHeader title="Categories" actionLabel="See menu" onAction={() => openMenu()} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {categories.map((c) => (
                    <CategoryCard key={c.id} name={c.name} imageUrl={c.imageUrl} glyph={glyphFor(c.name)} onPress={() => openMenu(c.id)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Popular */}
            <RailSection
              title="Popular right now"
              loading={menuReq.loading}
              onSeeAll={() => openMenu()}
              products={popular.map((f) => f.product)}
              onAdd={addToCart}
              onOpen={openProduct}
            />

            {/* Recommended */}
            <RailSection
              title="Recommended for you"
              loading={menuReq.loading}
              onSeeAll={() => openMenu()}
              products={recommended.map((f) => f.product)}
              onAdd={addToCart}
              onOpen={openProduct}
            />

            {/* Special offers */}
            <View style={{ paddingTop: 24 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <SectionHeader title="Special offers" actionLabel="View all" onAction={() => tabNav.navigate('Offers')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {OFFERS.map((o) => (
                  <PressableScale key={o.id} accessibilityRole="button" accessibilityLabel={o.title} onPress={() => tabNav.navigate('Offers')} style={{ width: 220 }}>
                    <GradientSurface colors={o.colors} radius={theme.radius.lg} style={theme.shadow(1)}>
                      <View style={{ padding: 16, minHeight: 110, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <AppText variant="h2" style={{ color: '#fff', fontSize: 20, flex: 1 }}>
                            {o.title}
                          </AppText>
                          <AppText style={{ fontSize: 32 }}>{o.glyph}</AppText>
                        </View>
                        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }} numberOfLines={2}>
                          {o.description}
                        </AppText>
                      </View>
                    </GradientSurface>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>

            {/* Order again */}
            <OrderAgainSection onTrack={(orderId) => rootNav.navigate('OrderTracking', { orderId })} />
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}

function HomeHeader({
  addressLabel,
  onAddress,
  onNotifications,
  onProfile,
}: {
  addressLabel: string;
  onAddress: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
      <PressableScale accessibilityRole="button" accessibilityLabel="Change delivery address" onPress={onAddress} style={{ flex: 1 }}>
        <AppText variant="caption" color="textMuted">
          Deliver to
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <PinIcon color={theme.colors.primary} size={16} />
          <AppText variant="h3" style={{ fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
            {addressLabel}
          </AppText>
          <ChevronRight color={theme.colors.textMuted} size={16} />
        </View>
      </PressableScale>
      <NotifBell onPress={onNotifications} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={onProfile}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText variant="h3" color="primary">
          🙂
        </AppText>
      </PressableScale>
    </View>
  );
}

function NotifBell({ onPress }: { onPress: () => void }): React.JSX.Element {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      onPress={onPress}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
    >
      <BellIcon color={theme.colors.text} size={20} />
    </PressableScale>
  );
}

/** A horizontal rail of food cards with a skeleton loading state. */
function RailSection({
  title,
  products,
  loading,
  onSeeAll,
  onAdd,
  onOpen,
}: {
  title: string;
  products: MenuProduct[];
  loading: boolean;
  onSeeAll: () => void;
  onAdd: (p: MenuProduct) => void;
  onOpen: (p: MenuProduct) => void;
}): React.JSX.Element | null {
  const theme = useTheme();
  const favorites = useFavorites();
  if (!loading && products.length === 0) {
    return null;
  }
  return (
    <View style={{ paddingTop: 24 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title={title} actionLabel="See all" onAction={onSeeAll} />
      </View>
      {loading ? (
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 168, gap: 8 }}>
              <Skeleton height={112} radius={theme.radius.lg} />
              <Skeleton width="70%" height={14} />
              <Skeleton width="40%" height={14} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {products.map((p) => {
            const card = toFoodCard(p);
            return (
              <FoodCard
                key={p.id}
                data={card}
                onPress={() => onOpen(p)}
                onAdd={() => onAdd(p)}
                favorite={favorites.isFavorite(p.id)}
                onToggleFavorite={() => favorites.toggle(card)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** "Order again" — the customer's recent orders, if any. */
function OrderAgainSection({ onTrack }: { onTrack: (orderId: string) => void }): React.JSX.Element | null {
  const { api } = useAuth();
  const theme = useTheme();
  const { data } = useAsync(() => api.myOrders().catch(() => ({ data: [] })), []);
  const orders = (data?.data ?? []).slice(0, 5);
  if (orders.length === 0) {
    return null;
  }
  return (
    <View style={{ paddingTop: 24 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title="Order again" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {orders.map((o) => (
          <PressableScale key={o.id} accessibilityRole="button" accessibilityLabel={`Order ${o.orderNumber}`} onPress={() => onTrack(o.id)} style={{ width: 220 }}>
            <Card elevated>
              <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
                {o.items[0]?.productName ?? o.orderNumber}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                {o.items.length} item{o.items.length === 1 ? '' : 's'}
              </AppText>
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 10 }} />
              <AppText variant="bodySmall" weight="700" color="primary">
                Reorder →
              </AppText>
            </Card>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

function HomeSkeleton(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Skeleton height={48} radius={theme.radius.pill} />
      <Skeleton height={140} radius={theme.radius.xl} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={68} height={68} radius={theme.radius.lg} />
        ))}
      </View>
      <Skeleton height={180} radius={theme.radius.lg} />
    </View>
  );
}
