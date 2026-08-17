import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, SuccessCheck } from '../components';
import { FadeIn } from '../motion';
import { PAYMENT_METHOD } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** A premium confirmation screen shown once an order is placed (and paid). */
export function OrderSuccessScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber, method } = route.params;
  const isCod = method === PAYMENT_METHOD.CASH_ON_DELIVERY;

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <SuccessCheck size={112} />
        <FadeIn translateY={12} delay={120} style={{ alignItems: 'center', marginTop: 24 }}>
          <AppText variant="h1" center>
            Order confirmed
          </AppText>
          <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, paddingVertical: 6, paddingHorizontal: 14, marginTop: 12 }}>
            <AppText variant="bodySmall" weight="700" color="primary">
              {orderNumber}
            </AppText>
          </View>
          <AppText variant="body" color="textMuted" center style={{ marginTop: 16, maxWidth: 320 }}>
            {isCod
              ? 'Thanks! Your order is confirmed and heading to the kitchen. Pay the driver in cash when it arrives.'
              : 'Thanks! Your payment is confirmed and your food is being prepared. We’ll keep you posted every step of the way.'}
          </AppText>
        </FadeIn>
      </View>

      <FadeIn delay={200} style={{ padding: 16, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20, gap: 10 }}>
        <Button label="Track my order" onPress={() => navigation.replace('OrderTracking', { orderId })} />
        <Button label="Back to home" variant="ghost" onPress={goHome} />
      </FadeIn>
    </View>
  );
}
