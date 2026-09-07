import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Card, Divider, PriceRow, Screen } from '../components';
import { OrderStatusTracker } from '../features/order/OrderStatusTracker';
import { useAsync } from '../hooks/useAsync';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { ErrorState, FadeIn, MotiCard, PulsingDot, Shimmer, StatusBadge } from '../motion';
import { ORDER_STATUS, ORDER_TYPE, OrderStatus } from '../types/backend';
import { statusMeta as metaFor } from '../features/order/order-status.model';
import type { DeliveryTracking } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useOrderUpdates } from '../realtime/RealtimeProvider';
import { formatSar } from '../util/money';
import { driverProgress, freshnessLabel } from '../util/driverProgress';
import { pointOf } from '../util/branchChoice';
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
 * Statuses whose delivery leg the customer can be shown.
 *
 * **`READY` is in here on purpose.** The backend opens the `Delivery` record —
 * with the drop-off snapshot on it — the moment a delivery order reaches READY,
 * which is before anyone has been assigned to carry it. This panel used to
 * start at `DRIVER_ASSIGNED`, so for the whole window between the food being
 * ready and a driver being picked, a customer watching this screen saw nothing
 * about their delivery at all — no destination, no "we're finding a driver",
 * just an order that had apparently stopped. That window is exactly when people
 * ring the branch.
 */
const HAS_DELIVERY: OrderStatus[] = [
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

  const tracking = useAsync<DeliveryTracking | null>(
    () => (order?.type === ORDER_TYPE.DELIVERY ? api.trackDelivery(orderId).catch(() => null) : Promise.resolve(null)),
    [order?.type, tick],
  );

  const refreshNow = useCallback(() => {
    setTick((t) => t + 1);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!order || !ACTIVE.includes(order.status)) {
      return;
    }
    const timer = setTimeout(refreshNow, POLL_MS);
    return () => clearTimeout(timer);
  }, [order, tick, refreshNow]);

  /**
   * The push that makes this screen advance rather than catch up.
   *
   * The eight-second poll above is fine for "preparing" and wrong for the
   * moments a customer is actually staring at this screen — the branch
   * accepting the order, and a driver being assigned to it. The backend has
   * emitted `order.transitioned` into this customer's own room all along; this
   * is what listens. The poll stays as the floor, and the hook also fires once
   * on every reconnect so nothing missed while the socket was down is stranded.
   */
  useOrderUpdates(orderId, refreshNow);

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  const isActive = order && ACTIVE.includes(order.status);
  const statusMeta = order ? metaFor(order.status) : null;

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
          {order.type === ORDER_TYPE.DELIVERY && HAS_DELIVERY.includes(order.status) ? (
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
              {/* Guarded for the same reason `driver.user` is: the type
                  promises an array, and a type is a promise about a local
                  value rather than about what a server two deploys ahead
                  actually sends. `.map` on an absent field throws inside
                  render, which on this screen costs the customer the only
                  view of where their food is. */}
              {(order.items ?? []).map((item) => (
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
  // Read through `pointOf`, never straight off the payload. These are `Decimal`
  // columns and `Prisma.Decimal` serialises to a JSON string, so an older
  // backend sends `"24.72"` where the type used to say `number`. The string
  // crashed the web map (`.toFixed` on a string, inside render — this screen's
  // error boundary in a browser) and, more quietly, made every distance and ETA
  // vanish while the driver was pinging every thirty seconds.
  const driverPoint = pointOf({
    latitude: tracking?.driver?.currentLatitude,
    longitude: tracking?.driver?.currentLongitude,
  });
  const addressPoint = pointOf(tracking?.addressSnapshot);
  const driverLat = driverPoint?.latitude ?? null;
  const driverLng = driverPoint?.longitude ?? null;
  const addrLat = addressPoint?.latitude ?? null;
  const addrLng = addressPoint?.longitude ?? null;

  // Guarded, not asserted. `driver.user` used to be read straight through on
  // the strength of the type saying it was there; a null threw inside render
  // and unmounted the tree, so a customer chasing their food met the error
  // boundary. Every read of the tracking payload here is defensive for that
  // reason — see the note on `DeliveryTracking`.
  const fullName = tracking?.driver?.user?.fullName ?? null;

  const markers: MapMarker[] = [];
  if (driverLat !== null && driverLng !== null) {
    markers.push({ id: 'driver', latitude: driverLat, longitude: driverLng, kind: 'driver', title: fullName ?? 'Driver' });
  }
  if (addrLat !== null && addrLng !== null) {
    markers.push({ id: 'dest', latitude: addrLat, longitude: addrLng, kind: 'customer', title: 'Delivery address' });
  }
  const focus = markers[0];
  // Distance and an estimate from the driver's latest ping — and nothing at
  // all when there has not been one, or when it is too old to trust.
  const progress = driverProgress(
    tracking?.driver
      ? {
          latitude: driverLat,
          longitude: driverLng,
          lastLocationAt: tracking.driver.lastLocationAt,
        }
      : null,
    addressPoint,
  );
  const freshness = freshnessLabel(progress.fixAgeMs);
  // Nobody is carrying this yet: the delivery exists (the branch has the food
  // ready) but no driver has been assigned. Naming that state is the point of
  // showing the panel this early — "Finding a driver" is a different message
  // from a named driver with no position, and conflating them would put a
  // person's name against an order nobody has taken.
  const awaitingDriver = !tracking?.driver;
  // "Your driver" rather than the panel's waiting copy: a driver **is**
  // assigned here, we just have no name for them, and saying "Finding a driver"
  // would walk the customer's expectation backwards.
  const driverName = awaitingDriver ? 'Finding a driver' : (fullName ?? 'Your driver');
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
          {/* Derived from the driver's latest ping, and absent when there has
              not been one. This said a hard-coded "~15 min" to every customer
              on every order — a number nobody had worked out, on a screen whose
              whole job is telling the truth about where the food is.

              With no driver yet there is nothing to derive at all, so it says
              so rather than showing an em dash under "On its way", which reads
              as a number that failed to load. */}
          <AppText variant="caption" color="textMuted">
            {awaitingDriver ? 'Your order is' : progress.etaMinutes !== null ? 'Arriving in' : 'On its way'}
          </AppText>
          <AppText variant="h3" color="primary" style={{ fontSize: 15 }}>
            {awaitingDriver
              ? 'ready'
              : progress.etaMinutes !== null
                ? `about ${progress.etaMinutes} min`
                : progress.distanceKm !== null
                  ? `${progress.distanceKm} km away`
                  : '—'}
          </AppText>
        </View>
      </View>

      {/* How far away, and how fresh that is. A position on a map with no age
          on it is the thing customers misread: a driver who lost signal five
          minutes ago looks parked outside somebody else's house. */}
      {progress.distanceKm !== null || freshness ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          {progress.distanceKm !== null ? (
            <AppText variant="bodySmall" weight="700">
              {progress.distanceKm} km away
            </AppText>
          ) : null}
          {freshness ? (
            <AppText variant="caption" color={progress.live ? 'textMuted' : 'danger'}>
              {progress.live ? freshness : `last seen ${freshness.replace('updated ', '')}`}
            </AppText>
          ) : null}
        </View>
      ) : null}

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
            <AppText style={{ fontSize: 40 }}>{awaitingDriver ? '🛵' : '🗺️'}</AppText>
            <AppText variant="bodySmall" color="textMuted" center style={{ maxWidth: 240 }}>
              {awaitingDriver
                ? 'Your food is ready and we’re assigning a driver. The map appears as soon as one is on the way.'
                : 'Live location appears here once your driver sets off.'}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
