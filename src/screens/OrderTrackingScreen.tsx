import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { useAnimatedCoordinate } from '../maps/marker-animation';
import { ErrorState, Skeleton, useReducedMotion } from '../motion';
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

const POLL_MS = 8000;

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

  // Glide the driver pin between the 8-second polls instead of letting it jump.
  // The position arrives on the poll; this only animates the value we already
  // have, and snaps under reduced motion.
  const reduceMotion = useReducedMotion();
  const dLat = tracking.data?.driver?.currentLatitude ?? null;
  const dLng = tracking.data?.driver?.currentLongitude ?? null;
  const driverTarget = dLat !== null && dLng !== null ? { latitude: dLat, longitude: dLng } : null;
  const animatedDriver = useAnimatedCoordinate(driverTarget, { durationMs: POLL_MS, reduceMotion });

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
            const addrLat = d?.addressSnapshot?.latitude ?? null;
            const addrLng = d?.addressSnapshot?.longitude ?? null;
            if (order.type !== ORDER_TYPE.DELIVERY || (animatedDriver === null && addrLat === null)) {
              return null;
            }
            const markers: MapMarker[] = [];
            if (animatedDriver !== null) {
              markers.push({ id: 'driver', latitude: animatedDriver.latitude, longitude: animatedDriver.longitude, kind: 'driver', title: d?.driver?.user.fullName ?? 'Driver' });
            }
            if (addrLat !== null && addrLng !== null) {
              markers.push({ id: 'dest', latitude: addrLat, longitude: addrLng, kind: 'customer', title: 'Delivery address' });
            }
            // Centre on the driver's *target*, not the animated value, so the
            // map holds still while only the pin glides between polls.
            const focus =
              driverTarget ??
              (addrLat !== null && addrLng !== null ? { latitude: addrLat, longitude: addrLng } : null);
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
