import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Divider, InfoRow, PrimaryButton, Screen } from '../components/ui';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import {
  ErrorState,
  FadeIn,
  PulsingDot,
  Skeleton,
  SlideIn,
  StatusBadge,
} from '../motion';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../types/backend';
import type { DeliveryTracking } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';
import { STATUS_META } from '../features/order/order-status.model';

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

export function OrderTrackingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);
  const [tick, setTick] = useState(0);

  const tracking = useAsync<DeliveryTracking | null>(
    () => (order?.type === ORDER_TYPE.DELIVERY ? api.trackDelivery(orderId) : Promise.resolve(null)),
    [order?.type, tick],
  );

  useEffect(() => {
    if (!order || !ACTIVE.includes(order.status)) return;
    const timer = setTimeout(() => {
      setTick((t) => t + 1);
      reload();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [order, tick, reload]);

  const isActive = order && ACTIVE.includes(order.status);
  const statusMeta = order ? STATUS_META[order.status] : null;

  return (
    <Screen title="Your order" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Branches')}>
      {loading && !order ? (
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton height={36} width="60%" radius={theme.radius.sm} />
          <Skeleton height={240} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
        </View>
      ) : error && !order ? (
        <ErrorState title="Couldn't load your order" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : order ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}>
          {/* Order header */}
          <FadeIn translateY={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Order</Text>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
                  {order.orderNumber}
                </Text>
              </View>
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

          {/* Status tracker */}
          <FadeIn translateY={8} delay={60}>
            <Card>
              <OrderStatusTracker status={order.status} type={order.type} />
            </Card>
          </FadeIn>

          {/* Map */}
          {(() => {
            const d = tracking.data;
            const driverLat = d?.driver?.currentLatitude ?? null;
            const driverLng = d?.driver?.currentLongitude ?? null;
            const addrLat = d?.addressSnapshot?.latitude ?? null;
            const addrLng = d?.addressSnapshot?.longitude ?? null;
            if (order.type !== ORDER_TYPE.DELIVERY || (driverLat === null && addrLat === null)) return null;

            const markers: MapMarker[] = [];
            if (driverLat !== null && driverLng !== null) {
              markers.push({ id: 'driver', latitude: driverLat, longitude: driverLng, kind: 'driver', title: d?.driver?.user.fullName ?? 'Driver' });
            }
            if (addrLat !== null && addrLng !== null) {
              markers.push({ id: 'dest', latitude: addrLat, longitude: addrLng, kind: 'customer', title: 'Delivery address' });
            }
            const focus = markers[0];

            return (
              <FadeIn translateY={8} delay={120}>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <View style={{ height: 220 }}>
                    <AppMap
                      scrollEnabled={false}
                      region={focus ? { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : DEFAULT_REGION}
                      markers={markers}
                    />
                  </View>
                  {d?.driver ? (
                    <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.colors.primary + '14',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>🚗</Text>
                      </View>
                      <View>
                        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{d.driver.user.fullName}</Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Your driver</Text>
                      </View>
                    </View>
                  ) : null}
                </Card>
              </FadeIn>
            );
          })()}

          {/* Order items */}
          <FadeIn translateY={8} delay={180}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <Text style={{ fontSize: 15 }}>🧾</Text>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>Order items</Text>
              </View>
              {order.items.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>{item.quantity}×</Text>
                    </View>
                    <Text style={{ color: theme.colors.text, fontSize: 14, flex: 1 }}>{item.productName}</Text>
                  </View>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>{formatSar(item.lineTotalMinor)}</Text>
                </View>
              ))}
              <Divider spacing={8} />
              <InfoRow label="Total" value={formatSar(order.totalMinor)} bold />
            </Card>
          </FadeIn>

          <SlideIn direction="up" distance={10} delay={240}>
            <PrimaryButton label="Back to home" onPress={() => navigation.replace('Branches')} variant="outline" />
          </SlideIn>
        </ScrollView>
      ) : null}
    </Screen>
  );
}
