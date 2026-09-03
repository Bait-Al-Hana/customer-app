import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useReorder } from '../cart/useReorder';
import { Card, Screen } from '../components/ui';
import { STATUS_META } from '../features/order/order-status.model';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { StatusTone } from '../features/order/order-status.model';
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
  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const orders = data?.data ?? [];
  const reorder = useReorder();
  const [toast, setToast] = useState<{ message: string; tone: StatusTone } | null>(null);

  const orderAgain = (order: (typeof orders)[number]): void => {
    const { ok, unavailable } = reorder(order);
    if (!ok) {
      setToast({ message: 'Nothing from that order is on the menu any more.', tone: 'danger' });
      return;
    }
    if (unavailable.length > 0) {
      // Say what was left out rather than handing over a quietly smaller cart.
      setToast({ message: `Added. ${unavailable.join(', ')} is no longer available.`, tone: 'warning' });
    }
    navigation.navigate('Cart');
  };

  return (
    <Screen title="My orders" onBack={() => navigation.goBack()}>
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
            return (
              // The card and the reorder button are SIBLINGS, never nested.
              // A pressable inside a pressable is invalid markup (a <button>
              // cannot contain a <button>) and the outer one swallows the tap,
              // so "Order again" opened the order instead of reordering it.
              <Card key={order.id}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`View order ${order.orderNumber}`}
                  onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{order.orderNumber}</Text>
                      {/* The globally unique reference — the number to quote when
                          asking about this order, since order numbers repeat across branches. */}
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        Ref {order.referenceId}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: toneColor(theme, meta.tone), borderRadius: theme.radius.pill, paddingVertical: 3, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>{formatSar(order.totalMinor)}</Text>
                </PressableScale>

                {/* Reordering is the most common thing a customer wants from
                    this list, so it is one tap from here rather than a rebuild
                    of the cart by hand. */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Order ${order.orderNumber} again`}
                    onPress={() => orderAgain(order)}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                      borderRadius: theme.radius.pill,
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Order again</Text>
                  </PressableScale>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Toast
        visible={toast !== null}
        message={toast?.message ?? ''}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />
    </Screen>
  );
}
