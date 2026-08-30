import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { toOrderItems } from '../cart/cart';
import { useConfig } from '../config';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../i18n';
import { BottomSheet, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { ORDER_TYPE, OrderType, PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, dispatch } = useCart();
  const { t } = useI18n();
  const config = useConfig();

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const [type, setType] = useState<OrderType>(route.params.type);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const { data: quote, loading, error, reload } = useAsync(
    () => api.quote({ branchId, type, items, couponCode: appliedCoupon ?? undefined }),
    [branchId, JSON.stringify(items), type, appliedCoupon],
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

  const applyCoupon = (): void => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setAppliedCoupon(couponCode.trim());
  };

  const removeCoupon = (): void => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

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
        couponCode: appliedCoupon ?? undefined,
      });
      dispatch({ type: 'CLEAR' });
      if (method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
        navigation.replace('OrderTracking', { orderId: order.id });
      } else {
        navigation.replace('PaymentProcessing', { orderId: order.id });
      }
    } catch (e) {
      setPlaceError(e instanceof ApiError ? e.message : t('placeError'));
      setBusy(false);
    }
  };

  const methodLabels: Record<string, string> = {
    [PAYMENT_METHOD.CARD]: t('methodCard'),
    [PAYMENT_METHOD.MADA]: t('methodMada'),
    [PAYMENT_METHOD.APPLE_PAY]: t('methodApplePay'),
    [PAYMENT_METHOD.CASH_ON_DELIVERY]: t('methodCod'),
  };

  const row = (label: string, value: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: bold ? theme.colors.text : theme.colors.textMuted, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );

  const typeTab = (tp: OrderType, label: string) => {
    const active = type === tp;
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => setType(tp)}
        style={{
          flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center',
          backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
        }}
      >
        <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.text, fontWeight: '700' }}>{label}</Text>
      </PressableScale>
    );
  };

  return (
    <Screen title={t('checkoutTitle')} onBack={() => navigation.goBack()}>
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />
      <Toast visible={!!couponError} message={couponError ?? ''} tone="danger" onHide={() => setCouponError(null)} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {typeTab(ORDER_TYPE.PICKUP, t('pickup'))}
          {typeTab(ORDER_TYPE.DELIVERY, t('deliveryType'))}
        </View>

        {isDelivery ? (
          <Card>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              {t('deliverTo')}
            </Text>
            {addresses.loading ? (
              <Skeleton height={40} />
            ) : addresses.data && addresses.data.length > 0 ? (
              addresses.data.map((a) => {
                const active = a.id === addressId;
                return (
                  <PressableScale
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setAddressId(a.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}
                  >
                    <View
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        borderWidth: 2,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{a.label ?? 'Address'}</Text>
                      <Text style={{ color: theme.colors.textMuted }} numberOfLines={1}>
                        {[a.line1, a.city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })
            ) : (
              <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>{t('noAddress')}</Text>
            )}
            <PressableScale accessibilityRole="button" onPress={() => navigation.navigate('AddAddress')} style={{ marginTop: 6 }}>
              <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>{t('addAddress')}</Text>
            </PressableScale>
          </Card>
        ) : null}

        {config.couponsEnabled ? (
          <Card>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              {t('couponCode')}
            </Text>
            {appliedCoupon ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: theme.colors.success, fontWeight: '700' }}>{appliedCoupon}</Text>
                  <Text style={{ color: theme.colors.success, fontSize: 12 }}>{t('couponApplied')}</Text>
                </View>
                <PressableScale accessibilityRole="button" onPress={removeCoupon}>
                  <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>{t('removeCoupon')}</Text>
                </PressableScale>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={couponCode}
                  onChangeText={setCouponCode}
                  placeholder={t('couponPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="characters"
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: theme.colors.text,
                  }}
                />
                <PressableScale
                  accessibilityRole="button"
                  onPress={applyCoupon}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>{t('applyCoupon')}</Text>
                </PressableScale>
              </View>
            )}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 12 }}>{t('orderTotal')}</Text>
          {loading ? (
            <View style={{ gap: 8 }}>
              <Skeleton height={16} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={20} />
            </View>
          ) : error ? (
            <ErrorState title={t('priceError')} message={error.message} actionLabel={t('retry')} onAction={reload} />
          ) : quote ? (
            <>
              {row(t('subtotal'), formatSar(quote.subtotalMinor))}
              {quote.discountMinor > 0 ? row(t('discount'), `- ${formatSar(quote.discountMinor)}`) : null}
              {quote.deliveryFeeMinor > 0 ? row(t('deliveryFee'), formatSar(quote.deliveryFeeMinor)) : null}
              {config.showChargesBreakdown && quote.serviceFeeMinor ? row(t('serviceFee'), formatSar(quote.serviceFeeMinor)) : null}
              {config.showChargesBreakdown && quote.packagingFeeMinor ? row(t('packagingFee'), formatSar(quote.packagingFeeMinor)) : null}
              {config.showChargesBreakdown && quote.platformFeeMinor ? row(t('platformFee'), formatSar(quote.platformFeeMinor)) : null}
              {config.showChargesBreakdown && quote.charges?.map((c) => (
                <View key={c.name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.textMuted }}>{c.name}</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{formatSar(c.amountMinor)}</Text>
                </View>
              ))}
              {row(t('vatIncl'), formatSar(quote.vatMinor))}
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 6 }} />
              {row(t('total'), formatSar(quote.totalMinor), true)}
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{t('paymentMethod')}</Text>
          <PressableScale accessibilityRole="button" onPress={() => setSheetOpen(true)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{methodLabels[method]}</Text>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{t('change')}</Text>
          </PressableScale>
        </Card>

        <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 12 }}>
          {t('paymentNote')}
        </Text>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <PrimaryButton
          label={needsAddress ? t('addDeliveryAddress') : quote ? `${t('placeOrder')} · ${formatSar(quote.totalMinor)}` : t('placeOrder')}
          onPress={needsAddress ? () => navigation.navigate('AddAddress') : placeOrder}
          busy={busy}
          disabled={!quote || !!error}
        />
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{t('paymentMethod')}</Text>
        {[PAYMENT_METHOD.CARD, PAYMENT_METHOD.MADA, PAYMENT_METHOD.APPLE_PAY, PAYMENT_METHOD.CASH_ON_DELIVERY].map((m) => (
          <PressableScale
            key={m}
            accessibilityRole="button"
            onPress={() => { setMethod(m); setSheetOpen(false); }}
            style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>{methodLabels[m]}</Text>
            {method === m ? <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>✓</Text> : null}
          </PressableScale>
        ))}
      </BottomSheet>
    </Screen>
  );
}
