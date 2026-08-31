import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, Screen } from '../components/ui';
import { PaymentStateView } from '../features/payment/PaymentStateView';
import { paymentVisualForServerStatus } from '../features/payment/payment-state.model';
import {
  AnimatedGradient,
  Confetti,
  FadeIn,
  GlassCard,
  ProgressRing,
  Stagger,
  SuccessAnimation,
} from '../motion';
import { PAYMENT_METHOD, PAYMENT_STATUS, PaymentStatus } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const POLL_MS = 2500;

export function PaymentProcessingScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PaymentProcessing'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const [status, setStatus] = useState<PaymentStatus>(PAYMENT_STATUS.PENDING);
  const [pollProgress, setPollProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;

    const poll = async (): Promise<void> => {
      try {
        const payment = await api.paymentFor(orderId);
        if (!mounted) return;
        setStatus(payment.status);
        pollCount++;
        setPollProgress(Math.min(pollCount * 0.15, 0.9));
        const settled = paymentVisualForServerStatus(payment.status).settled;
        if (settled) {
          setPollProgress(1);
          if (payment.status === PAYMENT_STATUS.PAID) {
            timer = setTimeout(() => mounted && navigation.replace('OrderTracking', { orderId }), 1800);
          }
          return;
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
          await api.initiatePayment(orderId, PAYMENT_METHOD.CARD);
        } catch {
          // Even if initiate errored, poll — the server remains the truth.
        }
      }
      poll();
    };

    start();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const visual = paymentVisualForServerStatus(status).visual;
  const isPaid = visual === 'success';
  const isFailed = visual === 'failed' || visual === 'cancelled';

  return (
    <Screen title="Payment">
      <AnimatedGradient style={{ flex: 1 }}>
        <Confetti active={isPaid} />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
          <Stagger>
            <View style={{ alignItems: 'center' }}>
              {isPaid ? (
                <FadeIn translateY={10}>
                  <SuccessAnimation size={120} />
                </FadeIn>
              ) : isFailed ? (
                <PaymentStateView status={status} />
              ) : (
                <ProgressRing
                  progress={pollProgress}
                  size={100}
                  strokeWidth={8}
                  color={theme.colors.primary}
                  label="..."
                />
              )}
            </View>

            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <GlassCard intensity="light" delay={100}>
                <Text
                  style={{
                    color: isPaid ? theme.colors.success : isFailed ? theme.colors.danger : theme.colors.text,
                    fontSize: 22,
                    fontWeight: '800',
                    textAlign: 'center',
                    letterSpacing: -0.3,
                  }}
                >
                  {isPaid ? 'Payment successful!' : isFailed ? 'Payment failed' : 'Processing payment...'}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 8,
                    lineHeight: 20,
                    maxWidth: 280,
                  }}
                >
                  {isPaid
                    ? 'Your order is confirmed. Taking you to order tracking...'
                    : isFailed
                      ? 'Something went wrong with the payment. Please try again.'
                      : 'Your bank confirms this with us directly. You can safely track your order while it finishes.'}
                </Text>
              </GlassCard>
            </View>

            <View style={{ width: '100%', marginTop: 32, gap: 12 }}>
              <PrimaryButton label="Track my order" onPress={() => navigation.replace('OrderTracking', { orderId })} />
              {isFailed ? (
                <PrimaryButton label="Back to orders" onPress={() => navigation.replace('Orders')} variant="outline" />
              ) : null}
            </View>
          </Stagger>
        </View>
      </AnimatedGradient>
    </Screen>
  );
}
