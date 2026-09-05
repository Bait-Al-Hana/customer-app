import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Address, OrderQuote } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { estimatedTotalMinor, toOrderItems } from '../cart/cart';
import { AppText, BillSummary, Button, Card, Screen } from '../components';
import { FoodImage, glyphFor } from '../components/FoodImage';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, FadeIn, MotiCard, PressableScale, PulseButton, QuantityStepper, Shimmer, Stagger, SwipeAction, Toast } from '../motion';
import { useFulfilment } from '../fulfilment/FulfilmentProvider';
import { RootStackParamList } from '../navigation/types';
import { ORDER_TYPE } from '../types/backend';
import { couponLabel } from '../util/coupon';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

/** The cart: review items, apply a coupon, add notes, and go to checkout. */
export function CartScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Cart'>): React.JSX.Element {
  const theme = useTheme();
  const { cart, count, dispatch, couponCode, setCouponCode, notes, setNotes } = useCart();
  // Checkout opens on the mode the customer chose on home. It used to open on
  // pickup unconditionally, so a delivery customer met a pickup total and had
  // to notice the tab to fix it.
  const { mode } = useFulfilment();
  const { api } = useAuth();
  const [couponInput, setCouponInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // The cart shows the **server's** bill, not an estimate of it.
  //
  // It used to say "Calculated at checkout" against the delivery fee and the
  // VAT, so the only number on the screen was an item subtotal — and the first
  // time a customer saw what they were actually paying was the screen where
  // they were being asked to pay it. Every fee is decided server-side and the
  // same priced quote checkout uses is one call away, so this asks for it here
  // too: the delivery fee, the VAT inside the total, any charge the owner has
  // added by its own name, and the discount an applied code takes off.
  //
  // The address matters for the same reason it does at checkout: the delivery
  // fee is priced from its distance to the branch. This sends the address
  // checkout will itself default to, so the two screens quote the same fee
  // rather than this one showing the base fee and checkout showing the real one.
  const addresses = useAsync<Address[]>(() => api.listAddresses().catch(() => []), []);
  const defaultAddressId =
    (addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0])?.id ?? null;
  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const { data: priced, loading: pricing } = useAsync<OrderQuote | null>(
    () =>
      branchId && items.length > 0
        ? api
            .quoteOrder({
              branchId,
              type: mode,
              items,
              couponCode: couponCode ?? undefined,
              customerAddressId:
                mode === ORDER_TYPE.DELIVERY ? (defaultAddressId ?? undefined) : undefined,
            })
            // A quote that fails must not take the cart down with it: the
            // customer can still review their items and go to checkout, which
            // reports the failure properly and offers a retry.
            .catch(() => null)
        : Promise.resolve(null),
    [branchId, JSON.stringify(items), mode, couponCode, defaultAddressId],
  );
  const quote = priced?.quote ?? null;
  const quoteCouponError = priced?.couponError ?? null;
  const discountLabel = couponLabel(priced?.coupon ?? null);
  // Only ever the server's number. `estimatedTotalMinor` stands in while the
  // quote is in flight, and is labelled an estimate wherever it shows.
  const payableMinor = quote?.totalMinor ?? estimatedTotalMinor(cart);

  if (count === 0) {
    return (
      <Screen title="Cart" onBack={() => navigation.goBack()}>
        <EmptyState
          glyph="🛒"
          title="Your cart is empty"
          message="Browse the menu and add something delicious to get started."
          actionLabel="Browse menu"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const applyCoupon = (): void => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      return;
    }
    setCouponCode(code);
    setCouponInput('');
    setToast(`Coupon ${code} added`);
  };

  return (
    <Screen title="Cart" subtitle={`${count} item${count === 1 ? '' : 's'}`} onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone="success" onHide={() => setToast(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Stagger>
          {cart.lines.map((line) => (
            <SwipeAction
              key={line.key}
              onSwipe={() => dispatch({ type: 'REMOVE', key: line.key })}
              actionLabel="Remove"
            >
              <MotiCard from="left">
                <View style={{ flexDirection: 'row', padding: 0, gap: 12 }}>
                  <FoodImage uri={undefined} glyph={glyphFor(line.productName)} height={72} style={{ width: 72 }} radius={theme.radius.md} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
                      {line.productName}
                    </AppText>
                    {line.addonNames.length > 0 ? (
                      <AppText variant="caption" color="textMuted" numberOfLines={2} style={{ marginTop: 2 }}>
                        {line.addonNames.join(', ')}
                      </AppText>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <AppText variant="price" color="primary">
                        {formatSar(line.unitPriceMinor * line.quantity)}
                      </AppText>
                      <QuantityStepper value={line.quantity} onChange={(q) => dispatch({ type: 'SET_QTY', key: line.key, quantity: q })} min={0} />
                    </View>
                  </View>
                </View>
              </MotiCard>
            </SwipeAction>
          ))}
        </Stagger>

        {/* Coupon */}
        <FadeIn translateY={8}>
          <Card>
            <AppText variant="caption" color="textMuted" weight="600" style={{ marginBottom: 8 }}>
              Have a coupon?
            </AppText>
            {couponCode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: theme.colors.successSoft, borderRadius: theme.radius.sm, paddingVertical: 6, paddingHorizontal: 10 }}>
                    <AppText variant="bodySmall" weight="800" style={{ color: theme.colors.success }}>
                      {couponCode}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
                    {priced?.coupon?.name ?? (quoteCouponError ? 'Not applied' : 'Applied')}
                  </AppText>
                </View>
                <PressableScale accessibilityRole="button" accessibilityLabel="Remove coupon" onPress={() => setCouponCode(null)}>
                  <AppText variant="bodySmall" weight="700" color="danger">
                    Remove
                  </AppText>
                </PressableScale>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={couponInput}
                  onChangeText={setCouponInput}
                  placeholder="Enter code"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: theme.colors.text,
                    fontSize: 15,
                  }}
                />
                <Button label="Apply" variant="secondary" onPress={applyCoupon} style={{ paddingVertical: 12, paddingHorizontal: 18 }} />
              </View>
            )}
          </Card>
        </FadeIn>

        {/* Notes */}
        <FadeIn translateY={8} delay={40}>
          <Card>
            <AppText variant="caption" color="textMuted" weight="600" style={{ marginBottom: 8 }}>
              Notes for the kitchen (optional)
            </AppText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={{
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.md,
                paddingHorizontal: 12,
                paddingVertical: 12,
                minHeight: 64,
                textAlignVertical: 'top',
                color: theme.colors.text,
                fontSize: 15,
              }}
            />
          </Card>
        </FadeIn>

        {/* Summary — the real bill, itemised, exactly as the backend built it.
            Same component the checkout sheet uses, so the two cannot disagree. */}
        <FadeIn translateY={8} delay={80}>
          <Card elevated>
            <AppText variant="caption" color="textMuted" weight="600" style={{ marginBottom: 10 }}>
              {mode === ORDER_TYPE.DELIVERY ? 'Delivery total' : 'Pickup total'}
            </AppText>

            {pricing && !quote ? (
              <View style={{ gap: 8 }}>
                <Shimmer height={16} />
                <Shimmer width="70%" height={16} />
                <Shimmer width="50%" height={20} />
              </View>
            ) : quote ? (
              <BillSummary quote={quote} rows={priced?.breakdown} couponLabel={discountLabel} />
            ) : (
              <AppText variant="bodySmall" color="textMuted">
                Estimated {formatSar(estimatedTotalMinor(cart))} for the items. Your delivery fee,
                VAT and total are confirmed at checkout.
              </AppText>
            )}

            {/* A code that did not apply changes what the customer is about to
                pay, so it is stated on the screen where they entered it rather
                than only on the one where they pay. */}
            {quoteCouponError ? (
              <AppText variant="caption" color="danger" style={{ marginTop: 10 }}>
                {couponCode ? `${couponCode}: ` : ''}
                {quoteCouponError} — the total above is without it.
              </AppText>
            ) : null}

            {/* The one number this screen genuinely cannot pin down: with no
                saved address the fee is priced at the base rate, and saying so
                is better than letting it change at checkout without warning. */}
            {mode === ORDER_TYPE.DELIVERY && quote && !defaultAddressId ? (
              <AppText variant="caption" color="textMuted" style={{ marginTop: 10 }}>
                Delivery is shown at the base fee. Add your address at checkout and we will price
                it by distance.
              </AppText>
            ) : null}
          </Card>
        </FadeIn>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
        <PulseButton
          label={`Go to checkout · ${formatSar(payableMinor)}`}
          onPress={() => navigation.navigate('Checkout', { type: mode })}
        />
      </View>
    </Screen>
  );
}
