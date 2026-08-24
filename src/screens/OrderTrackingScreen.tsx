import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { ErrorState, Skeleton } from '../motion';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../types/backend';
import type { DeliveryTracking } from '../api/types';
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

/**
 * Polling backstop. Realtime carries the driver's live moves (see
 * `useDriverLocation`), so this poll only needs to catch order-status
 * transitions and the periodic ETA refresh — 20 s is more than enough and
 * saves battery + backend load compared to the old 8 s cadence.
 */
const POLL_MS = 20_000;
/** Delivery statuses where the driver is actually on the road with our order. */
const LIVE_DRIVER_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
]);

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

  // Realtime driver marker — used only while the driver is on the road with
  // our order. The socket handles smooth updates between polls; the poll
  // still runs at a low cadence to catch status transitions and refreshed
  // ETAs. `useDriverLocation` unsubscribes automatically once `enabled`
  // flips off (delivered / cancelled), matching the backend rule that emits
  // stop after DELIVERED (spec §12).
  const liveEnabled =
    order?.type === ORDER_TYPE.DELIVERY && !!order && LIVE_DRIVER_STATUSES.has(order.status);
  const liveDriver = useDriverLocation(order ? orderId : null, liveEnabled);

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

          {(() => {
            const d = tracking.data;
            // Prefer the realtime coord over the polled snapshot — it is at
            // most a few seconds old, the polled one can be a full poll cycle
            // behind. Fall back to the polled coord until the first live event.
            const driverLat = liveDriver?.latitude ?? d?.driver?.currentLatitude ?? null;
            const driverLng = liveDriver?.longitude ?? d?.driver?.currentLongitude ?? null;
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

          {(() => {
            const eta = tracking.data?.etaMinutes ?? null;
            if (order.type !== ORDER_TYPE.DELIVERY || eta === null || !liveEnabled) {
              return null;
            }
            const near = eta <= 3;
            return (
              <Card>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
                  {near ? 'ALMOST THERE' : 'ESTIMATED ARRIVAL'}
                </Text>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 20, marginTop: 4 }}>
                  {near ? `About ${eta} min away` : `~${eta} min`}
                </Text>
                {tracking.data?.driver?.user.fullName ? (
                  <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                    Driver: {tracking.data.driver.user.fullName}
                  </Text>
                ) : null}
              </Card>
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
