import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useCart } from '../cart/CartProvider';
import { estimatedTotalMinor } from '../cart/cart';
import { Card, InfoRow, PrimaryButton, Screen } from '../components/ui';
import {
  AnimatedNumber,
  EmptyState,
  FadeIn,
  PressableScale,
  QuantityStepper,
  SlideIn,
  Stagger,
} from '../motion';
import { ORDER_TYPE } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

export function CartScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Cart'>): React.JSX.Element {
  const theme = useTheme();
  const { cart, count, dispatch } = useCart();

  if (count === 0) {
    return (
      <Screen title="Cart" onBack={() => navigation.goBack()}>
        <EmptyState
          title="Your cart is empty"
          message="Add something from the menu to get started."
          actionLabel="Browse menu"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const total = estimatedTotalMinor(cart);

  return (
    <Screen title="Cart" onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180, gap: 12 }}>
        <FadeIn translateY={6}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
            {count} item{count === 1 ? '' : 's'} in your cart
          </Text>
        </FadeIn>

        <Stagger step={60}>
          {cart.lines.map((line) => (
            <Card key={line.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Product thumbnail placeholder */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🍽️</Text>
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                    {line.productName}
                  </Text>
                  <AnimatedNumber
                    value={formatSar(line.unitPriceMinor * line.quantity)}
                    style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4, fontSize: 15 }}
                  />
                </View>

                <QuantityStepper
                  value={line.quantity}
                  onChange={(q) => dispatch({ type: 'SET_QTY', key: line.key, quantity: q })}
                  min={0}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.productName}`}
                  onPress={() => dispatch({ type: 'REMOVE', key: line.key })}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.danger + '14',
                  }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 13 }}>Remove</Text>
                </PressableScale>
              </View>
            </Card>
          ))}
        </Stagger>
      </ScrollView>

      {/* Bottom CTA bar */}
      <SlideIn direction="up" distance={20}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingBottom: 28,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          }}
        >
          <InfoRow label="Estimated subtotal" value={formatSar(total)} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 14 }}>
            Final total, VAT and delivery confirmed at checkout.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Checkout"
                onPress={() => navigation.navigate('Checkout', { type: ORDER_TYPE.PICKUP })}
              />
            </View>
          </View>
        </View>
      </SlideIn>
    </Screen>
  );
}
