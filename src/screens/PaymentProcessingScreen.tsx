import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Screen } from '../components';
import { PaymentStateView } from '../features/payment/PaymentStateView';
import { paymentVisualForServerStatus } from '../features/payment/payment-state.model';
import { Confetti, FadeIn, ProgressRing, SuccessAnimation } from '../motion';
import { PAYMENT_STATUS, PaymentStatus } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const POLL_MS = 2500;

/**
 * Initiates the online charge, then polls the backend for the TRUE payment
 * status. The success view — and the forward navigation — happen only when the
 * SERVER reports PAID. This screen never treats initiating, or any client
 * signal, as proof of payment; it mirrors the backend rule that client-side
 * success is never trusted.
 */
export function PaymentProcessingScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PaymentProcessing'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId, orderNumber, method } = route.params;
  const [status, setStatus] = useState<PaymentStatus>(PAYMENT_STATUS.PENDING);
  const [pollProgress, setPollProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;

    const poll = async (): Promise<void> => {
      try {
        const payment = await api.paymentFor(orderId);
        if (!mounted) {
          return;
        }
        setStatus(payment.status);
        pollCount++;
        setPollProgress(Math.min(pollCount * 0.15, 0.9));
        const settled = paymentVisualForServerStatus(payment.status).settled;
        if (settled) {
          setPollProgress(1);
          if (payment.status === PAYMENT_STATUS.PAID) {
            timer = setTimeout(() => mounted && navigation.replace('OrderSuccess', { orderId, orderNumber, method }), 900);
          }
          return; // stop polling once settled
        }
      } catch {
        // Transient error — keep polling.
      }
      if (mounted) {
        timer = setTimeout(poll, POLL_MS);
      }
    };

    const start = async (): Promise<void> => {
      if (!started.current) {
        started.current = true;
        try {
          await api.initiatePayment(orderId, method);
        } catch {
          // Even if initiate errored, poll — the server remains the truth.
        }
      }
      poll();
    };

    start();
    return () => {
      mounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, attempt]);

  const retry = useCallback((): void => {
    started.current = false;
    setStatus(PAYMENT_STATUS.PENDING);
    setPollProgress(0);
    setAttempt((a) => a + 1); // re-runs the effect: initiate + poll again
  }, []);

  const visual = paymentVisualForServerStatus(status).visual;
  const isPaid = visual === 'success';
  const failed = visual === 'failed' || visual === 'cancelled';

  return (
    <Screen title="Payment">
      <Confetti active={isPaid} />
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        {isPaid ? (
          <FadeIn translateY={10}>
            <View style={{ alignItems: 'center' }}>
              <SuccessAnimation size={120} />
            </View>
          </FadeIn>
        ) : failed ? (
          <PaymentStateView status={status} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <ProgressRing
              progress={pollProgress}
              size={100}
              strokeWidth={8}
              color={theme.colors.primary}
              label="..."
            />
          </View>
        )}
        <AppText variant="caption" color="textMuted" center style={{ marginTop: 8, paddingHorizontal: 16 }}>
          Your bank confirms this with us directly. You can safely track your order while it finishes.
        </AppText>
        <View style={{ marginTop: 28, gap: 10 }}>
          {failed ? (
            <>
              <Button label="Try again" onPress={retry} />
              <Button label="Back to orders" variant="ghost" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Orders' } }] })} />
            </>
          ) : (
            <Button label="Track my order" onPress={() => navigation.replace('OrderTracking', { orderId })} />
          )}
        </View>
      </View>
    </Screen>
  );
}
