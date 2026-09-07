import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { AppText, Card, CategoryCard, FoodCard, Screen, SearchBar, SectionHeader } from '../components';
import { BellIcon, ChevronRight, PinIcon } from '../components/icons';
import { glyphFor } from '../components/FoodImage';
import { popularProducts, toFoodCard } from '../data/menu';
import { useFavorites } from '../favorites/FavoritesProvider';
import { useFulfilment } from '../fulfilment/FulfilmentProvider';
import { useAsync } from '../hooks/useAsync';
import { BottomSheet, EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { Address, Branch, MenuProduct } from '../api/types';
import { ORDER_TYPE, OrderType } from '../types/backend';
import { branchesFor, pointOf, resolveBranch } from '../util/branchChoice';
import { menuPriceMinor } from '../util/menuPrice';
import { useTheme } from '../theme/theme';
import { itemCountLabel } from '../util/orderItems';

/**
 * Home: choose how you are getting it, then the food.
 *
 * Two owner decisions shape this screen (2026-09-04):
 *
 * - **No promotional banners here.** They belong on Offers, where a customer
 *   who wants a deal goes looking for one. On home they pushed the food below
 *   the fold on a phone, which is the one thing the screen exists to show.
 * - **Delivery or pickup decides the branch.** Pickup is the customer's choice
 *   from the branches the owner runs; delivery comes from the branch nearest
 *   their address and is not changeable. So the old "Order from" strip of every
 *   branch is gone: it offered a choice that, half the time, is not theirs to
 *   make. The rule itself is pure and tested in `src/util/branchChoice.ts`.
 */
export function HomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<BottomTabScreenProps<MainTabParamList>['navigation']>();
  const { cart, dispatch } = useCart();
  const { mode, setMode, pickupBranchId, setPickupBranchId } = useFulfilment();
  const { width } = useWindowDimensions();

  const branchesReq = useAsync<Branch[]>(() => api.listBranches(), []);
  const addressesReq = useAsync<Address[]>(() => api.listAddresses().catch(() => []), []);
  const [toast, setToast] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const branches = useMemo(() => branchesReq.data ?? [], [branchesReq.data]);
  const defaultAddress =
    addressesReq.data?.find((a) => a.isDefault) ?? addressesReq.data?.[0] ?? null;
  const customerPoint = pointOf(defaultAddress);

  // Where this order comes from. Recomputed from the address every time rather
  // than remembered, so it is always the branch that is actually nearest.
  const resolved = useMemo(
    () => resolveBranch(branches, mode, customerPoint, pickupBranchId),
    [branches, mode, customerPoint?.latitude, customerPoint?.longitude, pickupBranchId],
  );
  const branch = resolved.branch;
  const branchId = branch?.id ?? null;

  const menuReq = useAsync(() => (branchId ? api.menu(branchId) : Promise.resolve(null)), [branchId]);
  const categories = menuReq.data?.categories ?? [];
  const popular = useMemo(() => popularProducts(menuReq.data, 6), [menuReq.data]);
  const menuPicks = useMemo(() => {
    const all = categories.flatMap((c) => c.products);
    // Take from across the menu rather than the first category alone, so the
    // grid reads as a sample of what the branch sells.
    return all.filter((p) => p.isAvailable !== false).slice(0, 6);
  }, [categories]);

  // A cart belongs to one branch. When the branch changes underneath it — the
  // customer switched to pickup, or saved a nearer address — say so once
  // rather than letting them discover it at checkout.
  useEffect(() => {
    if (branchId && cart.branchId && cart.branchId !== branchId) {
      setToast('Your basket is from another branch — checkout uses that one.');
    }
    // Only when the resolved branch changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const addToCart = (product: MenuProduct): void => {
    if (!branchId || product.isAvailable === false) {
      return;
    }
    dispatch({
      type: 'ADD',
      branchId,
      line: {
        productId: product.id,
        productName: product.name,
        unitPriceMinor: menuPriceMinor(product),
        addonIds: [],
        addonNames: [],
      },
    });
  };

  const openMenu = (categoryId?: string): void => {
    if (branch) {
      rootNav.navigate('Menu', { branchId: branch.id, branchName: branch.name, categoryId });
    }
  };
  const openProduct = (product: MenuProduct): void => {
    if (branch) {
      rootNav.navigate('Product', { branchId: branch.id, product });
    }
  };

  const headerLabel =
    mode === ORDER_TYPE.DELIVERY
      ? defaultAddress
        ? [defaultAddress.label, defaultAddress.city].filter(Boolean).join(' · ')
        : 'Add your delivery address'
      : (branch?.name ?? 'Choose a branch');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Toast visible={!!toast} message={toast ?? ''} tone="neutral" onHide={() => setToast(null)} />
      <Screen>
        <HomeHeader
          caption={mode === ORDER_TYPE.DELIVERY ? 'Deliver to' : 'Collect from'}
          label={headerLabel}
          onPress={() =>
            mode === ORDER_TYPE.DELIVERY ? rootNav.navigate('Addresses') : setPicking(true)
          }
          onNotifications={() => rootNav.navigate('Notifications')}
          onProfile={() => tabNav.navigate('Account')}
        />

        {branchesReq.loading ? (
          <HomeSkeleton />
        ) : branchesReq.error ? (
          <ErrorState
            title="Couldn’t load"
            message={branchesReq.error.message}
            actionLabel="Retry"
            onAction={branchesReq.reload}
          />
        ) : branches.length === 0 ? (
          <EmptyState title="No branches yet" message="Please check back soon." />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SearchBar onPress={() => tabNav.navigate('Search')} />
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <ModeSwitch mode={mode} onChange={setMode} />
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <BranchCard
                branch={branch}
                mode={mode}
                distanceKm={resolved.distanceKm}
                needsAddress={resolved.needsAddress}
                onChange={resolved.changeable ? () => setPicking(true) : undefined}
                onAddAddress={() => rootNav.navigate('Addresses')}
              />
            </View>

            {menuReq.loading ? (
              <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingTop: 24 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                    <Skeleton width={68} height={68} radius={theme.radius.lg} />
                    <Skeleton width={50} height={12} />
                  </View>
                ))}
              </View>
            ) : categories.length > 0 ? (
              <View style={{ paddingTop: 24 }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionHeader title="Categories" actionLabel="See menu" onAction={() => openMenu()} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                >
                  {categories.map((c) => (
                    <CategoryCard
                      key={c.id}
                      name={c.name}
                      imageUrl={c.imageUrl}
                      glyph={glyphFor(c.name)}
                      onPress={() => openMenu(c.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <PopularRail
              products={popular.map((f) => f.product)}
              loading={menuReq.loading}
              onSeeAll={() => openMenu()}
              onAdd={addToCart}
              onOpen={openProduct}
            />

            <MenuGrid
              products={menuPicks}
              loading={menuReq.loading}
              width={width}
              onSeeAll={() => openMenu()}
              onAdd={addToCart}
              onOpen={openProduct}
            />

            <OrderAgainSection onTrack={(orderId) => rootNav.navigate('OrderTracking', { orderId })} />
          </ScrollView>
        )}
      </Screen>

      <BranchPicker
        visible={picking}
        branches={branchesFor(branches, ORDER_TYPE.PICKUP)}
        selectedId={branch?.id ?? null}
        customerPoint={customerPoint}
        onSelect={(id) => {
          setPickupBranchId(id);
          setMode(ORDER_TYPE.PICKUP);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

/**
 * Delivery or pickup, as one control.
 *
 * It sits above everything else on the screen because it decides the rest of
 * it: which branch, which prices (delivery prices carry the owner's uplift),
 * and what checkout will place.
 */
function ModeSwitch({ mode, onChange }: { mode: OrderType; onChange: (mode: OrderType) => void }): React.JSX.Element {
  const theme = useTheme();
  const options: { value: OrderType; label: string; glyph: string }[] = [
    { value: ORDER_TYPE.DELIVERY, label: 'Delivery', glyph: '🛵' },
    { value: ORDER_TYPE.PICKUP, label: 'Pickup', glyph: '🛍️' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.pill,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = option.value === mode;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={{ flex: 1 }}
          >
            <View
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 11,
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.surface : 'transparent',
                },
                active ? theme.shadow(1) : null,
              ]}
            >
              <AppText style={{ fontSize: 15 }}>{option.glyph}</AppText>
              <AppText variant="bodySmall" weight="700" color={active ? 'text' : 'textMuted'}>
                {option.label}
              </AppText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Which branch this order comes from, and whether that is the customer's call. */
function BranchCard({
  branch,
  mode,
  distanceKm,
  needsAddress,
  onChange,
  onAddAddress,
}: {
  branch: Branch | null;
  mode: OrderType;
  distanceKm: number | null;
  needsAddress: boolean;
  onChange?: () => void;
  onAddAddress: () => void;
}): React.JSX.Element {
  const theme = useTheme();

  if (!branch) {
    return (
      <Card>
        <AppText variant="h3" style={{ fontSize: 15 }}>
          {mode === ORDER_TYPE.DELIVERY ? 'No branch delivers yet' : 'No branch offers pickup'}
        </AppText>
        <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
          Try the other option, or check back soon.
        </AppText>
      </Card>
    );
  }

  const where = [branch.district, branch.city].filter(Boolean).join(', ');
  const subtitle =
    mode === ORDER_TYPE.DELIVERY
      ? needsAddress
        ? 'Add your address and we’ll deliver from your nearest branch'
        : distanceKm !== null
          ? `Your nearest branch · about ${distanceKm} km away`
          : 'Your nearest branch'
      : where || 'Collect at the counter';

  return (
    <Card elevated>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 20 }}>{mode === ORDER_TYPE.DELIVERY ? '🛵' : '🏪'}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" style={{ fontSize: 16 }} numberOfLines={1}>
            {branch.name}
          </AppText>
          <AppText variant="caption" color={branch.isAcceptingOrders ? 'textMuted' : 'danger'} numberOfLines={2} style={{ marginTop: 2 }}>
            {branch.isAcceptingOrders ? subtitle : 'Not taking orders right now'}
          </AppText>
        </View>
        {onChange ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Change branch" onPress={onChange}>
            <AppText variant="bodySmall" weight="700" color="primary">
              Change
            </AppText>
          </PressableScale>
        ) : null}
      </View>

      {mode === ORDER_TYPE.DELIVERY && needsAddress ? (
        <View style={{ marginTop: 12 }}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Add your delivery address" onPress={onAddAddress}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: theme.radius.md,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.primary,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <PinIcon color={theme.colors.primary} size={16} />
              <AppText variant="bodySmall" weight="700" color="primary" style={{ flex: 1 }}>
                Add your address
              </AppText>
              <ChevronRight color={theme.colors.primary} size={16} />
            </View>
          </PressableScale>
        </View>
      ) : null}
    </Card>
  );
}

/** The owner's branches, for the customer to collect from. */
function BranchPicker({
  visible,
  branches,
  selectedId,
  customerPoint,
  onSelect,
  onClose,
}: {
  visible: boolean;
  branches: Branch[];
  selectedId: string | null;
  customerPoint: { latitude: number; longitude: number } | null;
  onSelect: (branchId: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const theme = useTheme();

  // Nearest first when we know where the customer is — a pickup list is most
  // useful in the order someone would actually drive.
  const ordered = useMemo(() => {
    if (!customerPoint) {
      return branches;
    }
    return [...branches].sort((a, b) => {
      const da = resolveBranch([a], ORDER_TYPE.PICKUP, customerPoint).distanceKm ?? Number.MAX_SAFE_INTEGER;
      const db = resolveBranch([b], ORDER_TYPE.PICKUP, customerPoint).distanceKm ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [branches, customerPoint]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2" style={{ fontSize: 19, marginBottom: 4 }}>
        Collect from
      </AppText>
      <AppText variant="caption" color="textMuted" style={{ marginBottom: 12 }}>
        Choose the branch you’ll pick your order up from.
      </AppText>
      <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
        {ordered.length === 0 ? (
          <AppText variant="bodySmall" color="textMuted">
            No branch offers pickup right now.
          </AppText>
        ) : (
          ordered.map((b) => {
            const selected = b.id === selectedId;
            const km = resolveBranch([b], ORDER_TYPE.PICKUP, customerPoint).distanceKm;
            return (
              <PressableScale
                key={b.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={b.name}
                onPress={() => onSelect(b.id)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1.5,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
                      {b.name}
                    </AppText>
                    <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                      {[b.district, b.city].filter(Boolean).join(', ') || b.addressLine}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={b.isAcceptingOrders ? 'textMuted' : 'danger'}
                      style={{ marginTop: 4 }}
                    >
                      {b.isAcceptingOrders
                        ? km !== null
                          ? `Open · about ${km} km away`
                          : 'Open now'
                        : 'Closed now'}
                    </AppText>
                  </View>
                  {selected ? (
                    <AppText variant="bodySmall" weight="700" color="primary">
                      ✓
                    </AppText>
                  ) : (
                    <ChevronRight color={theme.colors.textMuted} size={18} />
                  )}
                </View>
              </PressableScale>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function HomeHeader({
  caption,
  label,
  onPress,
  onNotifications,
  onProfile,
}: {
  caption: string;
  label: string;
  onPress: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
      <PressableScale accessibilityRole="button" accessibilityLabel={caption} onPress={onPress} style={{ flex: 1 }}>
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <PinIcon color={theme.colors.primary} size={16} />
          <AppText variant="h3" style={{ fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
            {label}
          </AppText>
          <ChevronRight color={theme.colors.textMuted} size={16} />
        </View>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={onNotifications}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BellIcon color={theme.colors.text} size={20} />
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={onProfile}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="h3" color="primary">
          🙂
        </AppText>
      </PressableScale>
    </View>
  );
}

/** A horizontal rail of the branch's most-ordered dishes. */
function PopularRail({
  products,
  loading,
  onSeeAll,
  onAdd,
  onOpen,
}: {
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
        <SectionHeader title="Popular right now" actionLabel="See all" onAction={onSeeAll} />
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

/**
 * A sample of the menu, laid out as a two-column grid.
 *
 * The screen used to carry two near-identical horizontal rails, which reads as
 * one thing scrolled twice and shows six items in the space of a phone screen.
 * A grid gives the food the width it deserves, lets the eye compare dishes
 * side by side, and ends on a plain way into the full menu.
 */
function MenuGrid({
  products,
  loading,
  width,
  onSeeAll,
  onAdd,
  onOpen,
}: {
  products: MenuProduct[];
  loading: boolean;
  width: number;
  onSeeAll: () => void;
  onAdd: (p: MenuProduct) => void;
  onOpen: (p: MenuProduct) => void;
}): React.JSX.Element | null {
  const theme = useTheme();
  const favorites = useFavorites();

  // 16pt page margins, 12pt gutter. Floored so a rounding remainder never
  // pushes the second column off the screen on a narrow phone.
  const cardWidth = Math.floor((Math.min(width, 620) - 16 * 2 - 12) / 2);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View style={{ paddingTop: 28 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title="From the menu" actionLabel="See full menu" onAction={onSeeAll} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: cardWidth, gap: 8 }}>
                <Skeleton height={112} radius={theme.radius.lg} />
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={14} />
              </View>
            ))
          : products.map((p) => {
              const card = toFoodCard(p);
              return (
                <FoodCard
                  key={p.id}
                  data={card}
                  width={cardWidth}
                  onPress={() => onOpen(p)}
                  onAdd={() => onAdd(p)}
                  favorite={favorites.isFavorite(p.id)}
                  onToggleFavorite={() => favorites.toggle(card)}
                />
              );
            })}
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <PressableScale accessibilityRole="button" accessibilityLabel="See the full menu" onPress={onSeeAll}>
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 13,
              borderRadius: theme.radius.pill,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <AppText variant="button" color="primary">
              See the full menu
            </AppText>
          </View>
        </PressableScale>
      </View>
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
    <View style={{ paddingTop: 28 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title="Order again" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {orders.map((o) => (
          <PressableScale
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={`Order ${o.orderNumber}`}
            onPress={() => onTrack(o.id)}
            style={{ width: 220 }}
          >
            <Card elevated>
              <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
                {o.items?.[0]?.productName ?? o.orderNumber}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                {itemCountLabel(o.items)}
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
      <Skeleton height={52} radius={theme.radius.pill} />
      <Skeleton height={92} radius={theme.radius.lg} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={68} height={68} radius={theme.radius.lg} />
        ))}
      </View>
      <Skeleton height={180} radius={theme.radius.lg} />
    </View>
  );
}
