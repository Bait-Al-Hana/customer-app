import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address, Branch } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { toOrderItems } from '../cart/cart';
import { AppText, Button, Card, Divider, PaymentMethodCard, PriceRow, Screen } from '../components';
import { AddressCard } from '../components';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { ORDER_TYPE, OrderType, PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

const METHOD_META: Record<string, { label: string; glyph: string; hint?: string }> = {
  [PAYMENT_METHOD.CARD]: { label: 'Credit / debit card', glyph: '💳' },
  [PAYMENT_METHOD.MADA]: { label: 'mada', glyph: '🏧' },
  [PAYMENT_METHOD.APPLE_PAY]: { label: 'Apple Pay', glyph: '' },
  [PAYMENT_METHOD.GOOGLE_PAY]: { label: 'Google Pay', glyph: '🟢' },
  [PAYMENT_METHOD.CASH_ON_DELIVERY]: { label: 'Cash on delivery', glyph: '💵', hint: 'Pay the driver when it arrives' },
};

/** Choose fulfilment, review the server quote, pick a payment method, place order. */
export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, couponCode, notes, dispatch } = useCart();

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const [type, setType] = useState<OrderType>(route.params.type);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);
  const branch = branchesReq.data?.find((b) => b.id === branchId) ?? null;

  const { data: quote, loading, error, reload } = useAsync(
    () => api.quote({ branchId, type, items }),
    [branchId, JSON.stringify(items), type],
  );

  const addresses = useAsync<Address[]>(() => api.listAddresses(), []);
  const reloadAddresses = addresses.reload;
  useFocusEffect(useCallback(() => reloadAddresses(), [reloadAddresses]));

  useEffect(() => {
    if (type === ORDER_TYPE.DELIVERY && !addressId && addresses.data && addresses.data.length > 0) {
      setAddressId((addresses.data.find((a) => a.isDefault) ?? addresses.data[0])?.id ?? null);
    }
  }, [addresses.data, type, addressId]);

  // Available payment methods: COD only where the branch accepts it.
  const methods = useMemo<PaymentMethod[]>(() => {
    const base: PaymentMethod[] = [PAYMENT_METHOD.CARD, PAYMENT_METHOD.MADA, PAYMENT_METHOD.APPLE_PAY];
    if (branch?.acceptsCashOnDelivery) {
      base.push(PAYMENT_METHOD.CASH_ON_DELIVERY);
    }
    return base;
  }, [branch]);

  // If the selected method becomes unavailable (e.g. COD not accepted), reset.
  useEffect(() => {
    if (!methods.includes(method)) {
      setMethod(methods[0] ?? PAYMENT_METHOD.CARD);
    }
  }, [methods, method]);

  const isDelivery = type === ORDER_TYPE.DELIVERY;
  const needsAddress = isDelivery && !addressId;

  const placeOrder = async (): Promise<void> => {
    if (!branchId || needsAddress) {
      return;
    }
    setBusy(true);
    setPlaceError(null);
    try {
      const order = await api.placeOrder({
        branchId,
        type,
        paymentMethod: method,
        items,
        customerAddressId: isDelivery ? addressId ?? undefined : undefined,
        couponCode: couponCode ?? undefined,
        customerNotes: notes || undefined,
      });
      dispatch({ type: 'CLEAR' });
      if (method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
        navigation.replace('OrderSuccess', { orderId: order.id, orderNumber: order.orderNumber, method });
      } else {
        navigation.replace('PaymentProcessing', { orderId: order.id, orderNumber: order.orderNumber, method });
      }
    } catch (e) {
      setPlaceError(e instanceof ApiError ? e.message : 'Could not place the order. Try again.');
      setBusy(false);
    }
  };

  const typeTab = (t: OrderType, label: string, glyph: string, enabled: boolean) => {
    const active = type === t;
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: !enabled }}
        disabled={!enabled}
        onPress={() => setType(t)}
        style={{
          flex: 1,
          paddingVertical: 14,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          gap: 4,
          borderWidth: 1.5,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
          opacity: enabled ? 1 : 0.45,
        }}
      >
        <AppText style={{ fontSize: 22 }}>{glyph}</AppText>
        <AppText variant="bodySmall" weight="700" color={active ? 'primary' : 'text'}>
          {label}
        </AppText>
      </PressableScale>
    );
  };

  return (
    <Screen title="Checkout" onBack={() => navigation.goBack()}>
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        {/* Fulfilment type */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {typeTab(ORDER_TYPE.PICKUP, 'Pickup', '🏪', branch ? branch.acceptsPickup : true)}
          {typeTab(ORDER_TYPE.DELIVERY, 'Delivery', '🛵', branch ? branch.acceptsDelivery : true)}
        </View>

        {/* Delivery address */}
        {isDelivery ? (
          <View style={{ gap: 10 }}>
            <AppText variant="h3">Deliver to</AppText>
            {addresses.loading ? (
              <Skeleton height={64} radius={theme.radius.lg} />
            ) : addresses.data && addresses.data.length > 0 ? (
              addresses.data.map((a) => (
                <AddressCard
                  key={a.id}
                  label={a.label ?? 'Address'}
                  line={[a.line1, a.city].filter(Boolean).join(', ')}
                  isDefault={a.isDefault}
                  selected={a.id === addressId}
                  onPress={() => setAddressId(a.id)}
                />
              ))
            ) : (
              <AppText variant="bodySmall" color="textMuted">
                No saved address yet.
              </AppText>
            )}
            <PressableScale accessibilityRole="button" onPress={() => navigation.navigate('AddAddress')} style={{ paddingVertical: 6 }}>
              <AppText variant="bodySmall" weight="700" color="accent">
                + Add a new address
              </AppText>
            </PressableScale>
          </View>
        ) : null}

        {/* Order summary */}
        <Card elevated>
          <AppText variant="h3" style={{ marginBottom: 12 }}>
            Order summary
          </AppText>
          {loading ? (
            <View style={{ gap: 8 }}>
              <Skeleton height={16} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={20} />
            </View>
          ) : error ? (
            <ErrorState title="Couldn’t price your order" message={error.message} actionLabel="Retry" onAction={reload} />
          ) : quote ? (
            <>
              <PriceRow label="Subtotal" value={formatSar(quote.subtotalMinor)} />
              {quote.discountMinor > 0 ? <PriceRow label={`Discount${couponCode ? ` (${couponCode})` : ''}`} value={`- ${formatSar(quote.discountMinor)}`} tone="discount" /> : null}
              {quote.deliveryFeeMinor > 0 ? <PriceRow label="Delivery fee" value={formatSar(quote.deliveryFeeMinor)} /> : null}
              <PriceRow label={`VAT (${quote.vatRate}%, incl.)`} value={formatSar(quote.vatMinor)} />
              <Divider style={{ marginVertical: 6 }} />
              <PriceRow label="Total" value={formatSar(quote.totalMinor)} emphasis />
            </>
          ) : null}
        </Card>

        {/* Payment method */}
        <View style={{ gap: 10 }}>
          <AppText variant="h3">Payment method</AppText>
          {methods.map((m) => (
            <PaymentMethodCard
              key={m}
              glyph={METHOD_META[m]?.glyph ?? '💳'}
              label={METHOD_META[m]?.label ?? m}
              hint={METHOD_META[m]?.hint}
              selected={method === m}
              onPress={() => setMethod(m)}
            />
          ))}
        </View>

        <AppText variant="caption" color="textMuted" center style={{ paddingHorizontal: 12 }}>
          Payment is confirmed by our server — never by this screen alone. No card details are stored in this app.
        </AppText>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
        <Button
          label={
            needsAddress
              ? 'Add a delivery address'
              : method === PAYMENT_METHOD.CASH_ON_DELIVERY
                ? quote
                  ? `Place order · ${formatSar(quote.totalMinor)}`
                  : 'Place order'
                : quote
                  ? `Pay · ${formatSar(quote.totalMinor)}`
                  : 'Pay'
          }
          onPress={needsAddress ? () => navigation.navigate('AddAddress') : placeOrder}
          busy={busy}
          disabled={!quote || !!error}
        />
      </View>
    </Screen>
  );
}
