import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { ErrorState, Skeleton } from '../motion';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../types/backend';
import type { DeliveryTracking } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { formatSar, vatLabel } from '../util/money';
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

/** One label/amount line in the order summary. */
function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'positive' }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ color: theme.colors.textMuted }}>{label}</Text>
      <Text style={{ color: tone === 'positive' ? theme.colors.success : theme.colors.textMuted }}>
        {value}
      </Text>
    </View>
  );
}

/** Live order tracking via the shared OrderStatusTracker, polling while active. */
export function OrderTrackingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);
  const [tick, setTick] = useState(0);

  // Live delivery tracking (driver location) for delivery orders only.
  const tracking = useAsync<DeliveryTracking | null>(
    () => (order?.type === ORDER_TYPE.DELIVERY ? api.trackDelivery(orderId) : Promise.resolve(null)),
    [order?.type, tick],
  );

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
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: theme.colors.textMuted }}>Order</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>{order.orderNumber}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={{ color: theme.colors.textMuted }}>Reference</Text>
              {/* Selectable so it can be long-pressed and copied into a message
                  to the restaurant — this is the number support asks for. */}
              <Text selectable style={{ color: theme.colors.text, fontVariant: ['tabular-nums'], letterSpacing: 0.5 }}>
                {order.referenceId}
              </Text>
            </View>
          </Card>
          <OrderStatusTracker status={order.status} type={order.type} />

          {(() => {
            const d = tracking.data;
            const driverLat = d?.driver?.currentLatitude ?? null;
            const driverLng = d?.driver?.currentLongitude ?? null;
            const addrLat = d?.addressSnapshot?.latitude ?? null;
            const addrLng = d?.addressSnapshot?.longitude ?? null;
            if (order.type !== ORDER_TYPE.DELIVERY || (driverLat === null && addrLat === null)) {
              return null;
            }
            const markers: MapMarker[] = [];
            if (driverLat !== null && driverLng !== null) {
              markers.push({ id: 'driver', latitude: driverLat, longitude: driverLng, kind: 'driver', title: d?.driver?.user.fullName ?? 'Driver' });
            }
            if (addrLat !== null && addrLng !== null) {
              markers.push({ id: 'dest', latitude: addrLat, longitude: addrLng, kind: 'customer', title: 'Delivery address' });
            }
            const focus = markers[0];
            return (
              <View style={{ height: 220, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
                <AppMap
                  scrollEnabled={false}
                  region={focus ? { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : DEFAULT_REGION}
                  markers={markers}
                />
              </View>
            );
          })()}

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
            {/* Every figure below is the backend's snapshot for this order. The
                app never computes a payable amount — it only formats one. */}
            <SummaryRow label="Subtotal" value={formatSar(order.subtotalMinor)} />
            {order.discountMinor > 0 ? (
              <SummaryRow label="Discount" value={`-${formatSar(order.discountMinor)}`} tone="positive" />
            ) : null}
            {order.deliveryFeeMinor > 0 ? (
              <SummaryRow label="Delivery" value={formatSar(order.deliveryFeeMinor)} />
            ) : null}
            {order.chargesMinor ? <SummaryRow label="Charges" value={formatSar(order.chargesMinor)} /> : null}
            <SummaryRow label={`VAT${vatLabel(order.vatRate)}`} value={formatSar(order.vatMinor)} />
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
