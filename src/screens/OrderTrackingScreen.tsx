import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Card, Divider, PriceRow, Screen } from '../components';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { ErrorState, FadeIn, MotiCard, PulsingDot, Shimmer, StatusBadge } from '../motion';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../types/backend';
import { STATUS_META } from '../features/order/order-status.model';
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

const ON_THE_WAY: OrderStatus[] = [ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.PICKED_UP, ORDER_STATUS.OUT_FOR_DELIVERY];
const POLL_MS = 8000;

/** Live order tracking via the shared OrderStatusTracker, polling while active. */
export function OrderTrackingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);
  const [tick, setTick] = useState(0);

  const tracking = useAsync<DeliveryTracking | null>(
    () => (order?.type === ORDER_TYPE.DELIVERY ? api.trackDelivery(orderId).catch(() => null) : Promise.resolve(null)),
    [order?.type, tick],
  );

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

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  const isActive = order && ACTIVE.includes(order.status);
  const statusMeta = order ? STATUS_META[order.status] : null;

  return (
    <Screen title="Your order" onBack={() => (navigation.canGoBack() ? navigation.goBack() : goHome())}>
      {loading && !order ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Shimmer height={64} radius={theme.radius.lg} />
          <Shimmer height={240} radius={theme.radius.lg} />
        </View>
      ) : error && !order ? (
        <ErrorState title="Couldn't load your order" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : order ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
          <FadeIn translateY={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="bodySmall" color="textMuted">
                Order {order.orderNumber}
              </AppText>
              {statusMeta ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isActive ? <PulsingDot color={theme.colors.primary} size={6} /> : null}
                  <StatusBadge
                    label={statusMeta.label}
                    color={
                      statusMeta.tone === 'success'
                        ? theme.colors.success + '1A'
                        : statusMeta.tone === 'danger'
                          ? theme.colors.danger + '1A'
                          : statusMeta.tone === 'warning'
                            ? theme.colors.warning + '1A'
                            : theme.colors.primary + '1A'
                    }
                    textColor={
                      statusMeta.tone === 'success'
                        ? theme.colors.success
                        : statusMeta.tone === 'danger'
                          ? theme.colors.danger
                          : statusMeta.tone === 'warning'
                            ? theme.colors.warning
                            : theme.colors.primary
                    }
                  />
                </View>
              ) : null}
            </View>
          </FadeIn>

          <FadeIn translateY={8} delay={60}>
            <MotiCard from="bottom" delay={80}>
              <OrderStatusTracker status={order.status} type={order.type} />
            </MotiCard>
          </FadeIn>

          {/* Live delivery: driver + ETA + map */}
          {order.type === ORDER_TYPE.DELIVERY && ON_THE_WAY.includes(order.status) ? (
            <FadeIn translateY={8} delay={120}>
              <DeliveryPanel tracking={tracking.data} orderNumber={order.orderNumber} />
            </FadeIn>
          ) : null}

          {/* Items */}
          <FadeIn translateY={8} delay={180}>
            <Card elevated>
              <AppText variant="h3" style={{ marginBottom: 10 }}>
                Order details
              </AppText>
              {order.items.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {item.quantity}× {item.productName}
                  </AppText>
                  <AppText variant="body" color="textMuted">
                    {formatSar(item.lineTotalMinor)}
                  </AppText>
                </View>
              ))}
              <Divider style={{ marginVertical: 8 }} />
              <PriceRow label="Total" value={formatSar(order.totalMinor)} emphasis />
            </Card>
          </FadeIn>

          <Button label="Back to home" variant="ghost" onPress={goHome} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}

/** The driver/ETA/map panel, shown while a delivery is on the way. */
function DeliveryPanel({ tracking, orderNumber }: { tracking: DeliveryTracking | null; orderNumber: string }): React.JSX.Element {
  const theme = useTheme();
  const driverLat = tracking?.driver?.currentLatitude ?? null;
  const driverLng = tracking?.driver?.currentLongitude ?? null;
  const addrLat = tracking?.addressSnapshot?.latitude ?? null;
  const addrLng = tracking?.addressSnapshot?.longitude ?? null;

  const markers: MapMarker[] = [];
  if (driverLat !== null && driverLng !== null) {
    markers.push({ id: 'driver', latitude: driverLat, longitude: driverLng, kind: 'driver', title: tracking?.driver?.user.fullName ?? 'Driver' });
  }
  if (addrLat !== null && addrLng !== null) {
    markers.push({ id: 'dest', latitude: addrLat, longitude: addrLng, kind: 'customer', title: 'Delivery address' });
  }
  const focus = markers[0];
  const driverName = tracking?.driver?.user.fullName ?? 'Your driver';
  const vehicle = tracking?.driver?.vehicleType ?? null;

  return (
    <Card padded={false} elevated style={{ overflow: 'hidden' }}>
      {/* Driver header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ fontSize: 22 }}>🛵</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
            {driverName}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {vehicle ? `${vehicle.toLowerCase()} · ` : ''}Order {orderNumber}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="caption" color="textMuted">
            Arriving in
          </AppText>
          <AppText variant="h3" color="primary" style={{ fontSize: 15 }}>
            ~15 min
          </AppText>
        </View>
      </View>

      <View style={{ height: 200 }}>
        {markers.length > 0 ? (
          <AppMap
            scrollEnabled={false}
            region={focus ? { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : DEFAULT_REGION}
            markers={markers}
          />
        ) : (
          // No live location yet — a calm branded placeholder, not a blank map.
          <View style={{ flex: 1, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <AppText style={{ fontSize: 40 }}>🗺️</AppText>
            <AppText variant="bodySmall" color="textMuted" center style={{ maxWidth: 240 }}>
              Live location appears here once your driver sets off.
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
