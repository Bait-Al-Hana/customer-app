import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { toOrderItems } from '../cart/cart';
import { Card, Divider, InfoRow, PrimaryButton, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import {
  AnimatedTabBar,
  BottomSheet,
  ErrorState,
  FadeIn,
  PressableScale,
  Skeleton,
  SlideIn,
  Stagger,
  Toast,
} from '../motion';
import { ORDER_TYPE, OrderType, PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

const METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHOD.CARD]: '💳  Card',
  [PAYMENT_METHOD.MADA]: '🏦  mada',
  [PAYMENT_METHOD.APPLE_PAY]: '  Apple Pay',
  [PAYMENT_METHOD.CASH_ON_DELIVERY]: '💵  Cash on delivery',
};


export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, dispatch } = useCart();

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const [type, setType] = useState<OrderType>(route.params.type);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

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

  const isDelivery = type === ORDER_TYPE.DELIVERY;
  const needsAddress = isDelivery && !addressId;

  const placeOrder = async (): Promise<void> => {
    if (!branchId || needsAddress) return;
    setBusy(true);
    setPlaceError(null);
    try {
      const order = await api.placeOrder({
        branchId,
        type,
        paymentMethod: method,
        items,
        customerAddressId: isDelivery ? addressId ?? undefined : undefined,
      });
      dispatch({ type: 'CLEAR' });
      if (method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
        navigation.replace('OrderTracking', { orderId: order.id });
      } else {
        navigation.replace('PaymentProcessing', { orderId: order.id });
      }
    } catch (e) {
      setPlaceError(e instanceof ApiError ? e.message : 'Could not place the order. Try again.');
      setBusy(false);
    }
  };

  const tabOptions = [
    { value: ORDER_TYPE.PICKUP as OrderType, label: '🏪  Pickup' },
    { value: ORDER_TYPE.DELIVERY as OrderType, label: '🚗  Delivery' },
  ];

  return (
    <Screen title="Checkout" onBack={() => navigation.goBack()}>
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 14 }}>
        {/* Pickup / Delivery toggle */}
        <FadeIn translateY={8}>
          <AnimatedTabBar
            options={tabOptions}
            value={type}
            onChange={setType}
          />
        </FadeIn>

        {/* Delivery address */}
        {isDelivery ? (
          <FadeIn translateY={8} delay={60}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16 }}>📍</Text>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginLeft: 8 }}>
                  Deliver to
                </Text>
              </View>
              {addresses.loading ? (
                <View style={{ gap: 8 }}>
                  <Skeleton height={48} radius={theme.radius.md} />
                  <Skeleton height={48} radius={theme.radius.md} />
                </View>
              ) : addresses.data && addresses.data.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {addresses.data.map((a) => {
                    const active = a.id === addressId;
                    return (
                      <PressableScale
                        key={a.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setAddressId(a.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          gap: 12,
                          borderRadius: theme.radius.md,
                          backgroundColor: active ? theme.colors.primary + '0D' : 'transparent',
                          borderWidth: 1.5,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: active ? theme.colors.primary : theme.colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {active ? (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary }} />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{a.label ?? 'Address'}</Text>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }} numberOfLines={1}>
                            {[a.line1, a.city].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>No saved address yet.</Text>
              )}
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate('AddAddress')}
                style={{
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: theme.radius.md,
                  borderWidth: 1.5,
                  borderColor: theme.colors.accent + '40',
                  borderStyle: 'dashed',
                }}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>+ Add a new address</Text>
              </PressableScale>
            </Card>
          </FadeIn>
        ) : null}

        {/* Order total */}
        <FadeIn translateY={8} delay={120}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16 }}>🧾</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Order total</Text>
            </View>
            {loading ? (
              <View style={{ gap: 10 }}>
                <Skeleton height={16} />
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={20} />
              </View>
            ) : error ? (
              <ErrorState title="Couldn't price your order" message={error.message} actionLabel="Retry" onAction={reload} />
            ) : quote ? (
              <View>
                <InfoRow label="Subtotal" value={formatSar(quote.subtotalMinor)} />
                {quote.discountMinor > 0 ? <InfoRow label="Discount" value={`- ${formatSar(quote.discountMinor)}`} /> : null}
                {quote.deliveryFeeMinor > 0 ? <InfoRow label="Delivery" value={formatSar(quote.deliveryFeeMinor)} /> : null}
                <InfoRow label="VAT (incl.)" value={formatSar(quote.vatMinor)} />
                <Divider spacing={8} />
                <InfoRow label="Total" value={formatSar(quote.totalMinor)} bold />
              </View>
            ) : null}
          </Card>
        </FadeIn>

        {/* Payment method */}
        <FadeIn translateY={8} delay={180}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16 }}>💳</Text>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginLeft: 8 }}>Payment method</Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              onPress={() => setSheetOpen(true)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{METHOD_LABELS[method]}</Text>
              <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 13 }}>Change</Text>
            </PressableScale>
          </Card>
        </FadeIn>

        <FadeIn translateY={6} delay={240}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 12, lineHeight: 18 }}>
            Payment is confirmed by our server — never by this screen alone.
          </Text>
        </FadeIn>
      </ScrollView>

      {/* Bottom CTA */}
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
          <PrimaryButton
            label={needsAddress ? 'Add a delivery address' : quote ? `Place order · ${formatSar(quote.totalMinor)}` : 'Place order'}
            onPress={needsAddress ? () => navigation.navigate('AddAddress') : placeOrder}
            busy={busy}
            disabled={!quote || !!error}
          />
        </View>
      </SlideIn>

      {/* Payment method bottom sheet */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 16 }}>Payment method</Text>
        <Stagger step={40}>
          {[PAYMENT_METHOD.CARD, PAYMENT_METHOD.MADA, PAYMENT_METHOD.APPLE_PAY, PAYMENT_METHOD.CASH_ON_DELIVERY].map((m) => {
            const selected = method === m;
            return (
              <PressableScale
                key={m}
                accessibilityRole="button"
                onPress={() => { setMethod(m); setSheetOpen(false); }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  borderRadius: theme.radius.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: selected ? theme.colors.primary + '0D' : 'transparent',
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                  {METHOD_LABELS[m]}
                </Text>
                {selected ? (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 14 }}>✓</Text>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </Stagger>
      </BottomSheet>
    </Screen>
  );
}
