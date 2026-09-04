import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useCart } from '../cart/CartProvider';
import { estimatedTotalMinor } from '../cart/cart';
import { AppText, Button, Card, Divider, PriceRow, Screen } from '../components';
import { FoodImage, glyphFor } from '../components/FoodImage';
import { EmptyState, FadeIn, MotiCard, PressableScale, PulseButton, QuantityStepper, Stagger, SwipeAction, Toast } from '../motion';
import { useFulfilment } from '../fulfilment/FulfilmentProvider';
import { RootStackParamList } from '../navigation/types';
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
  const [couponInput, setCouponInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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
    setToast(`Coupon ${code} added — applied at checkout`);
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
                  <AppText variant="caption" color="textMuted">
                    Applied at checkout
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

        {/* Summary */}
        <FadeIn translateY={8} delay={80}>
          <Card elevated>
            <PriceRow label="Estimated subtotal" value={formatSar(estimatedTotalMinor(cart))} />
            <PriceRow label="Delivery fee" value="Calculated at checkout" />
            <PriceRow label="VAT (15%, incl.)" value="Calculated at checkout" />
            <Divider style={{ marginVertical: 8 }} />
            <AppText variant="caption" color="textMuted">
              Your final total, VAT and any delivery fee are confirmed by our server at checkout — this screen shows an estimate only.
            </AppText>
          </Card>
        </FadeIn>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
        <PulseButton label={`Go to checkout · ${formatSar(estimatedTotalMinor(cart))}`} onPress={() => navigation.navigate('Checkout', { type: mode })} />
      </View>
    </Screen>
  );
}
