import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address, Branch, OrderQuote } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { toOrderItems } from '../cart/cart';
import { AppText, Card, OrderSummaryRows, PaymentMethodCard, Screen } from '../components';
import { AddressCard } from '../components';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, FadeIn, PressableScale, PulseButton, Shimmer, StepIndicator, Toast } from '../motion';
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

function checkoutStep(type: OrderType, addressId: string | null, quote: unknown): number {
  if (!quote) return 0;
  if (type === ORDER_TYPE.DELIVERY && !addressId) return 1;
  return 2;
}

/** Choose fulfilment, review the server quote, pick a payment method, place order. */
export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, couponCode, notes, dispatch, idempotencyKey } = useCart();

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const [type, setType] = useState<OrderType>(route.params.type);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);
  const branch = branchesReq.data?.find((b) => b.id === branchId) ?? null;

  // Prices *with* the coupon, so the total on screen is the total charged.
  // `/pricing/quote` has no coupon field at all, so a checkout that used it
  // showed a discount of zero and the customer only discovered the real price
  // after placing — or, for a code that had since expired, hit a failure on the
  // very last press instead of while there was still time to fix it.
  // The address is part of the price, not just the destination: the delivery
  // fee is 5 SAR plus 3 SAR for each km past the first 5, measured from this
  // branch to this address. A quote sent without it comes back at the base fee
  // and the customer meets the real fee only when the order is placed — the
  // same "price changed at the last second" failure the coupon-aware quote was
  // introduced to prevent. So it is sent, and it is in the dependency list.
  const { data: priced, loading, error, reload } = useAsync<OrderQuote>(
    () =>
      api.quoteOrder({
        branchId,
        type,
        items,
        couponCode: couponCode ?? undefined,
        customerAddressId: type === ORDER_TYPE.DELIVERY ? (addressId ?? undefined) : undefined,
      }),
    [branchId, JSON.stringify(items), type, couponCode, addressId],
  );
  const quote = priced?.quote ?? null;
  const couponError = priced?.couponError ?? null;
  // Delivery can be refused for two reasons the customer can act on. Surfacing
  // them here — while the basket is still open — is the whole point of a quote
  // that returns totals instead of throwing: "add 15.00 more" is a thing you
  // can do, "your order was rejected" on the last press is not.
  const blocker = priced?.delivery?.blockers?.[0] ?? null;
  const blockerMessage =
    blocker === null
      ? null
      : blocker.code === 'BELOW_MINIMUM'
        ? `Delivery orders start at ${formatSar(blocker.minOrderMinor)}. Add ${formatSar(blocker.shortfallMinor)} more to continue.`
        : `This address is ${blocker.distanceKm} km away and this branch delivers up to ${blocker.maxRadiusKm} km. Choose pickup, or a nearer address.`;
  // Only a code the server actually priced is sent with the order. A code that
  // failed here must not stay silently attached to the placement.
  const appliedCoupon = priced?.coupon?.code ?? null;

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
        couponCode: appliedCoupon ?? undefined,
        customerNotes: notes || undefined,
      }, idempotencyKey);
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

  const currentStep = checkoutStep(type, addressId, quote);
  const steps = isDelivery ? ['Type', 'Address', 'Pay'] : ['Type', 'Pay'];

  return (
    <Screen title="Checkout" onBack={() => navigation.goBack()}>
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <FadeIn translateY={8}>
          <StepIndicator steps={steps} current={currentStep} />
        </FadeIn>

        {/* Fulfilment type */}
        <FadeIn translateY={8} delay={40}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {typeTab(ORDER_TYPE.PICKUP, 'Pickup', '🏪', branch ? branch.acceptsPickup : true)}
            {typeTab(ORDER_TYPE.DELIVERY, 'Delivery', '🛵', branch ? branch.acceptsDelivery : true)}
          </View>
        </FadeIn>

        {/* Delivery address */}
        {isDelivery ? (
          <FadeIn translateY={8} delay={60}>
            <View style={{ gap: 10 }}>
              <AppText variant="h3">Deliver to</AppText>
              {addresses.loading ? (
                <Shimmer height={64} radius={theme.radius.lg} />
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
          </FadeIn>
        ) : null}

        {/* Order summary */}
        <FadeIn translateY={8} delay={120}>
          <Card elevated>
            <AppText variant="h3" style={{ marginBottom: 12 }}>
              Order summary
            </AppText>
            {loading ? (
              <View style={{ gap: 8 }}>
                <Shimmer height={16} />
                <Shimmer width="70%" height={16} />
                <Shimmer width="50%" height={20} />
              </View>
            ) : error ? (
              <ErrorState title="Couldn't price your order" message={error.message} actionLabel="Retry" onAction={reload} />
            ) : quote ? (
              <>
                {/* The backend's own itemised list, so this summary, the branch
                    view and the owner view show the same numbers — and so a row
                    the backend adds later appears here with no change. Falls
                    back to the quote's columns on an older backend. */}
                <OrderSummaryRows
                  quote={quote}
                  rows={priced?.breakdown}
                  couponLabel={appliedCoupon}
                />
                {couponError ? (
                  <AppText variant="caption" color="danger" style={{ marginTop: 8 }}>
                    {couponCode ? `${couponCode}: ` : ''}
                    {couponError} — the price above is without it.
                  </AppText>
                ) : null}
              </>
            ) : null}
          </Card>
        </FadeIn>

        {/* Payment method */}
        <FadeIn translateY={8} delay={180}>
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
        </FadeIn>

        <AppText variant="caption" color="textMuted" center style={{ paddingHorizontal: 12 }}>
          Your card information is never stored by us.
        </AppText>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
        {blockerMessage ? (
          <AppText variant="bodySmall" color="danger" style={{ marginBottom: 10 }}>
            {blockerMessage}
          </AppText>
        ) : null}
        <PulseButton
          label={
            needsAddress
              ? 'Add a delivery address'
              : blocker?.code === 'BELOW_MINIMUM'
                ? `Add ${formatSar(blocker.shortfallMinor)} more`
                : method === PAYMENT_METHOD.CASH_ON_DELIVERY
                  ? quote
                    ? `Place order · ${formatSar(quote.totalMinor)}`
                    : 'Place order'
                  : quote
                    ? `Pay · ${formatSar(quote.totalMinor)}`
                    : 'Pay'
          }
          onPress={
            needsAddress
              ? () => navigation.navigate('AddAddress')
              : blocker?.code === 'BELOW_MINIMUM'
                ? // Back to the menu is the action, not a dead button: the
                  // customer has been told what to do, so let them do it.
                  () => navigation.goBack()
                : placeOrder
          }
          busy={busy}
          // Out of range is not fixable from this screen with this address, so
          // the button is disabled; being under the minimum is, so it is not.
          disabled={!quote || !!error || blocker?.code === 'OUT_OF_RANGE'}
        />
      </View>
    </Screen>
  );
}
