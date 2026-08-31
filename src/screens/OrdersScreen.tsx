import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { STATUS_META, StatusTone } from '../features/order/order-status.model';
import { useAsync } from '../hooks/useAsync';
import {
  EmptyState,
  ErrorState,
  FadeIn,
  PressableScale,
  Skeleton,
  Stagger,
  StatusBadge,
} from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

function toneColor(theme: ReturnType<typeof useTheme>, tone: StatusTone): string {
  return tone === 'success'
    ? theme.colors.success
    : tone === 'danger'
      ? theme.colors.danger
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'progress'
          ? theme.colors.primary
          : theme.colors.textMuted;
}

function toneBg(theme: ReturnType<typeof useTheme>, tone: StatusTone): string {
  return toneColor(theme, tone) + '1A';
}

export function OrdersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Orders'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const orders = data?.data ?? [];

  return (
    <Screen title="My orders" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={100} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load your orders" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Your orders will show up here once you place one."
          actionLabel="Browse restaurants"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
          <FadeIn translateY={6}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </Text>
          </FadeIn>

          <Stagger step={50}>
            {orders.map((order) => {
              const meta = STATUS_META[order.status];
              return (
                <PressableScale
                  key={order.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
                >
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, letterSpacing: -0.2 }}>
                          {order.orderNumber}
                        </Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 15, marginTop: 6 }}>
                          {formatSar(order.totalMinor)}
                        </Text>
                      </View>
                      <StatusBadge
                        label={meta.label}
                        color={toneBg(theme, meta.tone)}
                        textColor={toneColor(theme, meta.tone)}
                      />
                    </View>

                    {/* Decorative arrow */}
                    <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
                      <Text style={{ color: theme.colors.border, fontSize: 18 }}>›</Text>
                    </View>
                  </Card>
                </PressableScale>
              );
            })}
          </Stagger>
        </ScrollView>
      )}
    </Screen>
  );
}
