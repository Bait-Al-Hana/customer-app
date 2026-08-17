import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { toOrderItems } from '../cart/cart';
import { Card, PrimaryButton, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { BottomSheet, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

const METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHOD.CARD]: 'Card',
  [PAYMENT_METHOD.MADA]: 'mada',
  [PAYMENT_METHOD.APPLE_PAY]: 'Apple Pay',
  [PAYMENT_METHOD.CASH_ON_DELIVERY]: 'Cash on delivery',
};

/** Review the server quote, choose a payment method, place the order. */
export function CheckoutScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Checkout'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { cart, dispatch } = useCart();
  const { type } = route.params;

  const items = toOrderItems(cart);
  const branchId = cart.branchId ?? '';
  const { data: quote, loading, error, reload } = useAsync(
    () => api.quote({ branchId, type, items }),
    [branchId, JSON.stringify(items), type],
  );

  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CARD);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const placeOrder = async (): Promise<void> => {
    if (!branchId) {
      return;
    }
    setBusy(true);
    setPlaceError(null);
    try {
      const order = await api.placeOrder({ branchId, type, paymentMethod: method, items });
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

  const row = (label: string, value: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: bold ? theme.colors.text : theme.colors.textMuted, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );

  return (
    <Screen title="Checkout" onBack={() => navigation.goBack()}>
      <Toast visible={!!placeError} message={placeError ?? ''} tone="danger" onHide={() => setPlaceError(null)} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 12 }}>Order total</Text>
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
              {row('Subtotal', formatSar(quote.subtotalMinor))}
              {quote.discountMinor > 0 ? row('Discount', `- ${formatSar(quote.discountMinor)}`) : null}
              {quote.deliveryFeeMinor > 0 ? row('Delivery', formatSar(quote.deliveryFeeMinor)) : null}
              {row('VAT (incl.)', formatSar(quote.vatMinor))}
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 6 }} />
              {row('Total', formatSar(quote.totalMinor), true)}
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Payment method</Text>
          <PressableScale accessibilityRole="button" onPress={() => setSheetOpen(true)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{METHOD_LABELS[method]}</Text>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Change</Text>
          </PressableScale>
        </Card>

        <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 12 }}>
          Pickup order. Payment is confirmed by our server — never by this screen alone.
        </Text>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <PrimaryButton
          label={quote ? `Place order · ${formatSar(quote.totalMinor)}` : 'Place order'}
          onPress={placeOrder}
          busy={busy}
          disabled={!quote || !!error}
        />
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Payment method</Text>
        {[PAYMENT_METHOD.CARD, PAYMENT_METHOD.MADA, PAYMENT_METHOD.APPLE_PAY, PAYMENT_METHOD.CASH_ON_DELIVERY].map((m) => (
          <PressableScale
            key={m}
            accessibilityRole="button"
            onPress={() => {
              setMethod(m);
              setSheetOpen(false);
            }}
            style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>{METHOD_LABELS[m]}</Text>
            {method === m ? <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>✓</Text> : null}
          </PressableScale>
        ))}
      </BottomSheet>
    </Screen>
  );
}
