import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, Skeleton } from '../motion';
import { ORDER_STATUS, OrderStatus } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

/** Statuses that are still moving — worth polling for live updates. */
const ACTIVE: OrderStatus[] = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DRIVER_ASSIGNED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

const POLL_MS = 8000;

/** Live order tracking via the shared OrderStatusTracker, polling while active. */
export function OrderTrackingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);
  const [tick, setTick] = useState(0);

  // Poll while the order is still moving. `tick` drives useAsync's reload via deps.
  useEffect(() => {
    if (!order || !ACTIVE.includes(order.status)) {
      return;
    }
    const timer = setTimeout(() => {
      setTick((t) => t + 1);
      reload();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [order, tick, reload]);

  return (
    <Screen title="Your order" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Branches')}>
      {loading && !order ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={220} radius={theme.radius.lg} />
        </View>
      ) : error && !order ? (
        <ErrorState title="Couldn’t load your order" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : order ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.textMuted }}>Order {order.orderNumber}</Text>
          <OrderStatusTracker status={order.status} type={order.type} />

          <Card>
            {order.items.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.colors.text }}>
                  {item.quantity}× {item.productName}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>{formatSar(item.lineTotalMinor)}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Total</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{formatSar(order.totalMinor)}</Text>
            </View>
          </Card>

          <PrimaryButton label="Back to home" onPress={() => navigation.replace('Branches')} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}
