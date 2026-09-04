import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';

import type { NotificationItem } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, Screen } from '../components';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** The customer's notification feed (order + payment updates), read from the backend. */
export function NotificationsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Notifications'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.notifications(), []);
  // Re-read every time the screen is opened. The feed is written server-side as
  // an order moves, so the copy fetched when the app launched is stale by the
  // time anyone opens this — and "nothing new here" is exactly the complaint
  // this screen attracts.
  useFocusEffect(useCallback(() => reload(), [reload]));
  const items = data?.data ?? [];

  return (
    <Screen title="Notifications" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load notifications" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : items.length === 0 ? (
        <EmptyState glyph="🔔" title="No notifications" message="Order and payment updates will show up here." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
          {items.map((n: NotificationItem) => {
            const inner = (
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <AppText variant="body" weight="700" style={{ flex: 1 }}>
                    {n.title}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {timeAgo(n.createdAt)}
                  </AppText>
                </View>
                <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 4 }}>
                  {n.body}
                </AppText>
              </Card>
            );
            return n.orderId ? (
              <PressableScale
                key={n.id}
                accessibilityRole="button"
                accessibilityLabel={`${n.title}. Open order.`}
                onPress={() => navigation.navigate('OrderTracking', { orderId: n.orderId as string })}
              >
                {inner}
              </PressableScale>
            ) : (
              <View key={n.id}>{inner}</View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
