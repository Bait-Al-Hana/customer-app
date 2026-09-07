import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, OrderCard, Screen } from '../components';
import { statusMeta } from '../features/order/order-status.model';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Shimmer, Stagger } from '../motion';
import { ORDER_STATUS, OrderStatus } from '../types/backend';
import type { Branch, Order } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { itemCountLabel } from '../util/orderItems';

const ACTIVE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DRIVER_ASSIGNED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

/** My orders: active and past, with track and reorder. */
export function OrdersScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);
  useFocusEffect(useCallback(() => reload(), [reload]));

  const orders = data?.data ?? [];
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const list = tab === 'active' ? active : past;

  const branchName = (branchId: string): string => branchesReq.data?.find((b) => b.id === branchId)?.name ?? 'Bait Al Hana';
  const reorder = (order: Order): void => nav.navigate('Menu', { branchId: order.branchId, branchName: branchName(order.branchId) });

  const seg = (key: 'active' | 'past', label: string, n: number) => {
    const on = tab === key;
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => setTab(key)}
        style={{ flex: 1, paddingVertical: 10, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: on ? theme.colors.surface : 'transparent' }}
      >
        <AppText variant="bodySmall" weight="700" color={on ? 'primary' : 'textMuted'}>
          {label}
          {n > 0 ? ` (${n})` : ''}
        </AppText>
      </PressableScale>
    );
  };

  return (
    <Screen title="My orders">
      <View style={{ flexDirection: 'row', gap: 4, margin: 16, marginBottom: 8, padding: 4, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceAlt }}>
        {seg('active', 'Active', active.length)}
        {seg('past', 'Past', past.length)}
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} height={128} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load your orders" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : list.length === 0 ? (
        <EmptyState
          glyph={tab === 'active' ? '🍽️' : '🧾'}
          title={tab === 'active' ? 'No active orders' : 'No past orders yet'}
          message={tab === 'active' ? 'When you place an order, you can track it here.' : 'Your completed orders will appear here.'}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12, paddingBottom: 120 }}>
          <Stagger>
            {list.map((o) => {
              const meta = statusMeta(o.status);
              return (
                <OrderCard
                  key={o.id}
                  orderNumber={o.orderNumber}
                  dateLabel={dateLabel(o.placedAt)}
                  itemsLabel={itemCountLabel(o.items)}
                  totalMinor={o.totalMinor}
                  statusLabel={meta.label}
                  statusTone={meta.tone}
                  onPress={() => nav.navigate('OrderTracking', { orderId: o.id })}
                  onReorder={tab === 'past' ? () => reorder(o) : undefined}
                  actionLabel={tab === 'active' ? 'Track' : 'View'}
                />
              );
            })}
          </Stagger>
        </ScrollView>
      )}
    </Screen>
  );
}
