import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address, Branch, CustomerProfile, OrderQuote } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { useFulfilment } from '../fulfilment/FulfilmentProvider';
import { toOrderItems } from '../cart/cart';
import { AppText, BillSummary, Card, PaymentMethodCard, Screen } from '../components';
import { AddressCard } from '../components';
import { BillIcon, ChevronRight, ClockIcon, PhoneIcon, PinIcon, ScooterIcon } from '../components/icons';
import { useAsync } from '../hooks/useAsync';
import { BottomSheet, ErrorState, FadeIn, PressableScale, PulseButton, Shimmer, Toast } from '../motion';
import { ORDER_TYPE, OrderType, PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { correctedType, fulfilmentOptions } from '../util/fulfilment';
import { applePaySessionGlobal, supportsApplePay } from '../util/applePay';
import { discountLabel as buildDiscountLabel } from '../util/coupon';
import { formatSar, formatVatRate } from '../util/money';
import { useTheme } from '../theme/theme';

/**
 * The name beside each method's mark. The marks themselves live in
 * `PaymentMark` — this used to carry an emoji per method, and the Apple one was
 * a private-use character that rendered as an empty box everywhere but iOS.
 */
const METHOD_META: Record<string, { label: string; hint?: string }> = {
  [PAYMENT_METHOD.CARD]: { label: 'Credit / debit card' },
  [PAYMENT_METHOD.MADA]: { label: 'mada' },
  [PAYMENT_METHOD.APPLE_PAY]: { label: 'Apple Pay' },
  [PAYMENT_METHOD.GOOGLE_PAY]: { label: 'Google Pay' },
  [PAYMENT_METHOD.CASH_ON_DELIVERY]: { label: 'Cash on delivery', hint: 'Pay the driver when it arrives' },
};

/** Choose fulfilment, review the server quote, pick a payment method, place order. */
export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, couponCode, notes, dispatch, idempotencyKey } = useCart();
  const { mode: fulfilmentMode, setMode: setFulfilmentMode } = useFulfilment();

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  // The mode the customer chose on home. Checkout still lets them change it
  // where the branch does both — but the change writes back, so home, the
  // prices and the placement never disagree about what this order is.
  const [type, setTypeState] = useState<OrderType>(route.params.type ?? fulfilmentMode);
  const setType = (next: OrderType): void => {
    setTypeState(next);
    setFulfilmentMode(next);
  };
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  // The bill starts collapsed: the total and how much of it is VAT are on the
  // row itself, and most customers want the number, not the derivation. The
  // derivation is one tap away and never more than that.
  const [billOpen, setBillOpen] = useState(false);
  // The address picker opens from its row rather than always occupying the
  // screen — most orders go to the same place every time.
  const [pickingAddress, setPickingAddress] = useState(false);

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
  // A valid code that lost to a bigger standing offer. Deliberately not routed
  // through `couponError`: the code works and was not spent, and telling a
  // customer their working code is broken is its own support call.
  const couponSuperseded = priced?.couponSuperseded ?? null;
  // Delivery can be refused for two reasons the customer can act on. Surfacing
  // them here — while the basket is still open — is the whole point of a quote
  // that returns totals instead of throwing: "add 15.00 more" is a thing you
  // can do, "your order was rejected" on the last press is not.
  const blocker = priced?.delivery?.blockers?.[0] ?? null;
  /**
   * The branch being shut is a third blocker, and the one nothing on this
   * screen can fix.
   *
   * It leads the banner for the same reason the others do — a refusal that
   * arrives on the Pay button has already wasted the visit — and it is checked
   * **first**, because "add 15.00 more" is useless advice to someone whose
   * branch closed an hour ago. The server writes the sentence (it knows the
   * opening time and any holiday note); an older backend sends nothing here and
   * the screen simply says less.
   */
  const branchClosedMessage =
    priced?.branchOpen && !priced.branchOpen.isOpen
      ? (priced.branchOpen.message ?? 'This branch is closed right now.')
      : null;
  const deliveryBlockerMessage =
    blocker === null
      ? null
      : blocker.code === 'BELOW_MINIMUM'
        ? `Delivery orders start at ${formatSar(blocker.minOrderMinor)}. Add ${formatSar(blocker.shortfallMinor)} more to continue.`
        : `This address is ${blocker.distanceKm} km away and this branch delivers up to ${blocker.maxRadiusKm} km. Choose pickup, or a nearer address.`;
  const blockerMessage = branchClosedMessage ?? deliveryBlockerMessage;
  // Only a code the server actually priced is sent with the order. A code that
  // failed here must not stay silently attached to the placement.
  const appliedCoupon = priced?.coupon?.code ?? null;
  // What the bill calls the discount: the offer's name, with the code beside
  // it. "SAVE20 applied" is a receipt for something the customer has to
  // remember; the name is what they tapped on the Offers page.
  const discountLabel = buildDiscountLabel(priced);

  // The name and number the kitchen would call. Shown on the order card
  // because "who is this for" is part of checking an order over, and a wrong
  // number is only ever noticed here or at the door.
  const profile = useAsync<CustomerProfile | null>(() => api.getProfile().catch(() => null), []);
  const profileName = profile.data?.fullName ?? null;
  const profilePhone = profile.data?.phone ?? null;

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
    const base: PaymentMethod[] = [PAYMENT_METHOD.CARD, PAYMENT_METHOD.MADA];
    // Apple Pay is offered only where it can actually be completed — but
    // "where" is a question about the browser, not the OS. This was
    // `Platform.OS === 'ios'`, which is 'web' on the web build even on an
    // iPhone, so it hid Apple Pay from exactly the devices that have it. See
    // `util/applePay.ts`.
    if (supportsApplePay({ os: Platform.OS, applePaySession: applePaySessionGlobal() })) {
      base.push(PAYMENT_METHOD.APPLE_PAY);
    }
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

  // What this branch actually offers, and whether the customer is on a type it
  // will accept. Both are pure rules in ../util/fulfilment, tested there.
  const { offersPickup, offersDelivery, showsChoice, closed } = fulfilmentOptions(branch);

  useEffect(() => {
    const corrected = correctedType(branch, type);
    if (corrected !== null) {
      setType(corrected);
    }
  }, [branch, type]);

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
          paddingVertical: 12,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          gap: 2,
          borderWidth: 1.5,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
          opacity: enabled ? 1 : 0.45,
        }}
      >
        <AppText style={{ fontSize: 20 }}>{glyph}</AppText>
        <AppText variant="bodySmall" weight="700" color={active ? 'primary' : 'text'}>
          {label}
        </AppText>
      </PressableScale>
    );
  };

  const selectedAddress = addresses.data?.find((a) => a.id === addressId) ?? null;
  const addressLine = selectedAddress
    ? [selectedAddress.line1, selectedAddress.district, selectedAddress.city].filter(Boolean).join(', ')
    : null;

  const savedMinor = quote?.discountMinor ?? 0;
  // What the order would have cost without the discount. Shown struck through
  // beside the total, which is the only way a saving reads as a saving rather
  // than as a number we made up.
  const beforeSavingMinor = quote ? quote.totalMinor + savedMinor : 0;

  return (
    <Screen
      title={branch?.name ?? 'Checkout'}
      subtitle={
        isDelivery
          ? `${branch?.prepTimeMinutes ?? 30}–${(branch?.prepTimeMinutes ?? 30) + 15} mins${selectedAddress?.label ? ` to ${selectedAddress.label}` : ''}`
          : 'Collect from the branch'
      }
      onBack={() => navigation.goBack()}
    >
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {/* Why this order cannot be placed, first and unmissable.
            It used to appear only in the sticky pay bar, as small red text
            beside a large button still showing a price — so the first thing a
            customer read was an amount they could not pay, and the reason was
            the smallest thing on the screen. What blocks an order belongs above
            the form that cannot fix it. */}
        {blockerMessage ? (
          <FadeIn translateY={8}>
            <View
              accessibilityRole="alert"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.dangerSoft,
                borderWidth: 1,
                borderColor: theme.colors.danger,
              }}
            >
              <AppText style={{ fontSize: 16 }}>⚠️</AppText>
              <AppText
                variant="bodySmall"
                weight="700"
                style={{ color: theme.colors.danger, flex: 1 }}
              >
                {blockerMessage}
              </AppText>
            </View>
          </FadeIn>
        ) : null}

        {/* The saving, stated before anything else. It is the reason the
            customer feels good about this screen, and burying it under the
            form is why so many checkouts feel like paperwork. */}
        {savedMinor > 0 ? (
          <FadeIn translateY={8}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.successSoft,
              }}
            >
              <AppText style={{ fontSize: 18 }}>🎉</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="700" style={{ color: theme.colors.success }}>
                  You saved {formatSar(savedMinor)} on this order
                </AppText>
                {/* Which offer did it. A saving with no name attached is one
                    the customer cannot check, and cannot ask about. */}
                {discountLabel ? (
                  <AppText variant="caption" style={{ color: theme.colors.success, marginTop: 2 }}>
                    {discountLabel}
                  </AppText>
                ) : null}
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* Only what this branch offers. With one option there is no choice to
            present, so the row becomes a statement rather than a pair of tabs
            one of which cannot be pressed. */}
        {showsChoice ? (
          <FadeIn translateY={8} delay={40}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {typeTab(ORDER_TYPE.PICKUP, 'Pickup', '🏪', true)}
              {typeTab(ORDER_TYPE.DELIVERY, 'Delivery', '🛵', true)}
            </View>
          </FadeIn>
        ) : offersDelivery || offersPickup ? (
          <FadeIn translateY={8} delay={40}>
            <AppText variant="bodySmall" color="textMuted">
              {offersDelivery
                ? 'This branch delivers only — pickup is not available here right now.'
                : 'This branch is pickup only — it is not delivering right now.'}
            </AppText>
          </FadeIn>
        ) : (
          <FadeIn translateY={8} delay={40}>
            <AppText variant="bodySmall" color="danger">
              This branch is not taking orders right now. Try another branch.
            </AppText>
          </FadeIn>
        )}

        {/* One card carrying the whole order at a glance: when, where, who,
            how much. Each row opens the thing it describes. */}
        <FadeIn translateY={8} delay={80}>
          <Card padded={false} elevated>
            {isDelivery ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderTopLeftRadius: theme.radius.lg,
                  borderTopRightRadius: theme.radius.lg,
                }}
              >
                <AppText variant="bodySmall" color="textMuted" style={{ flex: 1 }}>
                  Delivered by our own team, from our own kitchen. No third party
                  handles your order or your food.
                </AppText>
                <ScooterIcon color={theme.colors.primary} size={30} />
              </View>
            ) : null}

            <DetailRow
              icon={<ClockIcon color={theme.colors.textMuted} />}
              title={
                isDelivery
                  ? `Delivery in ${branch?.prepTimeMinutes ?? 30}–${(branch?.prepTimeMinutes ?? 30) + 15} mins`
                  : `Ready in about ${branch?.prepTimeMinutes ?? 20} mins`
              }
              subtitle={isDelivery ? 'Cooked to order, then straight out' : 'We will hold it warm at the counter'}
            />

            {isDelivery ? (
              <DetailRow
                icon={<PinIcon color={theme.colors.textMuted} size={22} />}
                title={selectedAddress ? `Delivery at ${selectedAddress.label ?? 'your address'}` : 'Choose a delivery address'}
                subtitle={addressLine ?? 'We need somewhere to bring it'}
                onPress={() => setPickingAddress(true)}
              />
            ) : (
              <DetailRow
                icon={<PinIcon color={theme.colors.textMuted} size={22} />}
                title={`Collect from ${branch?.name ?? 'the branch'}`}
                subtitle={[branch?.addressLine, branch?.city].filter(Boolean).join(', ') || 'Branch address'}
              />
            )}

            <DetailRow
              icon={<PhoneIcon color={theme.colors.textMuted} />}
              title={profileName ?? 'Your contact number'}
              subtitle={profilePhone ?? 'So the kitchen can reach you'}
              onPress={() => navigation.navigate('Profile')}
            />

            <DetailRow
              icon={<BillIcon color={theme.colors.textMuted} />}
              last
              title={
                loading || !quote ? (
                  <Shimmer height={18} width={140} radius={6} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <AppText variant="h3">Total bill</AppText>
                    {savedMinor > 0 ? (
                      <AppText
                        variant="bodySmall"
                        color="textMuted"
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {formatSar(beforeSavingMinor)}
                      </AppText>
                    ) : null}
                    <AppText variant="h3">{formatSar(quote.totalMinor)}</AppText>
                  </View>
                )
              }
              /* The ask that started this: prices are VAT-inclusive, so the VAT
                 is inside that total — and a customer who cannot see how much
                 of it is tax has to take our word for the number. It is stated
                 here on the collapsed row, and again as its own line when the
                 breakdown is open. */
              subtitle={
                quote
                  ? [
                      `Includes ${formatSar(quote.vatMinor)} VAT`,
                      // The rate arrives as the decimal fraction it is stored
                      // as ("0.15"), so this read "VAT at 0.15%" — a wrong
                      // number on the one line whose job is showing the
                      // customer the total can be checked. Dropped entirely
                      // when it cannot be parsed, rather than printing NaN.
                      formatVatRate(quote.vatRate) ? `at ${formatVatRate(quote.vatRate)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : 'Pricing your order…'
              }
              onPress={() => setBillOpen(true)}
            />

            {/* Deliberately outside the collapsible panel. A code that did not
                apply changes what the customer is about to pay, so it has to be
                visible whether or not they thought to open the bill — the whole
                reason the backend returns a priced quote plus couponError
                instead of failing the request. */}
            {couponError ? (
              <AppText variant="caption" color="danger" style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                {couponCode ? `${couponCode}: ` : ''}
                {couponError} — the total above is without it.
              </AppText>
            ) : couponSuperseded ? (
              // Outside the panel for the same reason as the error above: it
              // explains the amount on the button. Muted rather than red —
              // nothing went wrong, and the customer is better off than the
              // code would have left them.
              <AppText
                variant="caption"
                color="textMuted"
                style={{ paddingHorizontal: 14, paddingBottom: 12 }}
              >
                {couponCode ? `${couponCode}: ` : ''}
                {couponSuperseded}
              </AppText>
            ) : null}

          </Card>
        </FadeIn>

        {/* Address picker, opened from the row above rather than always taking
            up the screen — most orders go to the same place every time. */}
        {isDelivery && pickingAddress ? (
          <FadeIn translateY={8}>
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
                    onPress={() => {
                      setAddressId(a.id);
                      setPickingAddress(false);
                    }}
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

        <FadeIn translateY={8} delay={140}>
          <View style={{ gap: 10 }}>
            <AppText variant="h3">Payment method</AppText>
            {methods.map((m) => (
              <PaymentMethodCard
                key={m}
                method={m}
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

      {/* The bill, on its own sheet. It is the thing a customer opens when they
          want to check a number, so it gets the whole screen's attention rather
          than being an accordion inside a card they are also reading. */}
      <BottomSheet visible={billOpen} onClose={() => setBillOpen(false)}>
        <View style={{ padding: 20, gap: 16 }}>
          <AppText variant="h1">Bill Summary</AppText>
          {error ? (
            <ErrorState
              title="Couldn't price your order"
              message={error.message}
              actionLabel="Retry"
              onAction={reload}
            />
          ) : quote ? (
            <BillSummary quote={quote} rows={priced?.breakdown} couponLabel={discountLabel} />
          ) : (
            <View style={{ gap: 8 }}>
              <Shimmer height={16} />
              <Shimmer width="70%" height={16} />
              <Shimmer width="50%" height={20} />
            </View>
          )}
          <AppText variant="caption" color="textMuted" center>
            Prices include VAT. This is an order summary, not a tax invoice.
          </AppText>
        </View>
      </BottomSheet>

      {/* The pay bar: what you are paying with on the left, what you are paying
          on the right. It stays put while the page scrolls, so the amount is
          never something you have to scroll back to find. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Paying with ${METHOD_META[method]?.label ?? method}. Change payment method.`}
          onPress={() => setMethod(methods[(methods.indexOf(method) + 1) % methods.length] ?? method)}
          style={{ maxWidth: 130 }}
        >
          <AppText variant="overline" color="textMuted">
            PAY USING
          </AppText>
          <AppText variant="bodySmall" weight="700" numberOfLines={1}>
            {METHOD_META[method]?.label ?? method}
          </AppText>
        </PressableScale>

        <View style={{ flex: 1 }}>
          {/* Deliberately shorter than the banner above: the pay bar is sticky,
              so this is the reminder for someone who has scrolled past the
              explanation, not a second copy of it. */}
          {branchClosedMessage ? (
            <AppText variant="caption" color="danger" style={{ marginBottom: 8 }}>
              {branchClosedMessage}
            </AppText>
          ) : blocker?.code === 'OUT_OF_RANGE' ? (
            <AppText variant="caption" color="danger" style={{ marginBottom: 8 }}>
              This branch does not deliver that far.
            </AppText>
          ) : blockerMessage && blocker?.code !== 'BELOW_MINIMUM' ? (
            <AppText variant="caption" color="danger" style={{ marginBottom: 8 }}>
              {blockerMessage}
            </AppText>
          ) : null}
          <PulseButton
            label={
              // A closed branch outranks every other label: the button must
              // never offer to take money for an order the server will refuse,
              // and "Add 15.00 more" would send someone shopping for a branch
              // that shut an hour ago.
              branchClosedMessage
                ? 'Branch closed'
                : needsAddress
                ? 'Add a delivery address'
                : blocker?.code === 'BELOW_MINIMUM'
                  ? `Add ${formatSar(blocker.shortfallMinor)} more`
                  : // A button that reads "SAR 11.00 · Pay" while it is disabled
                    // is the loudest thing on the screen contradicting the one
                    // line that explains why nothing is happening. Out of range
                    // is not fixable here with this address, so the button says
                    // what would fix it instead of quoting a price we will not
                    // take.
                    blocker?.code === 'OUT_OF_RANGE'
                    ? 'Too far to deliver'
                    : quote
                      ? `${formatSar(quote.totalMinor)}  ·  ${method === PAYMENT_METHOD.CASH_ON_DELIVERY ? 'Place order' : 'Pay'}`
                      : 'Place order'
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
            disabled={
              !quote ||
              !!error ||
              branchClosedMessage !== null ||
              blocker?.code === 'OUT_OF_RANGE' ||
              // Neither fulfilment type on offer: there is nothing to place.
              closed
            }
          />
        </View>
      </View>
    </Screen>
  );
}

/**
 * One line of the order-at-a-glance card: an icon, a title, a supporting line,
 * and a chevron when the row opens something.
 *
 * The chevron is the honest part — it appears only on rows that actually do
 * something when tapped, so a row without one is not a control the customer is
 * failing to find.
 */
function DetailRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string | null;
  onPress?: () => void;
  last?: boolean;
}): React.JSX.Element {
  const theme = useTheme();

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? <AppText variant="h3">{title}</AppText> : title}
        {subtitle ? (
          <AppText variant="bodySmall" color="textMuted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? (
        <ChevronRight color={theme.colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <PressableScale accessibilityRole="button" onPress={onPress}>
      {body}
    </PressableScale>
  );
}
