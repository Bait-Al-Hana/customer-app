import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { Card, Screen } from '../components/ui';
import { rebuildOrderIntoCart, skippedMessage } from '../features/reorder/reorder';
import { STATUS_META } from '../features/order/order-status.model';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { StatusTone } from '../features/order/order-status.model';
import type { Order } from '../api/types';
import { useTheme } from '../theme/theme';

function toneColor(theme: ReturnType<typeof useTheme>, tone: StatusTone): string {
  return tone === 'success'
    ? theme.colors.success
    : tone === 'danger'
      ? theme.colors.danger
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'progress'
          ? theme.colors.primary
          : theme.colors.textMuted;
}

/** My past and current orders. */
export function OrdersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Orders'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { dispatch } = useCart();
  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const orders = data?.data ?? [];

  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: StatusTone } | null>(null);

  const reorder = async (order: Order): Promise<void> => {
    setReorderingId(order.id);
    try {
      // Rebuild against today's menu, never the order's snapshotted prices: the
      // server re-checks price and availability again at checkout.
      const menu = await api.menu(order.branchId);
      const { cart, skipped } = rebuildOrderIntoCart(order, menu);
      if (cart.lines.length === 0) {
        setToast({ message: 'None of those items are available right now.', tone: 'warning' });
        return;
      }
      dispatch({ type: 'REPLACE', cart });
      const note = skippedMessage(skipped);
      if (note) {
        setToast({ message: note, tone: 'warning' });
      }
      navigation.navigate('Cart');
    } catch (e) {
      setToast({ message: e instanceof ApiError ? e.message : 'Could not rebuild that order.', tone: 'danger' });
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <Screen title="My orders" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast?.message ?? ''} tone={toast?.tone ?? 'neutral'} onHide={() => setToast(null)} />
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={80} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load your orders" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" message="Your orders will show up here." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {orders.map((order) => {
            const meta = STATUS_META[order.status];
            const busy = reorderingId === order.id;
            return (
              <Card key={order.id}>
                <PressableScale accessibilityRole="button" onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{order.orderNumber}</Text>
                    <View style={{ backgroundColor: toneColor(theme, meta.tone), borderRadius: theme.radius.pill, paddingVertical: 3, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>{formatSar(order.totalMinor)}</Text>
                </PressableScale>
                <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 10 }} />
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Reorder ${order.orderNumber}`}
                  accessibilityState={{ busy, disabled: busy }}
                  disabled={busy}
                  onPress={() => reorder(order)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 }}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>↺ Reorder</Text>
                  )}
                </PressableScale>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
